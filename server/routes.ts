import { Router, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  requireAuth,
  AuthRequest,
} from "./middleware/auth";
import {
  findUserByEmail,
  createUser,
  toPublicUser,
  getScanHistory,
  addScanHistory,
  deleteScanHistoryItems,
  clearAllScanHistory,
  getFavorites,
  toggleFavorite,
  removeFavorite,
  getProfile,
  saveProfile,
  getLists,
  saveLists,
} from "./storage";

const router = Router();

// Standard error response format
const createErrorResponse = (
  status: number,
  message: string,
  details?: any,
) => ({
  error: message,
  status,
  timestamp: new Date().toISOString(),
  ...(details && { details }),
});

// Request logging middleware for debugging
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Security: Limit response size
router.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 *
 * Login-or-register in one step:
 *   - If email exists → verify password → issue JWT
 *   - If email does NOT exist → create account → issue JWT
 *
 * Body: { email, password, username? }
 * Returns: { token, user: { userId, email, username } }
 */
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body ?? {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "email is required" });
    }
    if (!password || typeof password !== "string" || !password.trim()) {
      return res.status(400).json({ error: "password is required" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "password must be at least 8 characters" });
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "invalid email format" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Check if user exists ──────────────────────────────────────────────────
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      // LOGIN path: verify password
      const passwordValid = await bcrypt.compare(
        password,
        existingUser.passwordHash,
      );
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { userId: existingUser.userId, email: existingUser.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
      );

      console.log(`✅ Login: ${existingUser.email} (${existingUser.userId})`);

      return res.status(200).json({
        token,
        user: toPublicUser(existingUser),
        isNewUser: false,
      });
    } else {
      // REGISTER path: create new user
      const passwordHash = await bcrypt.hash(password, 12);
      const newUser = await createUser({
        email: normalizedEmail,
        passwordHash,
        username: username?.trim() || undefined,
      });

      const token = jwt.sign(
        { userId: newUser.userId, email: newUser.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
      );

      console.log(`✅ Registered: ${newUser.email} (${newUser.userId})`);

      return res.status(201).json({
        token,
        user: toPublicUser(newUser),
        isNewUser: true,
      });
    }
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
});

/**
 * GET /api/auth/verify
 * Validates the current JWT and returns the user payload.
 * Used by the client on app startup to check session validity.
 */
router.get("/auth/verify", requireAuth, (req: Request, res: Response) => {
  const { userId, userEmail } = req as AuthRequest;
  return res.status(200).json({ valid: true, userId, email: userEmail });
});

// ─── SYNC ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/sync
 * Returns all user data in one request.
 * Called immediately after login and on app cold start.
 * userId comes ONLY from the verified JWT — never from the client.
 */
router.get("/sync", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  try {
    const [history, lists, profile, favorites] = await Promise.all([
      getScanHistory(userId),
      getLists(userId),
      getProfile(userId),
      getFavorites(userId),
    ]);

    console.log(
      `📦 Sync → ${userId}: ${history.length} scans, ` +
        `${lists.length} lists, ${favorites.length} favorites`,
    );

    return res.status(200).json({ history, lists, profile, favorites });
  } catch (err) {
    console.error(`Sync error for ${userId}:`, err);
    return res.status(500).json({ error: "Sync failed" });
  }
});

// ─── SCAN HISTORY ─────────────────────────────────────────────────────────────

/**
 * GET /api/scan-history
 * Returns the authenticated user's scan history (max 200 items, sorted newest first).
 */
router.get(
  "/scan-history",
  requireAuth,
  async (req: Request, res: Response) => {
    const { userId } = req as AuthRequest;
    try {
      const history = await getScanHistory(userId);
      return res.status(200).json({ history });
    } catch (err) {
      console.error(`Get scan-history error for ${userId}:`, err);
      return res.status(500).json({ error: "Failed to fetch scan history" });
    }
  },
);

/**
 * POST /api/scan-history
 * Saves a scanned product for the authenticated user.
 * Body: { product: ScannedProduct }
 */
router.post(
  "/scan-history",
  requireAuth,
  async (req: Request, res: Response) => {
    const { userId } = req as AuthRequest;
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
  },
);

