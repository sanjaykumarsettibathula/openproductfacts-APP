import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  ScannedProduct, ProductList, UserProfile,
  getScanHistory, addToScanHistory, removeScanHistory, clearScanHistory,
  getLists, saveLists,
  getProfile, saveProfile,
  getFavorites, toggleFavorite as toggleFav,
} from './storage';

interface DataContextValue {
  history: ScannedProduct[];
  lists: ProductList[];
  profile: UserProfile;
  favorites: string[];
  loading: boolean;
  addScan: (product: ScannedProduct) => Promise<void>;
  deleteScans: (ids: string[]) => Promise<void>;
  clearHistory: () => Promise<void>;
  createList: (name: string, description: string, color: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  updateList: (id: string, updates: Partial<ProductList>) => Promise<void>;
  addProductToList: (listId: string, product: ScannedProduct) => Promise<void>;
  removeProductFromList: (listId: string, productId: string) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  toggleFavorite: (barcode: string) => Promise<void>;
  isFavorite: (barcode: string) => boolean;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<ScannedProduct[]>([]);
  const [lists, setLists] = useState<ProductList[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    name: '', age: '', gender: '', height: '', weight: '',
    allergies: [], conditions: [], dietary_restrictions: [], notes: '',
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [h, l, p, f] = await Promise.all([
      getScanHistory(), getLists(), getProfile(), getFavorites(),
    ]);
    setHistory(h);
    setLists(l);
    setProfile(p);
    setFavorites(f);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addScan = useCallback(async (product: ScannedProduct) => {
    await addToScanHistory(product);
    setHistory(prev => {
      const filtered = prev.filter(p => p.barcode !== product.barcode);
      return [product, ...filtered].slice(0, 200);
    });
  }, []);

  const deleteScans = useCallback(async (ids: string[]) => {
    await removeScanHistory(ids);
    setHistory(prev => prev.filter(p => !ids.includes(p.id)));
  }, []);

  const clearHistoryFn = useCallback(async () => {
    await clearScanHistory();
    setHistory([]);
  }, []);

  const createList = useCallback(async (name: string, description: string, color: string) => {
    const newList: ProductList = {
      id: generateId(), name, description, color, products: [],
      created_at: new Date().toISOString(),
    };
    const updated = [...lists, newList];
    await saveLists(updated);
    setLists(updated);
  }, [lists]);

  const deleteList = useCallback(async (id: string) => {
    const updated = lists.filter(l => l.id !== id);
    await saveLists(updated);
    setLists(updated);
  }, [lists]);

  const updateList = useCallback(async (id: string, updates: Partial<ProductList>) => {
    const updated = lists.map(l => l.id === id ? { ...l, ...updates } : l);
    await saveLists(updated);
    setLists(updated);
  }, [lists]);

  const addProductToList = useCallback(async (listId: string, product: ScannedProduct) => {
    const updated = lists.map(l => {
      if (l.id === listId) {
        const exists = l.products.some(p => p.barcode === product.barcode);
        if (!exists) return { ...l, products: [...l.products, product] };
      }
      return l;
    });
    await saveLists(updated);
    setLists(updated);
  }, [lists]);

  const removeProductFromList = useCallback(async (listId: string, productId: string) => {
    const updated = lists.map(l => {
      if (l.id === listId) {
        return { ...l, products: l.products.filter(p => p.id !== productId) };
      }
      return l;
    });
    await saveLists(updated);
    setLists(updated);
  }, [lists]);

  const updateProfileFn = useCallback(async (p: UserProfile) => {
    await saveProfile(p);
    setProfile(p);
  }, []);

  const toggleFavoriteFn = useCallback(async (barcode: string) => {
    await toggleFav(barcode);
    setFavorites(prev =>
      prev.includes(barcode) ? prev.filter(f => f !== barcode) : [...prev, barcode]
    );
  }, []);

  const isFavorite = useCallback((barcode: string) => favorites.includes(barcode), [favorites]);

  const value = useMemo(() => ({
    history, lists, profile, favorites, loading,
    addScan, deleteScans, clearHistory: clearHistoryFn,
    createList, deleteList, updateList, addProductToList, removeProductFromList,
    updateProfile: updateProfileFn, toggleFavorite: toggleFavoriteFn, isFavorite,
    refreshAll: loadAll,
  }), [history, lists, profile, favorites, loading, addScan, deleteScans, clearHistoryFn,
    createList, deleteList, updateList, addProductToList, removeProductFromList,
    updateProfileFn, toggleFavoriteFn, isFavorite, loadAll]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
