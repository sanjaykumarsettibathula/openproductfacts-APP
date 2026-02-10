import { ScannedProduct } from './storage';

const OFF_API = 'https://world.openfoodfacts.org/api/v2';

interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  nova_group?: number;
  categories?: string;
  ingredients_text?: string;
  allergens_tags?: string[];
  allergens?: string;
  nutriments?: Record<string, number>;
  serving_size?: string;
  quantity?: string;
  packaging?: string;
  origins?: string;
  labels_tags?: string[];
  labels?: string;
  stores?: string;
  countries?: string;
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function parseAllergens(product: OFFProduct): string[] {
  const allergens: string[] = [];
  if (product.allergens_tags) {
    product.allergens_tags.forEach(tag => {
      const name = tag.replace('en:', '').replace(/-/g, ' ');
      if (name) allergens.push(name.charAt(0).toUpperCase() + name.slice(1));
    });
  } else if (product.allergens) {
    product.allergens.split(',').forEach(a => {
      const trimmed = a.trim();
      if (trimmed) allergens.push(trimmed);
    });
  }
  return allergens;
}

function parseLabels(product: OFFProduct): string[] {
  if (product.labels_tags) {
    return product.labels_tags.map(t => t.replace('en:', '').replace(/-/g, ' '));
  }
  if (product.labels) {
    return product.labels.split(',').map(l => l.trim()).filter(Boolean);
  }
  return [];
}

export function mapOFFProduct(data: OFFProduct): ScannedProduct {
  const n = data.nutriments || {};
  return {
    id: generateId(),
    barcode: data.code || '',
    name: data.product_name || 'Unknown Product',
    brand: data.brands || 'Unknown Brand',
    image_url: data.image_front_url || data.image_url || '',
    nutri_score: data.nutriscore_grade?.toUpperCase() || 'unknown',
    eco_score: data.ecoscore_grade?.toUpperCase() || 'unknown',
    nova_group: data.nova_group || 0,
    categories: data.categories || '',
    ingredients_text: data.ingredients_text || '',
    allergens: parseAllergens(data),
    nutrition: {
      energy_kcal: n['energy-kcal_100g'] || n['energy-kcal'] || 0,
      energy_kj: n['energy-kj_100g'] || n['energy-kj'] || n['energy_100g'] || 0,
      fat: n['fat_100g'] || n['fat'] || 0,
      saturated_fat: n['saturated-fat_100g'] || n['saturated-fat'] || 0,
      carbohydrates: n['carbohydrates_100g'] || n['carbohydrates'] || 0,
      sugars: n['sugars_100g'] || n['sugars'] || 0,
      fiber: n['fiber_100g'] || n['fiber'] || 0,
      protein: n['proteins_100g'] || n['proteins'] || 0,
      salt: n['salt_100g'] || n['salt'] || 0,
      sodium: n['sodium_100g'] || n['sodium'] || 0,
    },
    serving_size: data.serving_size || '',
    quantity: data.quantity || '',
    packaging: data.packaging || '',
    origins: data.origins || '',
    labels: parseLabels(data),
    stores: data.stores || '',
    countries: data.countries || '',
    scanned_at: new Date().toISOString(),
  };
}

export async function fetchProductByBarcode(barcode: string): Promise<ScannedProduct | null> {
  try {
    const response = await fetch(`${OFF_API}/product/${barcode}.json`, {
      headers: { 'User-Agent': 'FoodScanAI/1.0 (mobile)' },
    });
    const data = await response.json();
    if (data.status === 1 && data.product) {
      return mapOFFProduct({ ...data.product, code: barcode });
    }
    return null;
  } catch {
    return null;
  }
}

export async function searchProducts(query: string, page: number = 1): Promise<{ products: ScannedProduct[]; count: number }> {
  try {
    const response = await fetch(
      `${OFF_API}/search?search_terms=${encodeURIComponent(query)}&page=${page}&page_size=20&json=1`,
      { headers: { 'User-Agent': 'FoodScanAI/1.0 (mobile)' } }
    );
    const data = await response.json();
    if (data.products) {
      return {
        products: data.products.map((p: OFFProduct) => mapOFFProduct(p)),
        count: data.count || 0,
      };
    }
    return { products: [], count: 0 };
  } catch {
    return { products: [], count: 0 };
  }
}
