import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import {
  ScannedProduct,
  ProductList,
  UserProfile,
  AuthUser,
  getScanHistory,
  addToScanHistory,
  removeScanHistory,
  clearScanHistory,
  getLists,
  saveLists as localSaveLists,
  getProfile,
  saveProfile as localSaveProfile,
  getFavorites,
  toggleFavorite as localToggleFavorite,
  getAuthToken,
  getSavedAuthUser,
  clearAuthToken,
} from "./storage";
import { ProductWithMeta } from "./api";
import {
  login as apiLogin,
  syncAll,
  addScanHistory as apiAddScan,
  deleteScanItems,
  clearAllScans,
  toggleFavorite as apiToggleFavorite,
  removeFavorite as apiRemoveFavorite,
  saveProfile as apiSaveProfile,
  saveLists as apiSaveLists,
  verifyToken,
} from "./apiService";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DataContextValue {
  history: ScannedProduct[];
  lists: ProductList[];
  profile: UserProfile;
  favorites: string[];
  loading: boolean;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  // CRUD
  addScan: (product: ProductWithMeta) => Promise<void>;
  deleteScans: (ids: string[]) => Promise<void>;
  clearHistory: () => Promise<void>;
  createList: (
    name: string,
    description: string,
    color: string,
  ) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  updateList: (id: string, updates: Partial<ProductList>) => Promise<void>;
  addProductToList: (listId: string, product: ScannedProduct) => Promise<void>;
  removeProductFromList: (listId: string, productId: string) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  toggleFavorite: (barcode: string) => Promise<void>;
  isFavorite: (barcode: string) => boolean;
  refreshAll: () => Promise<void>;
  // Auth
  login: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const EMPTY_PROFILE: UserProfile = {
  name: "",
  age: "",
  gender: "",
  height: "",
  weight: "",
  allergies: [],
  conditions: [],
  dietary_restrictions: [],
  notes: "",
};

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<ScannedProduct[]>([]);
  const [lists, setLists] = useState<ProductList[]>([]);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // ── HELPERS ───────────────────────────────────────────────────────────────

  // Apply all server data to React state at once
  const applyServerData = useCallback(
    (data: {
      history: any[];
      lists: any[];
      profile: any | null;
      favorites: string[];
    }) => {
      setHistory(data.history ?? []);
      setLists(data.lists ?? []);
      setProfile(data.profile ?? EMPTY_PROFILE);
      setFavorites(data.favorites ?? []);
    },
    [],
  );

  // Wipe all data from state AND local AsyncStorage
  // Called on logout and before loading a different user's data
  const wipeAllData = useCallback(async () => {
    setHistory([]);
    setLists([]);
    setProfile(EMPTY_PROFILE);
    setFavorites([]);
    // Also clear local storage so offline fallback never shows stale data
    await Promise.all([
      clearScanHistory(),
      localSaveLists([]),
      localSaveProfile(EMPTY_PROFILE),
    ]);
  }, []);

  // ── STARTUP ───────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);

    const [token, user] = await Promise.all([
      getAuthToken(),
      getSavedAuthUser(),
    ]);

    if (token && user) {
      // Verify token hasn't expired before trusting it
      const stillValid = await verifyToken(token);
      if (!stillValid) {
        // Token expired — log out silently
        await clearAuthToken();
        setLoading(false);
        return;
      }

      setAuthToken(token);
      setCurrentUser(user);

      try {
        const serverData = await syncAll(token);
        applyServerData(serverData);
        console.log(
          `✅ Startup sync for "${user.email}": ` +
            `${serverData.history?.length ?? 0} scans, ` +
            `${serverData.lists?.length ?? 0} lists`,
        );
      } catch (err) {
        // Server unreachable — show empty state, not another user's local data
        console.warn("⚠️ Startup sync failed (offline?) — showing empty state");
        setHistory([]);
        setLists([]);
        setProfile(EMPTY_PROFILE);
        setFavorites([]);
      }
    } else {
      // Not authenticated — load local data for guest mode
      const [h, l, p, f] = await Promise.all([
        getScanHistory(),
        getLists(),
        getProfile(),
        getFavorites(),
      ]);
      setHistory(h);
      setLists(l);
      setProfile(p);
      setFavorites(f);
    }

    setLoading(false);
  }, [applyServerData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── AUTH ──────────────────────────────────────────────────────────────────

  const loginFn = useCallback(
    async (email: string, password: string, username?: string) => {
      // Step 1: Wipe current user's data from state + local storage
      // This prevents previous user's data from momentarily being visible
      await wipeAllData();

      // Step 2: Authenticate and get token
      const data = await apiLogin(email, password, username);
      // apiLogin already called saveAuthToken + saveAuthUser internally

      setAuthToken(data.token);
      setCurrentUser(data.user);

      // Step 3: Load this user's data from MongoDB
      try {
        const serverData = await syncAll(data.token);
        applyServerData(serverData);
        console.log(
          `✅ Login sync for "${data.user.email}": ` +
            `${serverData.history?.length ?? 0} scans ` +
            `(${data.isNewUser ? "new user" : "existing user"})`,
        );
      } catch (err) {
        console.error("⚠️ Post-login sync failed:", err);
        // Stay with empty state — user can retry via refreshAll
      }
    },
    [wipeAllData, applyServerData],
  );

  const logoutFn = useCallback(async () => {
    // 1. Clear auth from local storage
    await clearAuthToken();
    // 2. Clear auth from state
    setAuthToken(null);
    setCurrentUser(null);
    // 3. Wipe ALL data — state + local storage
    // Without this, the next user who opens the app could see previous user's data
    await wipeAllData();
    console.log("✅ Logged out — all user data cleared");
  }, [wipeAllData]);

  // ── SCAN HISTORY ──────────────────────────────────────────────────────────

  const addScan = useCallback(
    async (product: ProductWithMeta) => {
      if (authToken) {
        await apiAddScan(authToken, product);
        setHistory((prev) => {
          const filtered = prev.filter((p) => p.barcode !== product.barcode);
          return [product as ScannedProduct, ...filtered].slice(0, 200);
        });
      } else {
        await addToScanHistory(product);
        setHistory((prev) => {
          const filtered = prev.filter((p) => p.barcode !== product.barcode);
          return [product as ScannedProduct, ...filtered].slice(0, 200);
        });
      }
    },
    [authToken],
  );

  const deleteScans = useCallback(
    async (ids: string[]) => {
      if (authToken) {
        await deleteScanItems(authToken, ids);
        setHistory((prev) => prev.filter((p) => !ids.includes(p.id)));
      } else {
        await removeScanHistory(ids);
        setHistory((prev) => prev.filter((p) => !ids.includes(p.id)));
      }
    },
    [authToken],
  );

  const clearHistoryFn = useCallback(async () => {
    if (authToken) {
      await clearAllScans(authToken);
      setHistory([]);
    } else {
      await clearScanHistory();
      setHistory([]);
    }
  }, [authToken]);

  // ── PRODUCT LISTS ─────────────────────────────────────────────────────────

  const createList = useCallback(
    async (name: string, description: string, color: string) => {
      const newList: ProductList = {
        id: generateId(),
        name,
        description,
        color,
        products: [],
        created_at: new Date().toISOString(),
      };
      const updated = [...lists, newList];
      if (authToken) {
        await apiSaveLists(authToken, updated);
        setLists(updated);
      } else {
        await localSaveLists(updated);
        setLists(updated);
      }
    },
    [lists, authToken],
  );

  const deleteList = useCallback(
    async (id: string) => {
      const updated = lists.filter((l) => l.id !== id);
      if (authToken) {
        await apiSaveLists(authToken, updated);
        setLists(updated);
      } else {
        await localSaveLists(updated);
        setLists(updated);
      }
    },
    [lists, authToken],
  );

  const updateList = useCallback(
    async (id: string, updates: Partial<ProductList>) => {
      const updated = lists.map((l) =>
        l.id === id ? { ...l, ...updates } : l,
      );
      if (authToken) {
        await apiSaveLists(authToken, updated);
        setLists(updated);
      } else {
        await localSaveLists(updated);
        setLists(updated);
      }
    },
    [lists, authToken],
  );

  const addProductToList = useCallback(
    async (listId: string, product: ScannedProduct) => {
      const updated = lists.map((l) => {
        if (l.id !== listId) return l;
        if (l.products.some((p) => p.barcode === product.barcode)) return l;
        return { ...l, products: [...l.products, product] };
      });
      if (authToken) {
        await apiSaveLists(authToken, updated);
        setLists(updated);
      } else {
        await localSaveLists(updated);
        setLists(updated);
      }
    },
    [lists, authToken],
  );

  const removeProductFromList = useCallback(
    async (listId: string, productId: string) => {
      const updated = lists.map((l) => {
        if (l.id !== listId) return l;
        return { ...l, products: l.products.filter((p) => p.id !== productId) };
      });
      if (authToken) {
        await apiSaveLists(authToken, updated);
        setLists(updated);
      } else {
        await localSaveLists(updated);
        setLists(updated);
      }
    },
    [lists, authToken],
  );

  // ── PROFILE ───────────────────────────────────────────────────────────────

  const updateProfileFn = useCallback(
    async (p: UserProfile) => {
      if (authToken) {
        await apiSaveProfile(authToken, p);
        setProfile(p);
      } else {
        await localSaveProfile(p);
        setProfile(p);
      }
    },
    [authToken],
  );

  // ── FAVORITES ─────────────────────────────────────────────────────────────

  const toggleFavoriteFn = useCallback(
    async (barcode: string) => {
      if (authToken) {
        // Server returns the new state: true = now a favorite
        const nowFav = await apiToggleFavorite(authToken, barcode);
        setFavorites((prev) =>
          nowFav
            ? prev.includes(barcode)
              ? prev
              : [...prev, barcode]
            : prev.filter((b) => b !== barcode),
        );
      } else {
        await localToggleFavorite(barcode);
        setFavorites((prev) =>
          prev.includes(barcode)
            ? prev.filter((b) => b !== barcode)
            : [...prev, barcode],
        );
      }
    },
    [authToken],
  );

  const isFavorite = useCallback(
    (barcode: string) => favorites.includes(barcode),
    [favorites],
  );

  // ── VALUE ─────────────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      history,
      lists,
      profile,
      favorites,
      loading,
      currentUser,
      isAuthenticated: !!currentUser,
      addScan,
      deleteScans,
      clearHistory: clearHistoryFn,
      createList,
      deleteList,
      updateList,
      addProductToList,
      removeProductFromList,
      updateProfile: updateProfileFn,
      toggleFavorite: toggleFavoriteFn,
      isFavorite,
      refreshAll: loadAll,
      login: loginFn,
      logout: logoutFn,
    }),
    [
      history,
      lists,
      profile,
      favorites,
      loading,
      currentUser,
      addScan,
      deleteScans,
      clearHistoryFn,
      createList,
      deleteList,
      updateList,
      addProductToList,
      removeProductFromList,
      updateProfileFn,
      toggleFavoriteFn,
      isFavorite,
      loadAll,
      loginFn,
      logoutFn,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
