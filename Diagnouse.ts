/**
 * diagnose.js — Run this with: node diagnose.js
 * Place this file in your project ROOT (same folder as package.json)
 * This will tell you EXACTLY what is wrong.
 */

const path = require("path");
const fs = require("fs");

console.log("\n============================");
console.log("  FOODSCAN DIAGNOSTIC TOOL");
console.log("============================\n");

// ── Step 1: Check .env file ───────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env");
console.log("📁 Looking for .env at:", envPath);

if (!fs.existsSync(envPath)) {
  console.error("❌ .env FILE NOT FOUND at", envPath);
  console.error("   Create a .env file in your project root with:");
  console.error("   MONGODB_URI=mongodb+srv://...");
  console.error("   JWT_SECRET=some-long-secret");
  process.exit(1);
}

console.log("✅ .env file found\n");

// ── Step 2: Load .env manually ────────────────────────────────────────────────
const envContent = fs.readFileSync(envPath, "utf-8");
const envLines = envContent.split("\n");

for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1).trim();
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// ── Step 3: Check required env vars ──────────────────────────────────────────
console.log("🔍 Checking environment variables...\n");

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const DB_NAME = process.env.MONGODB_DB_NAME || "foodscan";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in your .env file");
  console.error("   Add this line to .env:");
  console.error(
    "   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority",
  );
  process.exit(1);
}

if (
  MONGODB_URI.includes("password") ||
  MONGODB_URI.includes("<password>") ||
  MONGODB_URI.includes("your_password")
) {
  console.error("❌ MONGODB_URI still has a placeholder password!");
  console.error("   Replace <password> with your actual Atlas password");
  console.error("   Current value (first 60 chars):", MONGODB_URI.slice(0, 60));
  process.exit(1);
}

console.log("✅ MONGODB_URI is set");
console.log("   Starts with:", MONGODB_URI.slice(0, 30) + "...");
console.log("   DB Name:", DB_NAME);

if (!JWT_SECRET) {
  console.warn(
    "⚠️  JWT_SECRET not set — server will use fallback (OK for dev)",
  );
} else {
  console.log("✅ JWT_SECRET is set");
}

// ── Step 4: Check if mongodb package is installed ─────────────────────────────
console.log("\n🔍 Checking installed packages...\n");

const nodeModulesPath = path.resolve(process.cwd(), "node_modules", "mongodb");
if (!fs.existsSync(nodeModulesPath)) {
  console.error("❌ 'mongodb' package is NOT installed");
  console.error("   Run: npm install mongodb");
  process.exit(1);
}
console.log("✅ mongodb package installed");

const bcryptPath = path.resolve(process.cwd(), "node_modules", "bcryptjs");
if (!fs.existsSync(bcryptPath)) {
  console.error("❌ 'bcryptjs' package is NOT installed");
  console.error("   Run: npm install bcryptjs");
  process.exit(1);
}
console.log("✅ bcryptjs package installed");

const jwtPath = path.resolve(process.cwd(), "node_modules", "jsonwebtoken");
if (!fs.existsSync(jwtPath)) {
  console.error("❌ 'jsonwebtoken' package is NOT installed");
  console.error("   Run: npm install jsonwebtoken");
  process.exit(1);
}
console.log("✅ jsonwebtoken package installed");

// ── Step 5: Try actual MongoDB connection ─────────────────────────────────────
console.log("\n🔍 Attempting MongoDB connection...\n");

const { MongoClient } = require("mongodb");

const client = new MongoClient(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 15000,
});

client
  .connect()
  .then(async () => {
    await client.db("admin").command({ ping: 1 });
    console.log("✅ MongoDB connection SUCCESSFUL");
    console.log("✅ Database:", DB_NAME, "is accessible");

    const db = client.db(DB_NAME);
    const collections = await db.listCollections().toArray();
    console.log("\n📦 Existing collections in '" + DB_NAME + "':");
    if (collections.length === 0) {
      console.log("   (none yet — they will be created on first use)");
    } else {
      collections.forEach((c) => console.log("  •", c.name));
    }

    await client.close();
    console.log("\n✅ ALL CHECKS PASSED — MongoDB is working correctly");
    console.log("   The problem is elsewhere (see server startup logs)\n");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection FAILED");
    console.error("   Error:", err.message);
    console.error("\n   Common causes:");
    console.error("   1. Wrong password in MONGODB_URI");
    console.error("   2. Your IP is not in Atlas Network Access whitelist");
    console.error("      → Go to Atlas → Network Access → Add 0.0.0.0/0");
    console.error("   3. Cluster name/URL is wrong in MONGODB_URI");
    console.error("   4. Database user doesn't have readWrite permissions");
    console.error("\n   Your URI (first 60 chars):", MONGODB_URI.slice(0, 60));
    process.exit(1);
  });
