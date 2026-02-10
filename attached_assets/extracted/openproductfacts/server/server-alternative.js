import express from "express";
import cors from "cors";
import multer from "multer";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini AI
// Load from environment variable - dotenv.config() is called at the top
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI = null;
let model = null;

// Initialize Gemini AI
async function initializeGeminiAI() {
  if (GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

      // Use gemini-2.0-flash-001 (latest fast model) - gemini-1.5-flash not available for this API key
      // gemini-pro is DEPRECATED and will cause 404 errors - DO NOT USE IT
      // CRITICAL: Must use gemini-2.0-flash-001, gemini-2.5-flash, or gemini-2.5-pro
      const modelName = "gemini-2.5-flash"; // Fast and efficient - Latest Gemini 2.0 model

      console.log("🔧 Initializing Gemini AI with model:", modelName);
      console.log("🚫 NOT using gemini-pro (deprecated)");

      // Explicitly set the model - this is critical
      model = genAI.getGenerativeModel({
        model: modelName, // MUST be gemini-1.5-flash, NOT gemini-pro
      });

      console.log("✅ Gemini AI initialized successfully");
      console.log("📝 Using model: " + modelName);
      console.log(
        "🔑 API Key:",
        GEMINI_API_KEY.substring(0, 10) +
          "..." +
          GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4)
      );
      console.log("✅ Model instance created:", model ? "YES" : "NO");

      // Verify the model name is correct (if possible to check)
      if (!model) {
        throw new Error("Failed to create model instance");
      }

      // Test the model with a simple request to verify it works
      try {
        console.log("🧪 Testing model with simple prompt...");
        const testResult = await model.generateContent("Hello");
        const testResponse = await testResult.response;
        const testText = testResponse.text();
        console.log("✅ Gemini AI model test successful");
        console.log("📝 Test response:", testText.substring(0, 50));
      } catch (testError) {
        console.error("❌ Model test failed for gemini-1.5-flash");
        console.error("❌ Error:", testError.message);
        console.error("❌ Full error:", testError);

        // Check if error mentions gemini-pro (should not happen)
        if (testError.message?.includes("gemini-pro")) {
          console.error(
            "🚨 CRITICAL: Error mentions gemini-pro but we are using gemini-1.5-flash!"
          );
          console.error(
            "🚨 This suggests the API key or model initialization is wrong."
          );
        }

        // Try alternative model if flash doesn't work
        console.log("🔄 Trying alternative model: gemini-2.5-pro");
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
          const testResult2 = await model.generateContent("Hello");
          const testResponse2 = await testResult2.response;
          const testText2 = testResponse2.text();
          console.log("✅ Gemini AI model (gemini-2.5-pro) test successful");
          console.log("📝 Test response:", testText2.substring(0, 50));
        } catch (testError2) {
          console.error(
            "❌ Both model tests failed. Please check your API key and model availability."
          );
          console.error("❌ Error details:", testError2.message);
          console.error("❌ Full error:", testError2);
          model = null; // Set to null so we know it failed
        }
      }
    } catch (error) {
      console.error("❌ Error initializing Gemini AI:", error.message);
      console.error("Stack:", error.stack);
      console.error(
        "💡 Tip: Make sure your API key is valid and has access to Gemini API"
      );
      model = null;
    }
  } else {
    console.warn("⚠️  GEMINI_API_KEY not found in environment variables.");
    console.warn(
      "⚠️  Please create server/.env file with: GEMINI_API_KEY=your_key_here"
    );
    console.warn("⚠️  Current working directory:", __dirname);
    console.warn("⚠️  LLM functionality will not work without API key.");
    model = null;
  }
}