/**
 * DELETE /api/scan-history/:id
 * Deletes a specific scan by product ID for the authenticated user.
 * :id is the product.id field (not MongoDB _id)
 */
router.delete(
  "/scan-history/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    const { userId } = req as AuthRequest;
    const productId = req.params.id;
    try {
      if (!productId || typeof productId !== "string") {
        return res
          .status(400)
          .json(
            createErrorResponse(
              400,
              "product id param is required and must be a string",
            ),
          );
      }
      // Sanitize productId
      const sanitizedProductId = productId.trim();
      if (!sanitizedProductId) {
        return res
          .status(400)
          .json(createErrorResponse(400, "product id cannot be empty"));
      }
      // Ensure productId is a string and wrap in array
      const productIdArray = Array.isArray(sanitizedProductId)
        ? sanitizedProductId
        : [sanitizedProductId];
      await deleteScanHistoryItems(userId, productIdArray);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(`Delete scan-history error for ${userId}:`, err);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            "Failed to delete scan",
            (err as any)?.message,
          ),
        );
    }
  },
);

/**
 * DELETE /api/scan-history
 * Clears ALL scan history for the authenticated user.
 * Body: { ids: string[] }  — if provided, deletes only those IDs.
 *                           if omitted, clears everything.
 */
router.delete(
  "/scan-history",
  requireAuth,
  async (req: Request, res: Response) => {
    const { userId } = req as AuthRequest;
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
  },
);

// ─── FAVORITES ────────────────────────────────────────────────────────────────

/**
 * GET /api/favorites
 * Returns the authenticated user's favorite barcodes.
 */
router.get("/favorites", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  try {
    const barcodes = await getFavorites(userId);
    return res.status(200).json({ barcodes });
  } catch (err) {
    console.error(`Get favorites error for ${userId}:`, err);
    return res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

/**
 * POST /api/favorites
 * Toggles a barcode in the authenticated user's favorites.
 * Body: { barcode: string }
 * Returns: { isFavorite: boolean } — the NEW state
 */
router.post("/favorites", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
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

/**
 * DELETE /api/favorites/:barcode
 * Removes a specific barcode from the authenticated user's favorites.
 */
router.delete(
  "/favorites/:barcode",
  requireAuth,
  async (req: Request, res: Response) => {
    const { userId } = req as AuthRequest;
    const { barcode } = req.params;
    try {
      if (!barcode || typeof barcode !== "string") {
        return res
          .status(400)
          .json(
            createErrorResponse(
              400,
              "barcode param is required and must be a string",
            ),
          );
      }
      // Sanitize barcode
      const sanitizedBarcode = barcode.trim();
      if (!sanitizedBarcode) {
        return res
          .status(400)
          .json(createErrorResponse(400, "barcode cannot be empty"));
      }
      // Ensure barcode is a string
      const barcodeString = Array.isArray(sanitizedBarcode)
        ? sanitizedBarcode[0]
        : sanitizedBarcode;
      await removeFavorite(userId, barcodeString);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(`Remove favorite error for ${userId}:`, err);
      return res
        .status(500)
        .json(
          createErrorResponse(
            500,
            "Failed to remove favorite",
            (err as any)?.message,
          ),
        );
    }
  },
);

// ─── PROFILE ──────────────────────────────────────────────────────────────────

/**
 * GET /api/profile
 * Returns the authenticated user's profile. Returns null if not yet created.
 */
router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  try {
    const profile = await getProfile(userId);
    return res.status(200).json({ profile });
  } catch (err) {
    console.error(`Get profile error for ${userId}:`, err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * PUT /api/profile
 * Creates or updates the authenticated user's profile.
 * Body: { profile: UserProfile }
 */
router.put("/profile", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
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

// ─── PRODUCT LISTS ────────────────────────────────────────────────────────────

/**
 * GET /api/lists
 * Returns all product lists for the authenticated user.
 */
router.get("/lists", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  try {
    const lists = await getLists(userId);
    return res.status(200).json({ lists });
  } catch (err) {
    console.error(`Get lists error for ${userId}:`, err);
    return res.status(500).json({ error: "Failed to fetch lists" });
  }
});

/**
 * PUT /api/lists
 * Replaces all product lists for the authenticated user.
 * Body: { lists: ProductList[] }
 */
router.put("/lists", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
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

export default router;
