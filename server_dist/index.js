// server/index.ts
import * as dotenv from "dotenv";
import * as path from "path";
import express from "express";
import * as fs from "fs";

// server/storage.ts
import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";
var MONGODB_URI = process.env.MONGODB_URI;
var DB_NAME = process.env.MONGODB_DB_NAME || "foodscan";
var _client = null;
var _db = null;
var _initPromise = null;
async function connectDB() {
  if (_db) return _db;
  if (_initPromise) return _initPromise;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }
  _initPromise = (async () => {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 1e4,
      connectTimeoutMS: 15e3,
      socketTimeoutMS: 45e3,
      retryWrites: true,
      retryReads: true
    });
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    const db = client.db(DB_NAME);
    _client = client;
    _db = db;
    client.on("close", () => {
      console.warn(
        "\u26A0\uFE0F  MongoDB connection closed \u2014 will reconnect on next call"
      );
      _db = null;
      _client = null;
      _initPromise = null;
    });
    console.log(`\u2705 MongoDB connected \u2192 "${DB_NAME}"`);
    await createIndexes(db);
    return db;
  })();
  try {
    return await _initPromise;
  } catch (err) {
    _initPromise = null;
    throw err;
  }
}
async function getCol(name) {
  const db = await connectDB();
  return db.collection(name);
}
async function createIndexes(db) {
  try {
    await db.collection("users").createIndexes([
      { key: { userId: 1 }, unique: true, name: "idx_users_userId" },
      { key: { email: 1 }, unique: true, name: "idx_users_email" }
    ]);
    await db.collection("scan_history").createIndexes([
      {
        key: { userId: 1, barcode: 1 },
        unique: true,
        name: "idx_scan_user_barcode"
      },
      { key: { userId: 1, scanned_at: -1 }, name: "idx_scan_user_date" }
    ]);
    await db.collection("product_lists").createIndexes([
      {
        key: { userId: 1, listId: 1 },
        unique: true,
        name: "idx_lists_user_listid"
      }
    ]);
    await db.collection("profiles").createIndexes([
      { key: { userId: 1 }, unique: true, name: "idx_profiles_userId" }
    ]);
    await db.collection("favorites").createIndexes([
      { key: { userId: 1 }, unique: true, name: "idx_favorites_userId" }
    ]);
    console.log("\u2705 MongoDB indexes verified");
  } catch (err) {
    if (err?.code === 85 || err?.code === 86) {
      console.log("\u2139\uFE0F  Indexes already exist");
    } else {
      console.warn("\u26A0\uFE0F  Index warning:", err?.message);
    }
  }
}
async function findUserByEmail(email) {
  const col = await getCol("users");
  return await col.findOne({ email: email.toLowerCase().trim() }) ?? null;
}
async function createUser(data) {
  const col = await getCol("users");
  const user = {
    userId: randomUUID(),
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    username: data.username?.trim(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await col.insertOne(user);
  console.log(`\u2705 New user created: ${user.email} (${user.userId})`);
  return user;
}
function toPublicUser(doc) {
  return { userId: doc.userId, email: doc.email, username: doc.username };
}
async function getScanHistory(userId) {
  if (!userId) return [];
  const col = await getCol("scan_history");
  const docs = await col.find({ userId }).sort({ scanned_at: -1 }).limit(200).toArray();
  return docs.map((d) => d.product);
}
async function addScanHistory(userId, product) {
  if (!userId) throw new Error("userId required");
  if (!product?.barcode) throw new Error("product.barcode required");
  const col = await getCol("scan_history");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await col.updateOne(
    { userId, barcode: String(product.barcode) },
    {
      $set: {
        userId,
        barcode: String(product.barcode),
        product: { ...product, scanned_at: now },
        scanned_at: now
      }
    },
    { upsert: true }
  );
  const count = await col.countDocuments({ userId });
  if (count > 200) {
    const overflow = await col.find({ userId }).sort({ scanned_at: 1 }).limit(count - 200).project({ _id: 1 }).toArray();
    const ids = overflow.map((d) => d._id);
    if (ids.length > 0)
      await col.deleteMany({ _id: { $in: ids }, userId });
  }
}
async function deleteScanHistoryItems(userId, productIds) {
  if (!userId) throw new Error("userId required");
  const col = await getCol("scan_history");
  await col.deleteMany({ userId, "product.id": { $in: productIds } });
}
async function clearAllScanHistory(userId) {
  if (!userId) throw new Error("userId required");
  const col = await getCol("scan_history");
  await col.deleteMany({ userId });
}
async function getFavorites(userId) {
  if (!userId) return [];
  const col = await getCol("favorites");
  const doc = await col.findOne({ userId });
  return doc?.barcodes ?? [];
}
async function toggleFavorite(userId, barcode) {
  if (!userId) throw new Error("userId required");
  if (!barcode) throw new Error("barcode required");
  const col = await getCol("favorites");
  const doc = await col.findOne({ userId });
  const current = doc?.barcodes ?? [];
  const isFav = current.includes(barcode);
  const updated = isFav ? current.filter((b) => b !== barcode) : [...current, barcode];
  await col.updateOne(
    { userId },
    {
      $set: { userId, barcodes: updated, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }
    },
    { upsert: true }
  );
  return !isFav;
}
async function removeFavorite(userId, barcode) {
  if (!userId) throw new Error("userId required");
  const col = await getCol("favorites");
  await col.updateOne({ userId }, {
    $pull: { barcodes: barcode },
    $set: { updatedAt: (/* @__PURE__ */ new Date()).toISOString() }
  });
}
async function getProfile(userId) {
  if (!userId) return null;
  const col = await getCol("profiles");
  const doc = await col.findOne({ userId });
  return doc?.profile ?? null;
}
async function saveProfile(userId, profile) {
  if (!userId) throw new Error("userId required");
  const col = await getCol("profiles");
  await col.updateOne(
    { userId },
    { $set: { userId, profile, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
    { upsert: true }
  );
}
async function getLists(userId) {
  if (!userId) return [];
  const col = await getCol("product_lists");
  const docs = await col.find({ userId }).sort({ created_at: -1 }).toArray();
  return docs.map((d) => d.list);
}
async function saveLists(userId, lists) {
  if (!userId) throw new Error("userId required");
  const col = await getCol("product_lists");
  if (lists.length === 0) {
    await col.deleteMany({ userId });
    return;
  }
  const incomingListIds = lists.map((l) => l.id).filter(Boolean);
  await col.deleteMany({ userId, listId: { $nin: incomingListIds } });
  const ops = lists.map((list) => ({
    updateOne: {
      filter: { userId, listId: list.id },
      update: {
        $set: {
          userId,
          listId: list.id,
          list,
          created_at: list.created_at || (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      upsert: true
    }
  }));
  await col.bulkWrite(ops);
}

// server/routes.ts
import { Router } from "express";
import * as jwt2 from "jsonwebtoken";
import * as bcrypt from "bcryptjs";

// server/middleware/auth.ts
import * as jwt from "jsonwebtoken";
var JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("\u274C JWT_SECRET must be set in production environment");
    }
    console.warn(
      "\u26A0\uFE0F  JWT_SECRET not set \u2014 using dev fallback. Set it in .env for production."
    );
    return "dev-only-fallback-secret-change-before-deploying";
  }
  return secret;
})();
var JWT_EXPIRES_IN = "30d";
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authorization header missing or malformed. Expected: Bearer <token>"
    });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Token is empty" });
    return;
  }
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      res.status(401).json({ error: "Token has expired. Please log in again." });
    } else if (err?.name === "JsonWebTokenError") {
      res.status(401).json({ error: "Invalid token." });
    } else {
      res.status(401).json({ error: "Token verification failed." });
    }
    return;
  }
  if (!payload.userId || !payload.email) {
    res.status(401).json({ error: "Token payload is invalid." });
    return;
  }
  req.userId = payload.userId;
  req.userEmail = payload.email;
  next();
}

