// ── Load .env FIRST before any other imports ─────────────────────────────────
// This must be at the very top — before importing storage.ts which reads process.env
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Now import everything else
import * as express from "express";
import type { Request, Response, NextFunction } from "express";
import * as fs from "fs";
import { connectDB } from "./storage";
import apiRouter from "./routes";

const app = (express as any)();

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = new Set<string>();

  if (process.env.REPLIT_DEV_DOMAIN)
    allowedOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  if (process.env.REPLIT_DOMAINS)
    process.env.REPLIT_DOMAINS.split(",").forEach((d) =>
      allowedOrigins.add(`https://${d.trim()}`),
    );

  const origin = req.headers["origin"] ?? "";
  const isLocalNetwork =
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
    /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(origin) ||
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin);

  if (origin && (allowedOrigins.has(origin) || isLocalNetwork)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS",
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// ─── BODY PARSING ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));

// ─── REQUEST LOGGING ──────────────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/api")) return next();
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const icon =
      res.statusCode >= 500 ? "❌" : res.statusCode >= 400 ? "⚠️ " : "✅";
    console.log(
      `${icon} ${req.method} ${req.path} ${res.statusCode} — ${ms}ms`,
    );
  });
  next();
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────

app.use("/api", apiRouter);

// ─── STATIC / EXPO ────────────────────────────────────────────────────────────

function configureStaticAndExpo() {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  let template = "<html><body><h1>FoodScan API is running</h1></body></html>";
  try {
    template = fs.readFileSync(templatePath, "utf-8");
  } catch {}

  let appName = "FoodScan";
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "app.json"), "utf-8"),
    );
    appName = appJson.expo?.name || "FoodScan";
  } catch {}

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();
    if (req.path !== "/" && req.path !== "/manifest") return next();

    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      const manifestPath = path.resolve(
        process.cwd(),
        "static-build",
        platform as string,
        "manifest.json",
      );
      if (!fs.existsSync(manifestPath))
        return res.status(404).json({ error: `Manifest not found` });
      res.setHeader("expo-protocol-version", "1");
      res.setHeader("expo-sfv-version", "0");
      res.setHeader("content-type", "application/json");
      return res.send(fs.readFileSync(manifestPath, "utf-8"));
    }

    if (req.path === "/") {
      const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host =
        req.headers["x-forwarded-host"] ||
        req.headers["host"] ||
        `localhost:${process.env.PORT || 3001}`;
      const html = template
        .replace(/BASE_URL_PLACEHOLDER/g, `${proto}://${host}`)
        .replace(/EXPS_URL_PLACEHOLDER/g, host as string)
        .replace(/APP_NAME_PLACEHOLDER/g, appName);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }
    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
}

configureStaticAndExpo();

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  console.error("Unhandled error:", err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

// ─── STARTUP ──────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3001", 10);

(async () => {
  console.log("\n🚀 Starting FoodScan server...");
  console.log("   NODE_ENV:", process.env.NODE_ENV || "development");
  console.log("   PORT:", PORT);
  console.log(
    "   MONGODB_URI:",
    process.env.MONGODB_URI ? "✅ set" : "❌ NOT SET",
  );
  console.log(
    "   JWT_SECRET:",
    process.env.JWT_SECRET ? "✅ set" : "⚠️  not set (using fallback)",
  );
  console.log("   DB_NAME:", process.env.MONGODB_DB_NAME || "foodscan");

  if (!process.env.MONGODB_URI) {
    console.error("\n❌ FATAL: MONGODB_URI is not set.");
    console.error("   Create a .env file in your project root with:");
    console.error(
      "   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority",
    );
    process.exit(1);
  }

  try {
    console.log("\n⏳ Connecting to MongoDB...");
    await connectDB();
    // connectDB() already logs ✅ MongoDB connected

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n✅ Server ready on port ${PORT}`);
      console.log(`   Local:  http://localhost:${PORT}/api/health`);
      console.log(
        `   For Android device: http://YOUR_LAN_IP:${PORT}/api/health\n`,
      );
    });
  } catch (err: any) {
    console.error("\n❌ FATAL: Could not connect to MongoDB:", err.message);
    console.error("\n   Fix checklist:");
    console.error("   1. Is MONGODB_URI correct in .env?");
    console.error("   2. Go to MongoDB Atlas → Network Access → Add 0.0.0.0/0");
    console.error("   3. Check your Atlas username/password");
    process.exit(1);
  }
})();
