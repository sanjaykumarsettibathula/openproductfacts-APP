import { ObjectId } from "mongodb";

// ─── USER ─────────────────────────────────────────────────────────────────────

export interface UserDoc {
  _id?: ObjectId;
  userId: string; // UUID — app-level ID embedded in JWT
  email: string; // unique, lowercase
  passwordHash: string;
  username?: string;
  createdAt: string;
}

export interface PublicUser {
  userId: string;
  email: string;
  username?: string;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// ─── SCAN HISTORY ─────────────────────────────────────────────────────────────

export interface ScanHistoryDoc {
  _id?: ObjectId;
  userId: string;
  barcode: string;
  product: any; // ScannedProduct shape from lib/storage.ts
  scanned_at: string;
}

// ─── PRODUCT LISTS ────────────────────────────────────────────────────────────

export interface ProductListDoc {
  _id?: ObjectId;
  userId: string;
  listId: string; // app-level list ID
  list: any; // ProductList shape from lib/storage.ts
  created_at: string;
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

export interface ProfileDoc {
  _id?: ObjectId;
  userId: string;
  profile: any; // UserProfile shape from lib/storage.ts
  updatedAt: string;
}

// ─── FAVORITES ────────────────────────────────────────────────────────────────

export interface FavoritesDoc {
  _id?: ObjectId;
  userId: string;
  barcodes: string[];
  updatedAt: string;
}
