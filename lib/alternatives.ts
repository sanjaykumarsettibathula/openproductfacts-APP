import { ScannedProduct } from "./storage";

const OPENFOODFACTS_API = "https://world.openfoodfacts.org/api/v2";

export interface AlternativeProduct {
  barcode: string;
  name: string;
  brand: string;
  image_url: string;
  nutri_score: string;
  nova_group: number;
  reason: string;
}

/**
 * Extract main product type (remove brand, size, flavor)
 * Example: "Cadbury Dairy Milk Chocolate 100g" → "chocolate"
 */
function extractProductType(product: ScannedProduct): string {
  const name = product.name.toLowerCase();
  const categories = product.categories.toLowerCase();

  // Common product types to look for
  const productTypes = [
    "chocolate",
    "cookies",
    "biscuits",
    "chips",
    "crisps",
    "soda",
    "cola",
    "juice",
    "water",
    "energy drink",
    "ice cream",
    "yogurt",
    "milk",
    "cheese",
    "noodles",
    "pasta",
    "cereal",
    "bread",
    "candy",
    "gummies",
    "snack bar",
    "coffee",
    "tea",
  ];

  // Check name first
  for (const type of productTypes) {
    if (name.includes(type)) {
      return type;
    }
  }

  // Check categories
  for (const type of productTypes) {
    if (categories.includes(type)) {
      return type;
    }
  }

  // Try to extract from categories field
  if (categories.includes("beverages")) return "beverage";
  if (categories.includes("snacks")) return "snack";
  if (categories.includes("dairy")) return "dairy";
  if (categories.includes("sweets")) return "candy";

  console.warn(`⚠️ Could not extract product type from: ${product.name}`);
  return "snack"; // fallback
}

/**
 * Generate smart search queries based on the actual product
 * This is DYNAMIC, not static!
 */
function generateSmartSearchQueries(product: ScannedProduct): string[] {
  const queries: string[] = [];
  const brand = product.brand.toLowerCase();
  const name = product.name.toLowerCase();
  const productType = extractProductType(product);

  console.log(`🔍 Product analysis:
    Brand: ${brand}
    Name: ${name}
    Type: ${productType}`);

  // Strategy 1: Same brand, healthier versions
  // Example: "Cadbury Dairy Milk" → "Cadbury dark chocolate"
  if (brand && brand !== "unknown brand") {
    queries.push(`${brand} ${productType} low sugar`);
    queries.push(`${brand} ${productType} reduced fat`);
    queries.push(`${brand} ${productType} light`);
  }

  // Strategy 2: Same product type, but healthier keywords
  queries.push(`${productType} low sugar`);
  queries.push(`${productType} reduced fat`);
  queries.push(`${productType} organic`);
  queries.push(`${productType} natural`);
  queries.push(`${productType} whole grain`);

  // Strategy 3: Category-specific healthier terms
  if (productType.includes("chocolate")) {
    queries.push("dark chocolate 70%");
    queries.push("dark chocolate 85%");
    queries.push("sugar-free chocolate");
  } else if (productType.includes("cola") || productType.includes("soda")) {
    queries.push("zero sugar cola");
    queries.push("diet soda");
    queries.push("stevia soda");
  } else if (productType.includes("chips") || productType.includes("crisps")) {
    queries.push("baked chips");
    queries.push("vegetable chips");
    queries.push("lentil chips");
  } else if (
    productType.includes("cookies") ||
    productType.includes("biscuits")
  ) {
    queries.push("oat cookies");
    queries.push("whole wheat biscuits");
    queries.push("digestive biscuits");
  } else if (productType.includes("ice cream")) {
    queries.push("low fat ice cream");
    queries.push("frozen yogurt");
  } else if (productType.includes("juice")) {
    queries.push("100% juice no sugar");
    queries.push("fresh pressed juice");
  }

  // Remove duplicates
  const uniqueQueries = [...new Set(queries)];
  console.log(
    `📋 Generated ${uniqueQueries.length} search queries:`,
    uniqueQueries.slice(0, 5),
  );

  return uniqueQueries.slice(0, 8); // Limit to 8 searches max
}

/**
 * Check if two products are in the same category
 * This prevents water bottles appearing for chocolate searches!
 */
