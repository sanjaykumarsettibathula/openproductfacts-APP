/**
 * lib/apiService.ts
 *
 * All HTTP communication with the backend lives here.
 * DataContext imports ONLY from this file for server calls.
 * No fetch() calls exist anywhere else in the client codebase.
 */

import {
  saveAuthToken,
  saveAuthUser,
  clearAuthToken,
  AuthUser,
} from "./storage";

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

// ─── BASE REQUEST ─────────────────────────────────────────────────────────────

async function request<T = any>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") {
      throw new Error("Request timed out — check your network connection");
    }
    throw new Error(`Network error: ${err?.message || "Unknown"}`);
  }
  clearTimeout(timeout);

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object"
        ? body?.error || body?.message || "Request failed"
        : String(body);
    throw new Error(message);
  }

  return body as T;
}

// ─── AUTH TYPES ───────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: AuthUser;
  isNewUser: boolean;
}

export interface SyncData {
  history: any[];
  lists: any[];
  profile: any | null;
  favorites: string[];
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * login()
 * Single endpoint handles both login and registration.
 * If email exists → login. If not → register.
 */
export async function login(
  email: string,
  password: string,
  username?: string,
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      username: username?.trim(),
    }),
  });
  // Persist token and user locally for session restoration on next app open
  await saveAuthToken(data.token);
  await saveAuthUser(data.user);
  return data;
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await request("/api/auth/verify", { token });
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  await clearAuthToken();
}

// ─── SYNC ─────────────────────────────────────────────────────────────────────

/**
 * syncAll()
 * Fetches all user data in one request.
 * Called after login and on cold start.
 */
export async function syncAll(token: string): Promise<SyncData> {
  return request<SyncData>("/api/sync", { token });
}

// ─── SCAN HISTORY ─────────────────────────────────────────────────────────────

export async function addScanHistory(
  token: string,
  product: any,
): Promise<void> {
  await request("/api/scan-history", {
    method: "POST",
    token,
    body: JSON.stringify({ product }),
  });
}

export async function deleteScanItem(
  token: string,
  productId: string,
): Promise<void> {
  await request(`/api/scan-history/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    token,
  });
}

export async function deleteScanItems(
  token: string,
  ids: string[],
): Promise<void> {
  await request("/api/scan-history", {
    method: "DELETE",
    token,
    body: JSON.stringify({ ids }),
  });
}

export async function clearAllScans(token: string): Promise<void> {
  await request("/api/scan-history", {
    method: "DELETE",
    token,
    body: JSON.stringify({}), // empty body → clears all
  });
}

// ─── FAVORITES ────────────────────────────────────────────────────────────────

export async function getFavorites(token: string): Promise<string[]> {
  const data = await request<{ barcodes: string[] }>("/api/favorites", {
    token,
  });
  return data.barcodes;
}

export async function toggleFavorite(
  token: string,
  barcode: string,
): Promise<boolean> {
  const data = await request<{ isFavorite: boolean }>("/api/favorites", {
    method: "POST",
    token,
    body: JSON.stringify({ barcode }),
  });
  return data.isFavorite;
}

export async function removeFavorite(
  token: string,
  barcode: string,
): Promise<void> {
  await request(`/api/favorites/${encodeURIComponent(barcode)}`, {
    method: "DELETE",
    token,
  });
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

export async function saveProfile(token: string, profile: any): Promise<void> {
  await request("/api/profile", {
    method: "PUT",
    token,
    body: JSON.stringify({ profile }),
  });
}

// ─── PRODUCT LISTS ────────────────────────────────────────────────────────────

export async function saveLists(token: string, lists: any[]): Promise<void> {
  await request("/api/lists", {
    method: "PUT",
    token,
    body: JSON.stringify({ lists }),
  });
}