// Initialize Gemini AI (async)
initializeGeminiAI().catch((error) => {
  console.error("❌ Failed to initialize Gemini AI:", error);
  model = null;
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Simple JSON-based database
const dbPath = path.join(__dirname, "database.json");

function initDatabase() {
  if (!fs.existsSync(dbPath)) {
    const initialData = {
      products: [],
      scannedProducts: [],
      productLists: [],
      userPreferences: [],
      users: [], // Add users table for authentication and health data
      chatConversations: [], // Add chat conversations table
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  } else {
    // Ensure all required tables exist in existing database
    const db = readDB();
    let updated = false;

    if (!db.users) {
      db.users = [];
      updated = true;
    }
    if (!db.chatConversations) {
      db.chatConversations = [];
      updated = true;
    }
    if (!db.products) {
      db.products = [];
      updated = true;
    }
    if (!db.scannedProducts) {
      db.scannedProducts = [];
      updated = true;
    }
    if (!db.productLists) {
      db.productLists = [];
      updated = true;
    }
    if (!db.userPreferences) {
      db.userPreferences = [];
      updated = true;
    }

    if (updated) {
      writeDB(db);
      console.log("✅ Database schema updated");
    }
  }
}

function readDB() {
  try {
    const data = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    initDatabase();
    return readDB();
  }
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

initDatabase();

// Helper function to parse JSON fields
function parseJSONField(field) {
  if (!field) return null;
  try {
    return typeof field === "string" ? JSON.parse(field) : field;
  } catch {
    return field;
  }
}

function stringifyJSONField(field) {
  if (!field) return null;
  return typeof field === "object" ? JSON.stringify(field) : field;
}

// Simple session storage (in production, use proper session management)
const sessions = new Map(); // sessionId -> email

// Auth endpoints
app.get("/api/auth/me", async (req, res) => {
  try {
    const db = readDB();
    // Check for session cookie
    const sessionId =
      req.headers["authorization"]?.replace("Bearer ", "") ||
      req.headers["x-session-id"];

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const email = sessions.get(sessionId);
    const user = db.users.find((u) => u.email === email);

    if (!user) {
      sessions.delete(sessionId);
      return res.status(401).json({ error: "User not found" });
    }

    // Return user data (without password)
    res.json({
      email: user.email,
      full_name: user.full_name,
      id: user.id,
      health_data: user.health_data || {},
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/register", (req, res) => {
  try {
    const db = readDB();
    const { email, full_name, password, health_data } = req.body;

    // Check if user already exists
    const existingUser = db.users.find((u) => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create new user
    const newUser = {
      id: nanoid(),
      email: email,
      full_name: full_name || "User",
      password: password, // In production, hash this
      health_data: health_data || {},
      created_date: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDB(db);

    // Create user preferences with health data
    if (health_data) {
      const prefs = {
        id: nanoid(),
        created_by: email,
        age: health_data.age || null,
        gender: health_data.gender || null,
        allergies: health_data.allergies
          ? Array.isArray(health_data.allergies)
            ? health_data.allergies.join(", ")
            : health_data.allergies
          : "",
        conditions: health_data.conditions || [],
        dietary_preferences: health_data.dietary_preferences || [],
        notes: health_data.notes || "",
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      db.userPreferences.push(prefs);
      writeDB(db);
    }

    // Create session
    const sessionId = nanoid();
    sessions.set(sessionId, email);

    res.json({
      success: true,
      sessionId: sessionId,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find((u) => u.email === email);

    if (user && user.password === password) {
      // Create session
      const sessionId = nanoid();
      sessions.set(sessionId, email);

      res.json({
        success: true,
        sessionId: sessionId,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        },
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  try {
    const sessionId =
      req.headers["authorization"]?.replace("Bearer ", "") ||
      req.headers["x-session-id"];
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Products endpoints
app.get("/api/products", (req, res) => {
  try {
    const db = readDB();
    let products = [...db.products];

    const { sortBy = "-created_date", limit = 100 } = req.query;
    const limitNum = parseInt(limit) || 100;

    // Simple sorting
    if (sortBy.startsWith("-")) {
      const field = sortBy.slice(1);
      products.sort((a, b) => {
        if (field === "created_date") {
          return new Date(b[field] || 0) - new Date(a[field] || 0);
        }
        return (b[field] || "").localeCompare(a[field] || "");
      });
    } else {
      products.sort((a, b) => {
        if (sortBy === "created_date") {
          return new Date(a[sortBy] || 0) - new Date(b[sortBy] || 0);
        }
        return (a[sortBy] || "").localeCompare(b[sortBy] || "");
      });
    }

    products = products.slice(0, limitNum);

    const formatted = products.map((p) => ({
      ...p,
      categories: parseJSONField(p.categories) || [],
      ingredients: parseJSONField(p.ingredients) || [],
      allergens: parseJSONField(p.allergens) || [],
      nutritional_info: parseJSONField(p.nutritional_info) || {},
      nutri_score_details: parseJSONField(p.nutri_score_details) || {},
      packaging: parseJSONField(p.packaging) || {},
      countries_sold: parseJSONField(p.countries_sold) || [],
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/products/filter", (req, res) => {
  try {
    const db = readDB();
    let products = [...db.products];
    const filters = req.query;

    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        products = products.filter((p) => p[key] === filters[key]);
      }
    });

    const formatted = products.map((p) => ({
      ...p,
      categories: parseJSONField(p.categories) || [],
      ingredients: parseJSONField(p.ingredients) || [],
      allergens: parseJSONField(p.allergens) || [],
      nutritional_info: parseJSONField(p.nutritional_info) || {},
      nutri_score_details: parseJSONField(p.nutri_score_details) || {},
      packaging: parseJSONField(p.packaging) || {},
      countries_sold: parseJSONField(p.countries_sold) || [],
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/products", (req, res) => {
  try {
    const db = readDB();
    const id = nanoid();
    const product = {
      id,
      ...req.body,
      categories: stringifyJSONField(req.body.categories),
      ingredients: stringifyJSONField(req.body.ingredients),
      allergens: stringifyJSONField(req.body.allergens),
      nutritional_info: stringifyJSONField(req.body.nutritional_info),
      nutri_score_details: stringifyJSONField(req.body.nutri_score_details),
      packaging: stringifyJSONField(req.body.packaging),
      countries_sold: stringifyJSONField(req.body.countries_sold),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };

    db.products.push(product);
    writeDB(db);

    res.json({ id, ...product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/products/:id", (req, res) => {
  try {
    const db = readDB();
    const { id } = req.params;
    const index = db.products.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updates = {
      ...req.body,
      categories: stringifyJSONField(req.body.categories),
      ingredients: stringifyJSONField(req.body.ingredients),
      allergens: stringifyJSONField(req.body.allergens),
      nutritional_info: stringifyJSONField(req.body.nutritional_info),
      nutri_score_details: stringifyJSONField(req.body.nutri_score_details),
      packaging: stringifyJSONField(req.body.packaging),
      countries_sold: stringifyJSONField(req.body.countries_sold),
      updated_date: new Date().toISOString(),
    };

    db.products[index] = { ...db.products[index], ...updates };
    writeDB(db);

    const updated = db.products[index];
    res.json({
      ...updated,
      categories: parseJSONField(updated.categories) || [],
      ingredients: parseJSONField(updated.ingredients) || [],
      allergens: parseJSONField(updated.allergens) || [],
      nutritional_info: parseJSONField(updated.nutritional_info) || {},
      nutri_score_details: parseJSONField(updated.nutri_score_details) || {},
      packaging: parseJSONField(updated.packaging) || {},
      countries_sold: parseJSONField(updated.countries_sold) || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/products/:id", (req, res) => {
  try {
    const db = readDB();
    const { id } = req.params;
    db.products = db.products.filter((p) => p.id !== id);
    writeDB(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scanned Products endpoints
app.get("/api/scanned-products", (req, res) => {
  try {
    const db = readDB();
    let products = [...db.scannedProducts];

    const { sortBy = "-scanned_at", limit = 100 } = req.query;
    const limitNum = parseInt(limit) || 100;

    if (sortBy.startsWith("-")) {
      const field = sortBy.slice(1);
      products.sort((a, b) => {
        if (field === "scanned_at" || field === "created_date") {
          return new Date(b[field] || 0) - new Date(a[field] || 0);
        }
        return (b[field] || "").localeCompare(a[field] || "");
      });
    }

    products = products.slice(0, limitNum);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/scanned-products/filter", (req, res) => {
  try {
    const db = readDB();
    let products = [...db.scannedProducts];
    const filters = req.query;

    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        products = products.filter((p) => p[key] === filters[key]);
      }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/scanned-products", (req, res) => {
  try {
    const db = readDB();
    const id = nanoid();
    const scanned = {
      id,
      ...req.body,
      scanned_at: req.body.scanned_at || new Date().toISOString(),
      created_date: new Date().toISOString(),
    };

    db.scannedProducts.push(scanned);
    writeDB(db);

    res.json({ id, ...scanned });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/scanned-products/:id", (req, res) => {
  try {
    const db = readDB();
    const { id } = req.params;
    db.scannedProducts = db.scannedProducts.filter((p) => p.id !== id);
    writeDB(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Product Lists endpoints
app.get("/api/product-lists", (req, res) => {
  try {
    const db = readDB();
    let lists = [...db.productLists];

    const { sortBy = "-created_date", limit = 100 } = req.query;
    const limitNum = parseInt(limit) || 100;

    if (sortBy.startsWith("-")) {
      const field = sortBy.slice(1);
      lists.sort((a, b) => {
        if (field === "created_date" || field === "updated_date") {
          return new Date(b[field] || 0) - new Date(a[field] || 0);
        }
        return (b[field] || "").localeCompare(a[field] || "");
      });
    }

    lists = lists.slice(0, limitNum);

    const formatted = lists.map((l) => ({
      ...l,
      product_ids: parseJSONField(l.product_ids) || [],
      is_favorite: l.is_favorite === 1 || l.is_favorite === true,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/product-lists/filter", (req, res) => {
  try {
    const db = readDB();
    let lists = [...db.productLists];
    const filters = req.query;

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined) {
        if (key === "is_favorite") {
          lists = lists.filter(
            (l) =>
              (l.is_favorite === 1 || l.is_favorite === true) === filters[key]
          );
        } else {
          lists = lists.filter((l) => l[key] === filters[key]);
        }
      }
    });

    const formatted = lists.map((l) => ({
      ...l,
      product_ids: parseJSONField(l.product_ids) || [],
      is_favorite: l.is_favorite === 1 || l.is_favorite === true,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/product-lists", (req, res) => {
  try {
    const db = readDB();
    const id = nanoid();
    const list = {
      id,
      ...req.body,
      product_ids: stringifyJSONField(req.body.product_ids || []),
      is_favorite: req.body.is_favorite ? 1 : 0,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };

    db.productLists.push(list);
    writeDB(db);

    res.json({
      id,
      ...list,
      product_ids: parseJSONField(list.product_ids) || [],
      is_favorite: list.is_favorite === 1,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/product-lists/:id", (req, res) => {
  try {
    const db = readDB();
    const { id } = req.params;
    const index = db.productLists.findIndex((l) => l.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "List not found" });
    }

    const updates = {
      ...req.body,
      product_ids: stringifyJSONField(req.body.product_ids),
      is_favorite:
        req.body.is_favorite !== undefined
          ? req.body.is_favorite
            ? 1
            : 0
          : undefined,
      updated_date: new Date().toISOString(),
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        db.productLists[index][key] = updates[key];
      }
    });

    writeDB(db);

    const updated = db.productLists[index];
    res.json({
      ...updated,
      product_ids: parseJSONField(updated.product_ids) || [],
      is_favorite: updated.is_favorite === 1,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/product-lists/:id", (req, res) => {
  try {
    const db = readDB();
    const { id } = req.params;
    db.productLists = db.productLists.filter((l) => l.id !== id);
    writeDB(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Preferences endpoints
app.get("/api/user-preferences", (req, res) => {
  try {
    const db = readDB();
    let prefs = [...db.userPreferences];

    const { sortBy = "-created_date", limit = 100 } = req.query;
    const limitNum = parseInt(limit) || 100;

    if (sortBy.startsWith("-")) {
      const field = sortBy.slice(1);
      prefs.sort((a, b) => {
        if (field === "created_date" || field === "updated_date") {
          return new Date(b[field] || 0) - new Date(a[field] || 0);
        }
        return (b[field] || "").localeCompare(a[field] || "");
      });
    }

    prefs = prefs.slice(0, limitNum);

    const formatted = prefs.map((p) => ({
      ...p,
      conditions: parseJSONField(p.conditions) || [],
      dietary_restrictions: parseJSONField(p.dietary_restrictions) || [],
      allergies: p.allergies || "", // Return allergies as string
      allergens: parseJSONField(p.allergens) || [],
      nutritional_goals: parseJSONField(p.nutritional_goals) || {},
      blacklisted_ingredients: parseJSONField(p.blacklisted_ingredients) || [],
      location: parseJSONField(p.location) || {},
      preferred_stores: parseJSONField(p.preferred_stores) || [],
      dark_mode: p.dark_mode === 1 || p.dark_mode === true,
      notifications_enabled:
        p.notifications_enabled === 1 || p.notifications_enabled === true,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/user-preferences/filter", (req, res) => {
  try {
    const db = readDB();
    let prefs = [...db.userPreferences];
    const filters = req.query;

    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        prefs = prefs.filter((p) => p[key] === filters[key]);
      }
    });

    const formatted = prefs.map((p) => ({
      ...p,
      conditions: parseJSONField(p.conditions) || [],
      dietary_restrictions: parseJSONField(p.dietary_restrictions) || [],
      allergies: p.allergies || "", // Return allergies as string
      allergens: parseJSONField(p.allergens) || [],
      nutritional_goals: parseJSONField(p.nutritional_goals) || {},
      blacklisted_ingredients: parseJSONField(p.blacklisted_ingredients) || [],
      location: parseJSONField(p.location) || {},
      preferred_stores: parseJSONField(p.preferred_stores) || [],
      dark_mode: p.dark_mode === 1 || p.dark_mode === true,
      notifications_enabled:
        p.notifications_enabled === 1 || p.notifications_enabled === true,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error filtering user preferences:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user-preferences", (req, res) => {
  try {
    const db = readDB();

    // Check if preferences already exist for this user
    const createdBy = req.body.created_by;
    if (createdBy) {
      const existingPrefs = db.userPreferences.find(
        (p) => p.created_by === createdBy
      );
      if (existingPrefs) {
        // Update existing preferences instead of creating new ones
        const index = db.userPreferences.findIndex(
          (p) => p.id === existingPrefs.id
        );

        const updates = {
          ...req.body,
          conditions:
            req.body.conditions !== undefined
              ? stringifyJSONField(req.body.conditions)
              : existingPrefs.conditions,
          dietary_restrictions:
            req.body.dietary_restrictions !== undefined
              ? stringifyJSONField(req.body.dietary_restrictions)
              : existingPrefs.dietary_restrictions,
          allergies:
            req.body.allergies !== undefined
              ? Array.isArray(req.body.allergies)
                ? req.body.allergies.join(", ")
                : req.body.allergies
              : existingPrefs.allergies,
          nutritional_goals:
            req.body.nutritional_goals !== undefined
              ? stringifyJSONField(req.body.nutritional_goals)
              : existingPrefs.nutritional_goals,
          blacklisted_ingredients:
            req.body.blacklisted_ingredients !== undefined
              ? stringifyJSONField(req.body.blacklisted_ingredients)
              : existingPrefs.blacklisted_ingredients,
          location:
            req.body.location !== undefined
              ? stringifyJSONField(req.body.location)
              : existingPrefs.location,
          preferred_stores:
            req.body.preferred_stores !== undefined
              ? stringifyJSONField(req.body.preferred_stores)
              : existingPrefs.preferred_stores,
          dark_mode:
            req.body.dark_mode !== undefined
              ? req.body.dark_mode
                ? 1
                : 0
              : existingPrefs.dark_mode,
          notifications_enabled:
            req.body.notifications_enabled !== undefined
              ? req.body.notifications_enabled
                ? 1
                : 0
              : existingPrefs.notifications_enabled,
          updated_date: new Date().toISOString(),
        };

        Object.keys(updates).forEach((key) => {
          if (
            updates[key] !== undefined &&
            key !== "id" &&
            key !== "created_by" &&
            key !== "created_date"
          ) {
            db.userPreferences[index][key] = updates[key];
          }
        });

        writeDB(db);

        const updated = db.userPreferences[index];
        return res.json({
          ...updated,
          conditions: parseJSONField(updated.conditions) || [],
          dietary_restrictions:
            parseJSONField(updated.dietary_restrictions) || [],
          allergies: updated.allergies,
          nutritional_goals: parseJSONField(updated.nutritional_goals) || {},
          blacklisted_ingredients:
            parseJSONField(updated.blacklisted_ingredients) || [],
          location: parseJSONField(updated.location) || {},
          preferred_stores: parseJSONField(updated.preferred_stores) || [],
          dark_mode: updated.dark_mode === 1,
          notifications_enabled: updated.notifications_enabled === 1,
        });
      }
    }

    // Create new preferences
    const id = nanoid();
    const prefs = {
      id,
      created_by: req.body.created_by || "user@example.com", // Ensure created_by is set
      ...req.body,
      conditions: stringifyJSONField(req.body.conditions),
      dietary_restrictions: stringifyJSONField(req.body.dietary_restrictions),
      allergies: req.body.allergies
        ? Array.isArray(req.body.allergies)
          ? req.body.allergies.join(", ")
          : req.body.allergies
        : "", // Handle allergies as string
      nutritional_goals: stringifyJSONField(req.body.nutritional_goals),
      blacklisted_ingredients: stringifyJSONField(
        req.body.blacklisted_ingredients
      ),
      location: stringifyJSONField(req.body.location),
      preferred_stores: stringifyJSONField(req.body.preferred_stores),
      dark_mode:
        req.body.dark_mode !== undefined ? (req.body.dark_mode ? 1 : 0) : 1,
      notifications_enabled:
        req.body.notifications_enabled !== undefined
          ? req.body.notifications_enabled
            ? 1
            : 0
          : 1,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };

    db.userPreferences.push(prefs);
    writeDB(db);

    res.json({
      id,
      ...prefs,
      conditions: parseJSONField(prefs.conditions) || [],
      dietary_restrictions: parseJSONField(prefs.dietary_restrictions) || [],
      allergies: prefs.allergies, // Return as string
      nutritional_goals: parseJSONField(prefs.nutritional_goals) || {},
      blacklisted_ingredients:
        parseJSONField(prefs.blacklisted_ingredients) || [],
      location: parseJSONField(prefs.location) || {},
      preferred_stores: parseJSONField(prefs.preferred_stores) || [],
      dark_mode: prefs.dark_mode === 1,
      notifications_enabled: prefs.notifications_enabled === 1,
    });
  } catch (error) {
    console.error("Error creating/updating user preferences:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/user-preferences/:id", (req, res) => {
  try {
    const db = readDB();
    const { id } = req.params;
    const index = db.userPreferences.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Preferences not found" });
    }

    const updates = {
      ...req.body,
      conditions:
        req.body.conditions !== undefined
          ? stringifyJSONField(req.body.conditions)
          : undefined,
      dietary_restrictions:
        req.body.dietary_restrictions !== undefined
          ? stringifyJSONField(req.body.dietary_restrictions)
          : undefined,
      allergens:
        req.body.allergens !== undefined
          ? stringifyJSONField(req.body.allergens)
          : undefined,
      nutritional_goals:
        req.body.nutritional_goals !== undefined
          ? stringifyJSONField(req.body.nutritional_goals)
          : undefined,
      blacklisted_ingredients:
        req.body.blacklisted_ingredients !== undefined
          ? stringifyJSONField(req.body.blacklisted_ingredients)
          : undefined,
      location:
        req.body.location !== undefined
          ? stringifyJSONField(req.body.location)
          : undefined,
      preferred_stores:
        req.body.preferred_stores !== undefined
          ? stringifyJSONField(req.body.preferred_stores)
          : undefined,
      dark_mode:
        req.body.dark_mode !== undefined
          ? req.body.dark_mode
            ? 1
            : 0
          : undefined,
      notifications_enabled:
        req.body.notifications_enabled !== undefined
          ? req.body.notifications_enabled
            ? 1
            : 0
          : undefined,
      updated_date: new Date().toISOString(),
    };

    // Handle allergies as string (comma-separated)
    if (req.body.allergies !== undefined) {
      if (Array.isArray(req.body.allergies)) {
        updates.allergies = req.body.allergies.join(", ");
      } else if (typeof req.body.allergies === "string") {
        updates.allergies = req.body.allergies;
      }
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        db.userPreferences[index][key] = updates[key];
      }
    });

    writeDB(db);

    const updated = db.userPreferences[index];
    res.json({
      ...updated,
      conditions: parseJSONField(updated.conditions) || [],
      dietary_restrictions: parseJSONField(updated.dietary_restrictions) || [],
      allergies: updated.allergies || "", // Return allergies as string
      allergens: parseJSONField(updated.allergens) || [],
      nutritional_goals: parseJSONField(updated.nutritional_goals) || {},
      blacklisted_ingredients:
        parseJSONField(updated.blacklisted_ingredients) || [],
      location: parseJSONField(updated.location) || {},
      preferred_stores: parseJSONField(updated.preferred_stores) || [],
      dark_mode: updated.dark_mode === 1,
      notifications_enabled: updated.notifications_enabled === 1,
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to update health info from chatbot
app.post("/api/user-preferences/:id/update-health", (req, res) => {
  try {
    const db = readDB();
    const { id } = req.params;
    const { new_allergies, new_conditions } = req.body;

    const index = db.userPreferences.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Preferences not found" });
    }

    const prefs = db.userPreferences[index];

    // Update allergies - handle as comma-separated string
    if (new_allergies && new_allergies.length > 0) {
      const currentAllergies = prefs.allergies
        ? typeof prefs.allergies === "string"
          ? prefs.allergies
              .split(",")
              .map((a) => a.trim())
              .filter((a) => a)
          : Array.isArray(prefs.allergies)
          ? prefs.allergies
          : []
        : [];
      const updatedAllergies = [
        ...new Set([...currentAllergies, ...new_allergies]),
      ];
      prefs.allergies = updatedAllergies.join(", ");
    }

    // Update conditions - handle as JSON array
    if (new_conditions && new_conditions.length > 0) {
      const currentConditions = parseJSONField(prefs.conditions) || [];
      const updatedConditions = [
        ...new Set([...currentConditions, ...new_conditions]),
      ];
      prefs.conditions = stringifyJSONField(updatedConditions);
    }

    prefs.updated_date = new Date().toISOString();
    writeDB(db);

    res.json({
      ...prefs,
      conditions: parseJSONField(prefs.conditions) || [],
      dietary_restrictions: parseJSONField(prefs.dietary_restrictions) || [],
      allergies: prefs.allergies || "", // Return allergies as string
      allergens: parseJSONField(prefs.allergens) || [],
      nutritional_goals: parseJSONField(prefs.nutritional_goals) || {},
      blacklisted_ingredients:
        parseJSONField(prefs.blacklisted_ingredients) || [],
      location: parseJSONField(prefs.location) || {},
      preferred_stores: parseJSONField(prefs.preferred_stores) || [],
      dark_mode: prefs.dark_mode === 1,
      notifications_enabled: prefs.notifications_enabled === 1,
    });
  } catch (error) {
    console.error("Error updating health info:", error);
    res.status(500).json({ error: error.message });
  }
});

// File upload endpoint
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // In production, upload to cloud storage (S3, Cloudinary, etc.)
    // For now, return a local file URL
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ file_url: fileUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Chat Conversations endpoints
app.get("/api/chat-conversations", (req, res) => {
  try {
    const db = readDB();
    const { user_id, limit = 50 } = req.query;

    let conversations = [...(db.chatConversations || [])];

    if (user_id) {
      conversations = conversations.filter((c) => c.user_id === user_id);
    }

    // Sort by most recent
    conversations.sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    const limitNum = parseInt(limit) || 50;
    conversations = conversations.slice(0, limitNum);

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat-conversations", (req, res) => {
  try {
    const db = readDB();
    if (!db.chatConversations) {
      db.chatConversations = [];
    }

    const conversation = {
      id: nanoid(),
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.chatConversations.push(conversation);
    writeDB(db);

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/chat-conversations/:id", (req, res) => {
  try {
    const db = readDB();
    if (!db.chatConversations) {
      db.chatConversations = [];
    }

    const { id } = req.params;
    const index = db.chatConversations.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    db.chatConversations[index] = {
      ...db.chatConversations[index],
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    writeDB(db);
    res.json(db.chatConversations[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/chat-conversations/:id", (req, res) => {
  try {
    const db = readDB();
    if (!db.chatConversations) {
      db.chatConversations = [];
    }

    const { id } = req.params;
    db.chatConversations = db.chatConversations.filter((c) => c.id !== id);
    writeDB(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LLM endpoint - Gemini AI Integration
app.post("/api/llm/invoke", async (req, res) => {
  try {
    const {
      prompt,
      file_urls,
      response_json_schema,
      add_context_from_internet,
    } = req.body;

    // Wait for model to be initialized (with timeout)
    let attempts = 0;
    const maxAttempts = 10;
    while (!model && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    // Check if model is initialized
    if (!model) {
      console.error("❌ Gemini model not initialized after waiting.");
      console.error(
        "GEMINI_API_KEY:",
        GEMINI_API_KEY
          ? "Present (" + GEMINI_API_KEY.substring(0, 10) + "...)"
          : "Missing"
      );
      console.error("Please check server/.env file and restart the server.");
      return res.status(500).json({
        error:
          "Gemini AI model not initialized. Please check GEMINI_API_KEY in server/.env file and restart the server.",
        details:
          "The model might still be initializing. Please wait a few seconds and try again, or check server logs for initialization errors.",
      });
    }

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("🤖 LLM Request:", {
      hasPrompt: !!prompt,
      hasSchema: !!response_json_schema,
      promptLength: prompt?.length,
      model: model ? "gemini-1.5-flash" : "not initialized",
    });

    // Build the prompt with schema instructions if needed
    let fullPrompt = prompt;

    if (response_json_schema) {
      // Add JSON schema instructions to the prompt
      fullPrompt = `${prompt}\n\nIMPORTANT: You must respond with ONLY valid JSON that matches this exact schema. Do not include any markdown formatting, code blocks, or explanatory text. Return ONLY the JSON object:\n\n${JSON.stringify(
        response_json_schema,
        null,
        2
      )}\n\nRespond with JSON only:`;
    }

    // Generate content using Gemini
    // Use simple string format for better compatibility with gemini-1.5 models
    let text = "";
    try {
      console.log(
        "🔄 Calling Gemini API with model:",
        model ? "initialized" : "NOT INITIALIZED"
      );

      // Double-check model is initialized
      if (!model) {
        throw new Error(
          "Gemini model is not initialized. Please restart the server and check GEMINI_API_KEY."
        );
      }

      // Verify we're using the right model (check internal state if possible)
      console.log(
        "🔄 Generating content with prompt length:",
        fullPrompt.length
      );

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      text = response.text();

      // Clean up the response text
      text = text.trim();

      console.log("✅ LLM Response received, length:", text.length);
      if (text.length > 0) {
        console.log(
          "📄 Response preview:",
          text.substring(0, 100) + (text.length > 100 ? "..." : "")
        );
      }
    } catch (genError) {
      console.error("❌ Error generating content from Gemini:");
      console.error("❌ Error message:", genError.message);
      console.error("❌ Error name:", genError.name);
      console.error("❌ Error stack:", genError.stack);

      // Check if error mentions gemini-pro
      if (genError.message?.includes("gemini-pro")) {
        console.error(
          "🚨 CRITICAL ERROR: Gemini API is trying to use gemini-pro instead of gemini-1.5-flash!"
        );
        console.error("🚨 This should not happen. Please check:");
        console.error("   1. Server was restarted after code changes");
        console.error("   2. GEMINI_API_KEY is correct");
        console.error("   3. Model initialization completed successfully");
        console.error("   4. No cached model instance is being used");
      }

      throw genError; // Re-throw to be caught by outer catch
    }

    // If JSON schema is required, try to parse the response
    if (response_json_schema) {
      try {
        // Remove markdown code blocks if present
        text = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        // Extract JSON object
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonText = jsonMatch[0];
          const jsonResponse = JSON.parse(jsonText);
          console.log("✅ JSON parsed successfully");
          return res.json(jsonResponse);
        }

        // Try parsing the entire response as JSON
        const jsonResponse = JSON.parse(text);
        console.log("✅ JSON parsed successfully (full text)");
        return res.json(jsonResponse);
      } catch (parseError) {
        console.error("❌ Error parsing JSON response:", parseError.message);
        console.log("Raw response (first 500 chars):", text.substring(0, 500));

        // Try to fix common JSON issues
        try {
          // Remove trailing commas
          let fixedText = text.replace(/,(\s*[}\]])/g, "$1");
          const jsonResponse = JSON.parse(fixedText);
          return res.json(jsonResponse);
        } catch (fixError) {
          // Return error with raw response for debugging
          return res.status(500).json({
            error: "Failed to parse JSON response from Gemini",
            details: parseError.message,
            raw: text.substring(0, 1000), // First 1000 chars for debugging
          });
        }
      }
    }

    // Return text response - always return as string for consistency
    // Frontend expects either a string or an object with error property
    if (!text || text.trim().length === 0) {
      return res.status(500).json({
        error: "Empty response from Gemini AI",
        details: "The AI model returned an empty response. Please try again.",
      });
    }

    // Return as JSON object with text property for consistency
    // This ensures frontend can always parse it as JSON
    res.json({ text: text });
  } catch (error) {
    console.error("❌ LLM Error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    // Provide helpful error messages
    if (
      error.message?.includes("API_KEY") ||
      error.message?.includes("API key")
    ) {
      return res.status(401).json({
        error:
          "Invalid Gemini API key. Please check your GEMINI_API_KEY in server/.env file.",
        details: error.message,
      });
    }

    if (
      error.message?.includes("quota") ||
      error.message?.includes("limit") ||
      error.message?.includes("429")
    ) {
      return res.status(429).json({
        error: "API quota exceeded. Please check your Gemini API usage limits.",
        details: error.message,
      });
    }

    if (
      error.message?.includes("404") ||
      error.message?.includes("not found")
    ) {
      // CRITICAL: Check if error mentions gemini-pro - this means server is running OLD CODE
      if (error.message?.includes("gemini-pro")) {
        console.error("🚨🚨🚨 CRITICAL ERROR DETECTED 🚨🚨🚨");
        console.error(
          "🚨 Server is trying to use DEPRECATED gemini-pro model!"
        );
        console.error(
          "🚨 This means the server is running OLD CODE and MUST be restarted!"
        );
        console.error("🚨 Current error:", error.message);

        return res.status(500).json({
          error:
            "CRITICAL: Server is using deprecated gemini-pro model. You MUST restart the backend server.",
          details:
            "The code has been updated to use gemini-1.5-flash, but the running server process is still using old code.",
          solution: [
            "1. Stop the backend server (Press Ctrl+C)",
            "2. Kill all Node processes: Get-Process node | Stop-Process -Force",
            "3. Restart server: cd server && npm run dev",
            '4. Verify logs show: "Using model: gemini-1.5-flash"',
          ],
          currentError: error.message,
          fixRequired: "RESTART_BACKEND_SERVER",
        });
      }

      return res.status(404).json({
        error: "Model not found. Please check if the model name is correct.",
        details: error.message,
      });
    }

    // Return detailed error for debugging
    res.status(500).json({
      error: error.message || "Failed to generate response from Gemini AI",
      details: error.stack || "Check server logs for more information",
      name: error.name || "UnknownError",
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Using JSON database: ${dbPath}`);
  console.log("");
  console.log("💡 Note: Gemini AI initialization happens asynchronously.");
  console.log("💡 Check logs above for Gemini AI initialization status.");
  console.log("");

  // Wait a moment for Gemini AI to initialize, then check status
  setTimeout(() => {
    if (model) {
      console.log("✅ Gemini AI is ready and working!");
    } else {
      console.warn(
        "⚠️  Gemini AI model not initialized. Check logs above for details."
      );
    }
  }, 2000);
});