// server/routes.ts
var router = Router();
var createErrorResponse = (status, message, details) => ({
  error: message,
  status,
  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
  ...details && { details }
});
router.use((req, res, next) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});
router.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, username } = req.body ?? {};
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "email is required" });
    }
    if (!password || typeof password !== "string" || !password.trim()) {
      return res.status(400).json({ error: "password is required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "password must be at least 8 characters" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "invalid email format" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      const passwordValid = await bcrypt.compare(
        password,
        existingUser.passwordHash
      );
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = jwt2.sign(
        { userId: existingUser.userId, email: existingUser.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      console.log(`\u2705 Login: ${existingUser.email} (${existingUser.userId})`);
      return res.status(200).json({
        token,
        user: toPublicUser(existingUser),
        isNewUser: false
      });
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      const newUser = await createUser({
        email: normalizedEmail,
        passwordHash,
        username: username?.trim() || void 0
      });
      const token = jwt2.sign(
        { userId: newUser.userId, email: newUser.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      console.log(`\u2705 Registered: ${newUser.email} (${newUser.userId})`);
      return res.status(201).json({
        token,
        user: toPublicUser(newUser),
        isNewUser: true
      });
    }
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
});
router.get("/auth/verify", requireAuth, (req, res) => {
  const { userId, userEmail } = req;
  return res.status(200).json({ valid: true, userId, email: userEmail });
});
router.get("/sync", requireAuth, async (req, res) => {
  const { userId } = req;
  try {
    const [history, lists, profile, favorites] = await Promise.all([
      getScanHistory(userId),
      getLists(userId),
      getProfile(userId),
      getFavorites(userId)
    ]);
    console.log(
      `\u{1F4E6} Sync \u2192 ${userId}: ${history.length} scans, ${lists.length} lists, ${favorites.length} favorites`
    );
    return res.status(200).json({ history, lists, profile, favorites });
  } catch (err) {
    console.error(`Sync error for ${userId}:`, err);
    return res.status(500).json({ error: "Sync failed" });
  }
});
router.get(
  "/scan-history",
  requireAuth,
  async (req, res) => {
    const { userId } = req;
    try {
      const history = await getScanHistory(userId);
      return res.status(200).json({ history });
    } catch (err) {
      console.error(`Get scan-history error for ${userId}:`, err);
      return res.status(500).json({ error: "Failed to fetch scan history" });
    }
  }
);
router.post(
  "/scan-history",
  requireAuth,
  async (req, res) => {
    const { userId } = req;
    try {
      const { product } = req.body ?? {};
      if (!product || typeof product !== "object") {
        return res.status(400).json({ error: "product object is required" });
      }
      if (!product.barcode) {
        return res.status(400).json({ error: "product.barcode is required" });
      }
      await addScanHistory(userId, product);
      return res.status(201).json({ success: true });
    } catch (err) {
      console.error(`Add scan-history error for ${userId}:`, err);
      return res.status(500).json({ error: "Failed to save scan" });
    }
  }
);
router.delete(
  "/scan-history/:id",
  requireAuth,
  async (req, res) => {
    const { userId } = req;
    const productId = req.params.id;
    try {
      if (!productId || typeof productId !== "string") {
        return res.status(400).json(
          createErrorResponse(
            400,
            "product id param is required and must be a string"
          )
        );
      }
      const sanitizedProductId = productId.trim();
      if (!sanitizedProductId) {
        return res.status(400).json(createErrorResponse(400, "product id cannot be empty"));
      }
      const productIdArray = Array.isArray(sanitizedProductId) ? sanitizedProductId : [sanitizedProductId];
      await deleteScanHistoryItems(userId, productIdArray);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(`Delete scan-history error for ${userId}:`, err);
      return res.status(500).json(
        createErrorResponse(
          500,
          "Failed to delete scan",
          err?.message
        )
      );
    }
  }
);
router.delete(
  "/scan-history",
  requireAuth,
  async (req, res) => {
    const { userId } = req;
    try {
      const { ids } = req.body ?? {};
      if (Array.isArray(ids) && ids.length > 0) {
        await deleteScanHistoryItems(userId, ids);
      } else {
        await clearAllScanHistory(userId);
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(`Clear scan-history error for ${userId}:`, err);
      return res.status(500).json({ error: "Failed to clear scan history" });
    }
  }
);
router.get("/favorites", requireAuth, async (req, res) => {
  const { userId } = req;
  try {
    const barcodes = await getFavorites(userId);
    return res.status(200).json({ barcodes });
  } catch (err) {
    console.error(`Get favorites error for ${userId}:`, err);
    return res.status(500).json({ error: "Failed to fetch favorites" });
  }
});
router.post("/favorites", requireAuth, async (req, res) => {
  const { userId } = req;
  try {
    const { barcode } = req.body ?? {};
    if (!barcode || typeof barcode !== "string") {
      return res.status(400).json({ error: "barcode (string) is required" });
    }
    const isFavorite = await toggleFavorite(userId, barcode);
    return res.status(200).json({ isFavorite });
  } catch (err) {
    console.error(`Toggle favorite error for ${userId}:`, err);
    return res.status(500).json({ error: "Failed to toggle favorite" });
  }
});
router.delete(
  "/favorites/:barcode",
  requireAuth,
  async (req, res) => {
    const { userId } = req;
    const { barcode } = req.params;
    try {
      if (!barcode || typeof barcode !== "string") {
        return res.status(400).json(
          createErrorResponse(
            400,
            "barcode param is required and must be a string"
          )
        );
      }
      const sanitizedBarcode = barcode.trim();
      if (!sanitizedBarcode) {
        return res.status(400).json(createErrorResponse(400, "barcode cannot be empty"));
      }
      const barcodeString = Array.isArray(sanitizedBarcode) ? sanitizedBarcode[0] : sanitizedBarcode;
      await removeFavorite(userId, barcodeString);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(`Remove favorite error for ${userId}:`, err);
      return res.status(500).json(
        createErrorResponse(
          500,
          "Failed to remove favorite",
          err?.message
        )
      );
    }
  }
);
router.get("/profile", requireAuth, async (req, res) => {
  const { userId } = req;
  try {
    const profile = await getProfile(userId);
    return res.status(200).json({ profile });
  } catch (err) {
    console.error(`Get profile error for ${userId}:`, err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});
router.put("/profile", requireAuth, async (req, res) => {
  const { userId } = req;
  try {
    const { profile } = req.body ?? {};
    if (!profile || typeof profile !== "object") {
      return res.status(400).json({ error: "profile object is required" });
    }
    await saveProfile(userId, profile);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`Save profile error for ${userId}:`, err);
    return res.status(500).json({ error: "Failed to save profile" });
  }
});
router.get("/lists", requireAuth, async (req, res) => {
  const { userId } = req;
  try {
    const lists = await getLists(userId);
    return res.status(200).json({ lists });
  } catch (err) {
    console.error(`Get lists error for ${userId}:`, err);
    return res.status(500).json({ error: "Failed to fetch lists" });
  }
});
router.put("/lists", requireAuth, async (req, res) => {
  const { userId } = req;
  try {
    const { lists } = req.body ?? {};
    if (!Array.isArray(lists)) {
      return res.status(400).json({ error: "lists must be an array" });
    }
    await saveLists(userId, lists);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`Save lists error for ${userId}:`, err);
    return res.status(500).json({ error: "Failed to save lists" });
  }
});
var routes_default = router;

// server/index.ts
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
var app = express();
app.use((req, res, next) => {
  const allowedOrigins = /* @__PURE__ */ new Set();
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:8081");
    allowedOrigins.add("http://localhost:8082");
    allowedOrigins.add("exp://192.168.1.7:8082");
  }
  if (process.env.REPLIT_DEV_DOMAIN)
    allowedOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  if (process.env.REPLIT_DOMAINS)
    process.env.REPLIT_DOMAINS.split(",").forEach(
      (d) => allowedOrigins.add(`https://${d.trim()}`)
    );
  if (process.env.RENDER_SERVICE_URL) {
    allowedOrigins.add(process.env.RENDER_SERVICE_URL);
  }
  allowedOrigins.add("https://your-app-name.onrender.com");
  const origin = req.headers["origin"] ?? "";
  const isLocalNetwork = /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) || /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(origin) || /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin);
  const isAllowed = process.env.NODE_ENV === "production" ? allowedOrigins.has(origin) || isLocalNetwork : allowedOrigins.has(origin) || isLocalNetwork;
  if (origin && isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const icon = res.statusCode >= 500 ? "\u274C" : res.statusCode >= 400 ? "\u26A0\uFE0F " : "\u2705";
    console.log(
      `${icon} ${req.method} ${req.path} ${res.statusCode} \u2014 ${ms}ms`
    );
  });
  next();
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api", routes_default);
function configureStaticAndExpo() {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  let template = "<html><body><h1>FoodScan API is running</h1></body></html>";
  try {
    template = fs.readFileSync(templatePath, "utf-8");
  } catch {
  }
  let appName = "FoodScan";
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "app.json"), "utf-8")
    );
    appName = appJson.expo?.name || "FoodScan";
  } catch {
  }
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    if (req.path !== "/" && req.path !== "/manifest") return next();
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      const manifestPath = path.resolve(
        process.cwd(),
        "static-build",
        platform,
        "manifest.json"
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
      const host = req.headers["x-forwarded-host"] || req.headers["host"] || `localhost:${process.env.PORT || 3001}`;
      const html = template.replace(/BASE_URL_PLACEHOLDER/g, `${proto}://${host}`).replace(/EXPS_URL_PLACEHOLDER/g, host).replace(/APP_NAME_PLACEHOLDER/g, appName);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }
    next();
  });
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
}
configureStaticAndExpo();
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});
var PORT = parseInt(process.env.PORT || "3001", 10);
(async () => {
  console.log("\n\u{1F680} Starting FoodScan server...");
  console.log("   NODE_ENV:", process.env.NODE_ENV || "development");
  console.log("   PORT:", PORT);
  console.log(
    "   MONGODB_URI:",
    process.env.MONGODB_URI ? "\u2705 set" : "\u274C NOT SET"
  );
  console.log(
    "   JWT_SECRET:",
    process.env.JWT_SECRET ? "\u2705 set" : "\u26A0\uFE0F  not set (using fallback)"
  );
  console.log("   DB_NAME:", process.env.MONGODB_DB_NAME || "foodscan");
  if (!process.env.MONGODB_URI) {
    console.error("\n\u274C FATAL: MONGODB_URI is not set.");
    console.error("   Create a .env file in your project root with:");
    console.error(
      "   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
    );
    process.exit(1);
  }
  try {
    console.log("\n\u23F3 Connecting to MongoDB...");
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`
\u2705 Server ready on port ${PORT}`);
      console.log(`   Local:  http://localhost:${PORT}/api/health`);
      console.log(
        `   For Android device: http://YOUR_LAN_IP:${PORT}/api/health
`
      );
    });
  } catch (err) {
    console.error("\n\u274C FATAL: Could not connect to MongoDB:", err.message);
    console.error("\n   Fix checklist:");
    console.error("   1. Is MONGODB_URI correct in .env?");
    console.error("   2. Go to MongoDB Atlas \u2192 Network Access \u2192 Add 0.0.0.0/0");
    console.error("   3. Check your Atlas username/password");
    process.exit(1);
  }
})();
