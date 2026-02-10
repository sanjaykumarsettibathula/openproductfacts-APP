import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SCAN_HISTORY: '@foodscan_history',
  LISTS: '@foodscan_lists',
  PROFILE: '@foodscan_profile',
  FAVORITES: '@foodscan_favorites',
};

export interface ScannedProduct {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  image_url: string;
  nutri_score: string;
  eco_score: string;
  nova_group: number;
  categories: string;
  ingredients_text: string;
  allergens: string[];
  nutrition: {
    energy_kcal: number;
    energy_kj: number;
    fat: number;
    saturated_fat: number;
    carbohydrates: number;
    sugars: number;
    fiber: number;
    protein: number;
    salt: number;
    sodium: number;
  };
  serving_size: string;
  quantity: string;
  packaging: string;
  origins: string;
  labels: string[];
  stores: string;
  countries: string;
  scanned_at: string;
}

export interface ProductList {
  id: string;
  name: string;
  description: string;
  color: string;
  products: ScannedProduct[];
  created_at: string;
}

export interface UserProfile {
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  allergies: string[];
  conditions: string[];
  dietary_restrictions: string[];
  notes: string;
}

export async function getScanHistory(): Promise<ScannedProduct[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SCAN_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function addToScanHistory(product: ScannedProduct): Promise<void> {
  const history = await getScanHistory();
  const filtered = history.filter(p => p.barcode !== product.barcode);
  const updated = [product, ...filtered].slice(0, 200);
  await AsyncStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify(updated));
}

export async function removeScanHistory(ids: string[]): Promise<void> {
  const history = await getScanHistory();
  const updated = history.filter(p => !ids.includes(p.id));
  await AsyncStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify(updated));
}

export async function clearScanHistory(): Promise<void> {
  await AsyncStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify([]));
}

export async function getLists(): Promise<ProductList[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.LISTS);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function saveLists(lists: ProductList[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.LISTS, JSON.stringify(lists));
}

export async function getFavorites(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function toggleFavorite(barcode: string): Promise<boolean> {
  const favs = await getFavorites();
  const isFav = favs.includes(barcode);
  const updated = isFav ? favs.filter(f => f !== barcode) : [...favs, barcode];
  await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated));
  return !isFav;
}

export async function getProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : getDefaultProfile();
  } catch { return getDefaultProfile(); }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

function getDefaultProfile(): UserProfile {
  return {
    name: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    allergies: [],
    conditions: [],
    dietary_restrictions: [],
    notes: '',
  };
}