function isSameCategory(
  originalProduct: ScannedProduct,
  alternativeProduct: any,
): boolean {
  const origType = extractProductType(originalProduct);
  const origCategories = originalProduct.categories.toLowerCase();

  const altName = (
    alternativeProduct.product_name ||
    alternativeProduct.product_name_en ||
    ""
  ).toLowerCase();
  const altCategories = (alternativeProduct.categories || "").toLowerCase();

  // Direct product type match
  if (altName.includes(origType) || altCategories.includes(origType)) {
    return true;
  }

  // Category-based matching
  const categoryGroups = [
    ["chocolate", "candy", "sweets", "confectionery"],
    ["cola", "soda", "carbonated", "soft drink", "beverage"],
    ["chips", "crisps", "snacks"],
    ["cookies", "biscuits"],
    ["juice", "fruit drink"],
    ["water", "mineral water"],
    ["ice cream", "frozen dessert"],
    ["yogurt", "dairy"],
    ["noodles", "pasta"],
    ["cereal", "breakfast"],
  ];

  for (const group of categoryGroups) {
    const origInGroup = group.some(
      (term) => origType.includes(term) || origCategories.includes(term),
    );
    const altInGroup = group.some(
      (term) => altName.includes(term) || altCategories.includes(term),
    );

    if (origInGroup && altInGroup) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate health score (higher = healthier)
 */
function calculateHealthScore(product: any): number {
  let score = 0;

  // Nutri-Score
  const nutriScore = product.nutriscore_grade?.toUpperCase();
  if (nutriScore === "A") score += 50;
  else if (nutriScore === "B") score += 35;
  else if (nutriScore === "C") score += 20;
  else if (nutriScore === "D") score += 5;

  // NOVA group
  const nova = product.nova_group || 4;
  if (nova === 1) score += 30;
  else if (nova === 2) score += 20;
  else if (nova === 3) score += 5;

  // Nutrition values
  const n = product.nutriments || {};

  const sugar = n.sugars_100g || 0;
  if (sugar < 5) score += 15;
  else if (sugar < 10) score += 8;

  const satFat = n["saturated-fat_100g"] || 0;
  if (satFat < 2) score += 10;
  else if (satFat < 5) score += 5;

  const sodium = n.sodium_100g || 0;
  if (sodium < 0.2) score += 10;
  else if (sodium < 0.4) score += 5;

  const fiber = n.fiber_100g || 0;
  if (fiber > 6) score += 10;
  else if (fiber > 3) score += 5;

  const protein = n.proteins_100g || 0;
  if (protein > 15) score += 10;
  else if (protein > 10) score += 5;

  // Organic label
  const labels = (product.labels_tags || []).join(" ").toLowerCase();
  if (labels.includes("organic") || labels.includes("bio")) score += 15;

  return score;
}

/**
 * Determine improvement reason
 */
function getImprovementReason(
  original: ScannedProduct,
  alternative: any,
): string {
  const origNutri = original.nutri_score?.toUpperCase();
  const altNutri = alternative.nutriscore_grade?.toUpperCase();

  if (altNutri && origNutri && altNutri < origNutri) {
    return `Better Nutri-Score (${altNutri})`;
  }

  const origNova = original.nova_group || 4;
  const altNova = alternative.nova_group || 4;
  if (altNova < origNova) {
    return "Less processed";
  }

  const origSugar = original.nutrition.sugars;
  const altSugar = alternative.nutriments?.sugars_100g || 0;
  if (origSugar > 10 && altSugar < origSugar * 0.7) {
    return `${Math.round(((origSugar - altSugar) / origSugar) * 100)}% less sugar`;
  }

  const origFat = original.nutrition.saturated_fat;
  const altFat = alternative.nutriments?.["saturated-fat_100g"] || 0;
  if (origFat > 5 && altFat < origFat * 0.7) {
    return "Lower saturated fat";
  }

  const labels = (alternative.labels_tags || []).join(" ").toLowerCase();
  if (labels.includes("organic") || labels.includes("bio")) {
    return "Organic ingredients";
  }

  return "Healthier option";
}

/**
 * Search for healthier alternatives - COMPLETELY DYNAMIC!
 */
export async function searchHealthierAlternatives(
  product: ScannedProduct,
): Promise<AlternativeProduct[]> {
  try {
    console.log(`🔍 Searching alternatives for: ${product.name}`);

    // Generate dynamic search queries based on THIS product
    const queries = generateSmartSearchQueries(product);

    const allResults: any[] = [];

    for (const query of queries) {
      try {
        const url = `${OPENFOODFACTS_API}/search?search_terms=${encodeURIComponent(query)}&page=1&page_size=15&json=1&fields=code,product_name,product_name_en,brands,image_url,image_front_url,nutriments,nutriscore_grade,nova_group,labels_tags,categories`;

        const response = await fetch(url);
        if (!response.ok) continue;

        const data = await response.json();
        if (data.products && data.products.length > 0) {
          allResults.push(...data.products);
        }
      } catch (err) {
        console.warn(`Failed to search "${query}":`, err);
      }
    }

    if (allResults.length === 0) {
      console.log("❌ No alternatives found");
      return [];
    }

    console.log(`✅ Found ${allResults.length} potential alternatives`);

    // Calculate original score
    const originalScore = calculateHealthScore({
      nutriscore_grade: product.nutri_score,
      nova_group: product.nova_group,
      nutriments: {
        sugars_100g: product.nutrition.sugars,
        "saturated-fat_100g": product.nutrition.saturated_fat,
        sodium_100g: product.nutrition.sodium,
        fiber_100g: product.nutrition.fiber,
        proteins_100g: product.nutrition.protein,
      },
    });

    // Filter and score alternatives
    const scoredAlternatives = allResults
      .filter((alt) => {
        // Must have name
        if (!alt.product_name && !alt.product_name_en) return false;

        // Must not be the same product
        if (alt.code === product.barcode) return false;

        // Must have nutrition data
        if (!alt.nutriments) return false;

        // 🔥 CRITICAL: Must be in the same category!
        if (!isSameCategory(product, alt)) {
          console.log(
            `❌ Rejected (wrong category): ${alt.product_name || alt.product_name_en}`,
          );
          return false;
        }

        // Must be healthier
        const altScore = calculateHealthScore(alt);
        return altScore > originalScore + 20;
      })
      .map((alt) => ({
        product: alt,
        score: calculateHealthScore(alt),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const alternatives: AlternativeProduct[] = scoredAlternatives.map(
      ({ product: alt }) => ({
        barcode: alt.code || "",
        name: alt.product_name || alt.product_name_en || "Unknown Product",
        brand: alt.brands || "",
        image_url: alt.image_url || alt.image_front_url || "",
        nutri_score: alt.nutriscore_grade?.toUpperCase() || "unknown",
        nova_group: alt.nova_group || 0,
        reason: getImprovementReason(product, alt),
      }),
    );

    console.log(`✅ Returning ${alternatives.length} alternatives`);
    alternatives.forEach((alt, i) => {
      console.log(`  ${i + 1}. ${alt.name} (${alt.brand}) - ${alt.reason}`);
    });

    return alternatives;
  } catch (err) {
    console.error("❌ searchHealthierAlternatives failed:", err);
    return [];
  }
}
