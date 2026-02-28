import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import type { JwtPayload } from "../Types";

// JWT_SECRET is imported here — NOT hardcoded
// Exported so routes.ts can use the same value for signing
export const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("❌ JWT_SECRET must be set in environment variables");
  }
  return secret;
})();

export const JWT_EXPIRES_IN = "30d";

// Extends Express Request with verified userId and email from JWT
// userId is ALWAYS a string after this middleware runs — never undefined
export interface AuthRequest extends Request {
  userId: string;
  userEmail: string;
}

/**
 * requireAuth middleware
 *
 * - Reads the Bearer token from the Authorization header
 * - Verifies the JWT using JWT_SECRET
 * - Extracts userId and email from the payload
 * - Attaches them to req as req.userId and req.userEmail
 * - NEVER reads userId from req.body or req.query
 *
 * If verification fails → 401, request stops here
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error:
        "Authorization header missing or malformed. Expected: Bearer <token>",
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    res.status(401).json({ error: "Token is empty" });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      res
        .status(401)
        .json({ error: "Token has expired. Please log in again." });
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

  // Attach to request — downstream handlers read from here, never from body
  (req as AuthRequest).userId = payload.userId;
  (req as AuthRequest).userEmail = payload.email;

  next();
}
