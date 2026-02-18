import { ScannedProduct } from "./storage";

const OPENFOODFACTS_API = "https://world.openfoodfacts.org/api/v2";

const GEMINI_TEXT_MODEL = "gemini-2.0-flash-lite";
const GEMINI_VISION_MODEL = "gemini-2.0-flash-lite";
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const CONFIDENCE_HIGH = 0.75;
export const CONFIDENCE_MEDIUM = 0.4;

export interface SearchResult {
  products: ScannedProduct[];
  count: number;
  page: number;
}

export interface ProductWithMeta extends ScannedProduct {
  ai_confidence?: number;
  data_source: "off" | "ai" | "ai_partial" | "image" | "history";
  uncertain_fields?: Array<keyof ScannedProduct>;
}

// --------------------------------------------------------------------------
// HERMES-SAFE FETCH WITH TIMEOUT
// React Native / Hermes does NOT support AbortSignal.timeout() — it crashes.
// Use AbortController + setTimeout instead, which works everywhere.
// --------------------------------------------------------------------------
function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 6000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

// --------------------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------------------

function safeParseJSON(raw: string): any | null {
  // Strip markdown fences
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Attempt 1: clean parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Attempt 2: extract outermost {...} block
  const braceMatch = cleaned.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {}
  }

  // Attempt 3: truncated JSON recovery
  // LLM response cut mid-string by maxOutputTokens — repair and re-parse
  const text = braceMatch?.[0] ?? cleaned;
  try {
    let opens = 0,
      openSquare = 0;
    let inStr = false,
      escape = false;
    for (const ch of text) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (ch === "{") opens++;
      else if (ch === "}") opens--;
      else if (ch === "[") openSquare++;
      else if (ch === "]") openSquare--;
    }
    let repaired = text.trimEnd();
    if (inStr) repaired += '"';
    repaired = repaired.replace(/,\s*$/, "");
    for (let i = 0; i < openSquare; i++) repaired += "]";
    for (let i = 0; i < opens; i++) repaired += "}";
    const recovered = JSON.parse(repaired);
    console.warn("Recovered truncated JSON");
    return recovered;
  } catch {
    return null;
  }
}

function normaliseScore(val: any): "A" | "B" | "C" | "D" | "E" | "unknown" {
  if (!val) return "unknown";
  const upper = String(val).toUpperCase().trim().charAt(0);
  return (["A", "B", "C", "D", "E"].includes(upper) ? upper : "unknown") as
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "unknown";
}

/**
 * Estimate Eco-Score when not available in OFF database.
 * Based on: packaging, transportation distance, processing level (NOVA).
 * This is an approximation — real Eco-Score uses LCA (Life Cycle Assessment).
 */
function estimateEcoScore(
  product: any,
): "A" | "B" | "C" | "D" | "E" | "unknown" {
  let score = 50; // Start neutral (C grade)

  // NOVA processing penalty
  const nova = product.nova_group || 0;
  if (nova === 4)
    score -= 20; // Ultra-processed = high environmental impact
  else if (nova === 3) score -= 10;
  else if (nova === 1) score += 10; // Unprocessed = low impact

  // Packaging analysis
  const packaging = (product.packaging || "").toLowerCase();
  if (packaging.includes("plastic")) score -= 15;
  else if (packaging.includes("aluminum") || packaging.includes("can"))
    score -= 10;
  else if (packaging.includes("glass")) score -= 5;
  else if (packaging.includes("cardboard") || packaging.includes("paper"))
    score += 5;

  // Origins/transportation
  const origins = (product.origins || "").toLowerCase();
  const categories = (product.categories || "").toLowerCase();

  // Local/regional products score better
  if (
    origins.includes("france") ||
    origins.includes("europe") ||
    origins.includes("local")
  ) {
    score += 10;
  }
  // Long-distance imports (air freight)
  if (
    origins.includes("asia") ||
    origins.includes("america") ||
    origins.includes("australia")
  ) {
    score -= 10;
  }

  // Animal products have higher carbon footprint
  if (
    categories.includes("meat") ||
    categories.includes("beef") ||
    categories.includes("lamb")
  ) {
    score -= 20;
  } else if (categories.includes("dairy") || categories.includes("cheese")) {
    score -= 10;
  } else if (
    categories.includes("plant-based") ||
    categories.includes("vegan")
  ) {
    score += 10;
  }

  // Organic/sustainable labels
  const labels = (product.labels_tags || []).join(" ").toLowerCase();
  if (labels.includes("organic") || labels.includes("bio")) score += 15;
  if (labels.includes("fair-trade")) score += 5;
  if (labels.includes("sustainable")) score += 10;

  // Convert score to letter grade
  // Scale: 0-20=E, 21-40=D, 41-60=C, 61-80=B, 81-100=A
  if (score >= 81) return "A";
  if (score >= 61) return "B";
  if (score >= 41) return "C";
  if (score >= 21) return "D";
  return "E";
}

/**
 * Get ingredients in English, falling back to other languages if needed.
 * OFF stores ingredients in multiple language fields.
 */
function getIngredientsText(product: any): string {
  // Priority: English > original language > French > any available
  return (
    product.ingredients_text_en ||
    product.ingredients_text_with_allergens_en ||
    product.ingredients_text ||
    product.ingredients_text_fr ||
    product.ingredients_text_with_allergens ||
    ""
  );
}

function getUncertainFields(confidence: number): Array<keyof ScannedProduct> {
  if (confidence >= CONFIDENCE_HIGH) return [];
  if (confidence >= CONFIDENCE_MEDIUM) {
    return [
      "nutrition",
      "nutri_score",
      "eco_score",
      "nova_group",
      "allergens",
      "ingredients_text",
      "serving_size",
    ];
  }
  return [];
}

function buildProductFromAI(
  raw: any,
  barcode?: string,
  prefix = "ai",
  overrideImageUrl?: string,
): ProductWithMeta {
  const n = raw.nutrition || {};
  const confidence =
    typeof raw.confidence === "number"
      ? Math.min(1, Math.max(0, raw.confidence))
      : 0.5;

  return {
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    barcode: barcode || raw.barcode || `${prefix.toUpperCase()}-${Date.now()}`,
    name:
      raw.identified_product ||
      raw.name ||
      raw.product_name ||
      "Unknown Product",
    brand: raw.brand || raw.manufacturer || "Unknown Brand",
    image_url: overrideImageUrl || raw.image_url || "",
    categories: raw.categories || raw.product_type || "",
    quantity: raw.quantity || "",
    ingredients_text: raw.ingredients_text || "",
    nutrition: {
      energy_kj: Number(n.energy_kj) || 0,
      energy_kcal: Number(n.energy_kcal) || 0,
      fat: Number(n.fat) || 0,
      saturated_fat: Number(n.saturated_fat) || 0,
      carbohydrates: Number(n.carbohydrates) || 0,
      sugars: Number(n.sugars) || 0,
      fiber: Number(n.fiber) || 0,
      protein: Number(n.protein) || 0,
      salt: Number(n.salt) || 0,
      sodium: Number(n.sodium) || 0,
    },
    allergens: Array.isArray(raw.allergens) ? raw.allergens : [],
    labels: Array.isArray(raw.labels) ? raw.labels : [],
    nutri_score: normaliseScore(raw.nutri_score),
    eco_score: normaliseScore(raw.eco_score),
    nova_group: Number(raw.nova_group) || 0,
    origins: raw.origins || raw.countries || "",
    packaging: raw.packaging || "",
    stores: raw.stores || "",
    countries: raw.countries || "",
    serving_size: raw.serving_size || "100g",
    scanned_at: new Date().toISOString(),
    ai_confidence: confidence,
    data_source: confidence >= CONFIDENCE_HIGH ? "ai" : "ai_partial",
    uncertain_fields: getUncertainFields(confidence),
  };
}

// --------------------------------------------------------------------------
// GEMINI CALLER — model fallback chain
// --------------------------------------------------------------------------
async function callGemini(
  primaryModel: string,
  parts: object[],
  apiKey: string,
): Promise<string | null> {
  const modelsToTry = [
    primaryModel,
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  for (const model of modelsToTry) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    };
    try {
      console.log(`🤖 Trying Gemini model: ${model}`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status === 404) {
        console.warn(
          `⚠️ Gemini [${model}] HTTP ${res.status} — trying next...`,
        );
        continue;
      }
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errText}`);
      }
      const data = await res.json();
      if (data.error) {
        console.warn(`⚠️ Gemini [${model}] body error: ${data.error.message}`);
        continue;
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.warn(`⚠️ Gemini [${model}] empty response`);
        continue;
      }
      console.log(`✅ Gemini [${model}] succeeded`);
      return text;
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("404")) {
        console.warn(`⚠️ Gemini [${model}] error — trying next...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error(
    "All Gemini models exhausted. Check quota at https://ai.dev/rate-limit",
  );
}

// --------------------------------------------------------------------------
// IMAGE UTILITIES
// --------------------------------------------------------------------------

/** Predictable OFF CDN URL from barcode — zero API calls, instant. */
function buildOFFImageUrl(barcode: string): string {
  if (!barcode || /^(AI|IMG|SEARCH)-/i.test(barcode)) return "";
  const b = barcode.replace(/\D/g, "");
  if (b.length < 8) return "";
  if (b.length <= 8)
    return `https://images.openfoodfacts.org/images/products/${b}/front_en.5.400.jpg`;
  const p1 = b.slice(0, 3),
    p2 = b.slice(3, 6),
    p3 = b.slice(6, 9),
    p4 = b.slice(9);
  const path = p4 ? `${p1}/${p2}/${p3}/${p4}` : `${p1}/${p2}/${b.slice(6)}`;
  return `https://images.openfoodfacts.org/images/products/${path}/front_en.5.400.jpg`;
}

/** HEAD-validates a URL is a real image. Uses fetchWithTimeout — Hermes safe. */
async function validateImageUrl(url: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetchWithTimeout(url, { method: "HEAD" }, 2000);
    const ct = res.headers.get("content-type") || "";
    return res.ok && ct.startsWith("image/") ? url : "";
  } catch {
    return "";
  }
}

/** Returns first valid image from priority-ordered candidate list. */
async function resolveFirstValidImage(candidates: string[]): Promise<string> {
  const unique = [...new Set(candidates.filter(Boolean))];
  if (unique.length === 0) return "";
  const results = await Promise.all(unique.map(validateImageUrl));
  const winner = results.find(Boolean) || "";
  if (winner) console.log(`✅ Image resolved: ${winner}`);
  return winner;
}

// --------------------------------------------------------------------------
// AI DATA EXTRACTION — TEXT
// Used by: name search (Way 4), partial OFF supplement, barcode miss with name
// --------------------------------------------------------------------------
async function extractProductDataWithAI(
  query: string,
  barcode?: string,
  overrideImageUrl?: string,
): Promise<ProductWithMeta | null> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ EXPO_PUBLIC_GEMINI_API_KEY not set");
    return null;
  }

  try {
    console.log("🤖 Calling Gemini for:", query);

    const prompt = `You are a food product nutrition database. Return ONLY a compact JSON object.

Task: Return accurate product information for: "${query}"${barcode ? ` (barcode: ${barcode})` : ""}

IMPORTANT — spelling variants: treat "Maggie"="Maggi", "Kitkat"="KitKat", "Lays"="Lay's", "Oreos"="Oreo", "Nutela"="Nutella" etc.

CONFIDENCE SCORING:
- 0.95 = globally famous product, exact values known (Coca-Cola, KitKat, Maggi, Oreo, Nutella)
- 0.80 = well-known brand product, minor variant uncertainty
- 0.60 = recognise category, estimating nutrition
- 0.40 = mostly guessing
Set confidence < 0.4 only for truly unknown/obscure products.

REFERENCE VALUES per 100g:
KitKat 2-finger: 518kcal 27g fat 11g sat 60g carb 48g sugar 5g pro nutri:D nova:4
Nutella: 539kcal 31g fat 10.6g sat 57g sugar 6.3g pro nutri:E nova:4
Coca-Cola: 42kcal 0g fat 10.6g sugar 0g pro nutri:E nova:4
Oreo: 480kcal 21g fat 8g sat 45g sugar 5g pro nutri:E nova:4
Lay's Classic: 536kcal 34g fat 4g sat 3g sugar 7g pro nutri:D nova:4
Maggi 2-Min Noodles Masala: 350kcal 13g fat 49g carb 2g sugar 10g pro nutri:D nova:4
Marie Gold: 462kcal 12g fat 7g sat 74g carb 16g sugar 8g pro nova:4
Milkybar: 566kcal 33g fat 20g sat 59g sugar 8g pro nutri:E nova:4
Carrot Cake: 380kcal 18g fat 8g sat 50g carb 20g sugar 4g pro nova:4
Britannia Marie Gold: 462kcal 12g fat 74g carb 8g pro nova:4
Parle-G: 451kcal 9.7g fat 74g carb 18g sugar 6.7g pro nova:4
Amul Butter: 720kcal 81g fat 51g sat 0g sugar 0.5g pro nova:2

RULES:
- Return ONLY valid JSON — no markdown, no explanation, no code fences
- ingredients_text: write MAX 2-3 key ingredients only (e.g. "Wheat flour, Sugar, Palm oil") — do NOT write a full list
- nutri_score: "A","B","C","D", or "E" only
- eco_score: "A","B","C","D", or "E" only  
- nova_group: integer 1,2,3, or 4 only
- All nutrition values are per 100g

Return this exact JSON structure with NO extra text:
{
  "name": "Brand + Product Name",
  "brand": "Brand Name",
  "confidence": 0.95,
  "quantity": "package size e.g. 100g",
  "categories": "food category",
  "ingredients_text": "Wheat flour, Sugar, Palm oil",
  "nutri_score": "D",
  "eco_score": "C",
  "nova_group": 4,
  "nutrition": {
    "energy_kj": 2168, "energy_kcal": 518,
    "fat": 27.0, "saturated_fat": 11.0,
    "carbohydrates": 60.0, "sugars": 48.0,
    "fiber": 1.0, "protein": 5.0,
    "salt": 0.3, "sodium": 0.12
  },
  "allergens": ["milk", "wheat"],
  "labels": [],
  "countries": "Global",
  "serving_size": "41.5g"
}`;

    const rawText = await callGemini(
      GEMINI_TEXT_MODEL,
      [{ text: prompt }],
      apiKey,
    );
    if (!rawText) return null;

    let parsed = safeParseJSON(rawText);

    // If parse still failed (e.g. model added explanation text), retry with a
    // stripped-down prompt that is harder to mess up
    if (!parsed) {
      console.warn("⚠️ First parse failed — retrying with minimal prompt");
      const retryPrompt = `Return ONLY a JSON object for this food product: "${query}"
No explanation. No markdown. Just JSON with these exact fields:
{"name":"","brand":"","confidence":0.9,"quantity":"","categories":"","ingredients_text":"","nutri_score":"D","eco_score":"C","nova_group":4,"nutrition":{"energy_kj":0,"energy_kcal":0,"fat":0,"saturated_fat":0,"carbohydrates":0,"sugars":0,"fiber":0,"protein":0,"salt":0,"sodium":0},"allergens":[],"labels":[],"countries":"","serving_size":"100g"}`;

      const retryText = await callGemini(
        GEMINI_TEXT_MODEL,
        [{ text: retryPrompt }],
        apiKey,
      );
      if (retryText) parsed = safeParseJSON(retryText);
    }

    if (!parsed) {
      console.error(
        "❌ AI JSON parse failed after retry:",
        rawText.slice(0, 300),
      );
      return null;
    }

    const confidence =
      typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
    if (confidence < CONFIDENCE_MEDIUM) {
      console.log(
        `⚠️ AI confidence too low (${confidence.toFixed(2)}) — rejecting`,
      );
      return null;
    }

    const product = buildProductFromAI(parsed, barcode, "ai", overrideImageUrl);
    console.log(`✅ AI: ${product.name} | conf: ${confidence.toFixed(2)}`);
    return product;
  } catch (err) {
    console.error("❌ extractProductDataWithAI failed:", err);
    return null;
  }
}

// --------------------------------------------------------------------------
// WAY 2 — IMAGE RECOGNITION
// --------------------------------------------------------------------------
export async function extractProductFromImage(
  base64Data: string,
  mimeType: string = "image/jpeg",
  uploadedPhotoUri?: string,
): Promise<ProductWithMeta | null> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ EXPO_PUBLIC_GEMINI_API_KEY not set");
    return null;
  }

  const cleanBase64 = base64Data.includes(",")
    ? base64Data.split(",")[1]
    : base64Data;

  try {
    console.log("🖼️ Sending image to Gemini Vision...");

    const prompt = `You are a food product recognition expert. Analyze this product image.

Return ONLY valid JSON. No explanation, no markdown, no code fences.

Confidence scoring (be honest):
1.0 = exact product name clearly readable from packaging
0.8 = brand and product type clearly visible
0.6 = brand visible but not exact variant
0.4 = food category only identifiable
<0.4 = too blurry or unclear

JSON structure:
{
  "identified_product": "Brand + Full Product Name",
  "brand": "Brand Name",
  "confidence": 0.9,
  "barcode": "",
  "product_type": "food category",
  "quantity": "package size",
  "ingredients_text": "ingredients if visible",
  "nutri_score": "C",
  "eco_score": "C",
  "nova_group": 4,
  "nutrition": {
    "energy_kj": 0, "energy_kcal": 0, "fat": 0, "saturated_fat": 0,
    "carbohydrates": 0, "sugars": 0, "fiber": 0, "protein": 0,
    "salt": 0, "sodium": 0
  },
  "allergens": [],
  "labels": [],
  "countries": "",
  "serving_size": "100g"
}`;

    const rawText = await callGemini(
      GEMINI_VISION_MODEL,
      [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: cleanBase64 } },
      ],
      apiKey,
    );
    if (!rawText) return null;

    const parsed = safeParseJSON(rawText);
    if (!parsed) {
      console.error("❌ Vision parse failed:", rawText.slice(0, 200));
      return null;
    }

    const confidence =
      typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
    if (confidence < CONFIDENCE_MEDIUM) {
      console.log(`⚠️ Vision confidence too low (${confidence.toFixed(2)})`);
      return null;
    }

    const recognizedName = parsed.identified_product || parsed.name || "";
    const detectedBarcode = parsed.barcode || "";
    console.log(
      `✅ Vision: "${recognizedName}" conf: ${confidence.toFixed(2)}`,
    );

    // Try OFF by name to get verified nutrition — keep uploaded photo as image
    if (recognizedName) {
      try {
        const offRes = await fetchWithTimeout(
          `${OPENFOODFACTS_API}/search?search_terms=${encodeURIComponent(recognizedName)}&page=1&page_size=5&json=1&fields=code,product_name,product_name_en,brands,image_url,image_front_url,categories,quantity,ingredients_text,nutriments,allergens_tags,labels_tags,nutriscore_grade,ecoscore_grade,nova_group,origins,serving_size`,
          {},
          5000,
        );

        if (offRes.ok) {
          const offData = await offRes.json();
          const offProducts: any[] = offData.products || [];
          const firstWord = recognizedName.toLowerCase().split(" ")[0];

          const bestOff = offProducts.find((p: any) => {
            const combined = `${(p.brands || "").toLowerCase()} ${(p.product_name || "").toLowerCase()}`;
            return combined.includes(firstWord);
          });

          if (bestOff?.nutriments?.["energy-kcal_100g"] > 0) {
            console.log(`✅ OFF nutrition found for: ${bestOff.product_name}`);

            const ecoScore = normaliseScore(bestOff.ecoscore_grade);
            const finalEcoScore =
              ecoScore === "unknown" ? estimateEcoScore(bestOff) : ecoScore;

            return {
              id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              barcode: detectedBarcode || bestOff.code || `IMG-${Date.now()}`,
              name: bestOff.product_name || recognizedName,
              brand: bestOff.brands || parsed.brand || "",
              // Always use uploaded photo — real, never broken
              image_url:
                uploadedPhotoUri ||
                bestOff.image_url ||
                bestOff.image_front_url ||
                "",
              categories: bestOff.categories || parsed.product_type || "",
              quantity: bestOff.quantity || parsed.quantity || "",
              ingredients_text: getIngredientsText(bestOff),
              nutrition: {
                energy_kj: bestOff.nutriments?.["energy-kj_100g"] || 0,
                energy_kcal: bestOff.nutriments?.["energy-kcal_100g"] || 0,
                fat: bestOff.nutriments?.fat_100g || 0,
                saturated_fat: bestOff.nutriments?.["saturated-fat_100g"] || 0,
                carbohydrates: bestOff.nutriments?.carbohydrates_100g || 0,
                sugars: bestOff.nutriments?.sugars_100g || 0,
                fiber: bestOff.nutriments?.fiber_100g || 0,
                protein: bestOff.nutriments?.proteins_100g || 0,
                salt: bestOff.nutriments?.salt_100g || 0,
                sodium: bestOff.nutriments?.sodium_100g || 0,
              },
              allergens: bestOff.allergens_tags
                ? bestOff.allergens_tags.map((a: string) =>
                    a.replace("en:", "").replace(/-/g, " "),
                  )
                : Array.isArray(parsed.allergens)
                  ? parsed.allergens
                  : [],
              labels: bestOff.labels_tags || [],
              nutri_score: normaliseScore(bestOff.nutriscore_grade),
              eco_score: finalEcoScore,
              nova_group: bestOff.nova_group || parsed.nova_group || 0,
              origins: bestOff.origins || "",
              packaging: "",
              stores: "",
              countries: bestOff.countries || "",
              serving_size:
                bestOff.serving_size || parsed.serving_size || "100g",
              scanned_at: new Date().toISOString(),
              data_source: "image",
              ai_confidence: confidence,
              uncertain_fields: [],
            } as ProductWithMeta;
          }
        }
      } catch (err) {
        console.warn("⚠️ OFF lookup after vision failed:", err);
      }
    }

    // OFF missed — use Vision data with uploaded photo
    console.log("⚠️ OFF miss — using Vision LLM data with uploaded photo");
    return buildProductFromAI(
      parsed,
      detectedBarcode || undefined,
      "img",
      uploadedPhotoUri,
    );
  } catch (err) {
    console.error("❌ extractProductFromImage failed:", err);
    return null;
  }
}

// --------------------------------------------------------------------------
// WAY 1 & 3 — BARCODE LOOKUP
// History check happens BEFORE this is called (in scan.tsx).
// --------------------------------------------------------------------------
export async function fetchProductByBarcode(
  barcode: string,
): Promise<ProductWithMeta | null> {
  try {
    console.log("🔍 Barcode lookup in OFF:", barcode);
    const res = await fetch(`${OPENFOODFACTS_API}/product/${barcode}.json`);

    // 404 = product not in OFF. Return null — caller handles fallback.
    if (res.status === 404) {
      console.log(`⚠️ Barcode ${barcode} not in OFF`);
      return null;
    }
    if (!res.ok) throw new Error(`OFF HTTP ${res.status}`);

    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      console.log(`⚠️ Barcode ${barcode} status=0 in OFF`);
      return null;
    }

    const p = data.product;
    const offImage = p.image_url || p.image_front_url || "";
    const resolvedImage =
      offImage || (await validateImageUrl(buildOFFImageUrl(barcode)));

    // Extract eco-score, estimate if missing
    const ecoScore = normaliseScore(p.ecoscore_grade);
    const finalEcoScore =
      ecoScore === "unknown" ? estimateEcoScore(p) : ecoScore;

    const product: ProductWithMeta = {
      id: `off-${Date.now()}-${barcode}`,
      barcode,
      name: p.product_name || p.product_name_en || "",
      brand: p.brands || "",
      image_url: resolvedImage,
      categories: p.categories || "",
      quantity: p.quantity || "",
      ingredients_text: getIngredientsText(p),
      nutrition: {
        energy_kj: p.nutriments?.["energy-kj_100g"] || 0,
        energy_kcal: p.nutriments?.["energy-kcal_100g"] || 0,
        fat: p.nutriments?.fat_100g || 0,
        saturated_fat: p.nutriments?.["saturated-fat_100g"] || 0,
        carbohydrates: p.nutriments?.carbohydrates_100g || 0,
        sugars: p.nutriments?.sugars_100g || 0,
        fiber: p.nutriments?.fiber_100g || 0,
        protein: p.nutriments?.proteins_100g || 0,
        salt: p.nutriments?.salt_100g || 0,
        sodium: p.nutriments?.sodium_100g || 0,
      },
      allergens: p.allergens_tags
        ? p.allergens_tags.map((a: string) =>
            a.replace("en:", "").replace(/-/g, " "),
          )
        : [],
      labels: p.labels_tags || [],
      nutri_score: normaliseScore(p.nutriscore_grade),
      eco_score: finalEcoScore,
      nova_group: p.nova_group || 0,
      origins: p.origins || "",
      packaging: p.packaging || "",
      stores: p.stores || "",
      countries: p.countries || "",
      serving_size: p.serving_size || "",
      scanned_at: new Date().toISOString(),
      data_source: "off",
      uncertain_fields: [],
    };

    const hasName = product.name.length > 2;
    const hasNutrition = product.nutrition.energy_kcal > 0;

    if (hasName && hasNutrition) {
      console.log("✅ OFF complete:", product.name);
      return product;
    }

    // Has name but missing nutrition — pass the name to LLM (it can use it)
    if (hasName) {
      console.log(
        `⚠️ OFF has name but no nutrition — AI filling with: "${product.name}"`,
      );
      const aiProduct = await extractProductDataWithAI(
        `${product.name} ${product.brand}`.trim(),
        barcode,
      );
      if (aiProduct) {
        return {
          ...aiProduct,
          id: product.id,
          barcode: product.barcode,
          image_url: resolvedImage || aiProduct.image_url,
          name: product.name,
          brand: product.brand || aiProduct.brand,
          allergens:
            product.allergens.length > 0
              ? product.allergens
              : aiProduct.allergens,
          ingredients_text:
            product.ingredients_text || aiProduct.ingredients_text,
          data_source: "ai_partial",
        };
      }
    }

    return null;
  } catch (err) {
    console.error("❌ fetchProductByBarcode error:", err);
    return null;
  }
}

// --------------------------------------------------------------------------
// WAY 4 — TEXT SEARCH
// History check happens BEFORE this is called (in scan.tsx).
// FIX: Only use OFF image if match score is good enough (≥ 40).
// --------------------------------------------------------------------------

function levenshteinDistance(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] =
        b[i - 1] === a[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[n][m];
}

function matchScore(query: string, productName: string): number {
  const q = query.toLowerCase().trim();
  const n = productName.toLowerCase().trim();
  if (n === q) return 100;
  if (n.includes(q) || q.includes(n)) return 90;
  const qWords = q.split(/\s+/).filter((w) => w.length > 1);
  const nWords = n.split(/\s+/).filter((w) => w.length > 1);
  let matched = 0;
  for (const qw of qWords)
    for (const nw of nWords)
      if (qw === nw || nw.includes(qw) || qw.includes(nw)) {
        matched++;
        break;
      }
  const wordScore =
    qWords.length > 0
      ? (matched / Math.max(qWords.length, nWords.length)) * 80
      : 0;
  const maxLen = Math.max(q.length, n.length);
  const fuzzyScore =
    maxLen > 0 ? ((maxLen - levenshteinDistance(q, n)) / maxLen) * 60 : 0;
  return Math.max(wordScore, fuzzyScore);
}

function parseOFFProducts(rawProducts: any[]): ProductWithMeta[] {
  return rawProducts
    .filter((p: any) => p.product_name || p.product_name_en)
    .map((p: any) => {
      const ecoScore = normaliseScore(p.ecoscore_grade);
      const finalEcoScore =
        ecoScore === "unknown" ? estimateEcoScore(p) : ecoScore;

      return {
        id: `off-${Date.now()}-${p.code}`,
        barcode: p.code || `SEARCH-${Date.now()}`,
        name: p.product_name || p.product_name_en || "Unknown",
        brand: p.brands || "",
        image_url: p.image_url || p.image_front_url || "",
        categories: p.categories || "",
        quantity: p.quantity || "",
        ingredients_text: getIngredientsText(p),
        nutrition: {
          energy_kj: p.nutriments?.["energy-kj_100g"] || 0,
          energy_kcal: p.nutriments?.["energy-kcal_100g"] || 0,
          fat: p.nutriments?.fat_100g || 0,
          saturated_fat: p.nutriments?.["saturated-fat_100g"] || 0,
          carbohydrates: p.nutriments?.carbohydrates_100g || 0,
          sugars: p.nutriments?.sugars_100g || 0,
          fiber: p.nutriments?.fiber_100g || 0,
          protein: p.nutriments?.proteins_100g || 0,
          salt: p.nutriments?.salt_100g || 0,
          sodium: p.nutriments?.sodium_100g || 0,
        },
        allergens: p.allergens_tags
          ? p.allergens_tags.map((a: string) =>
              a.replace("en:", "").replace(/-/g, " "),
            )
          : [],
        labels: p.labels_tags || [],
        nutri_score: normaliseScore(p.nutriscore_grade),
        eco_score: finalEcoScore,
        nova_group: p.nova_group || 0,
        origins: p.origins || "",
        packaging: p.packaging || "",
        stores: p.stores || "",
        countries: p.countries || "",
        serving_size: p.serving_size || "",
        scanned_at: new Date().toISOString(),
        data_source: "off" as const,
        uncertain_fields: [],
      };
    });
}

export async function searchProducts(
  query: string,
  page: number = 1,
): Promise<SearchResult> {
  const GOOD_MATCH_THRESHOLD = 60;
  const MIN_MATCH_THRESHOLD = 25;
  // FIX: Only use OFF image when match is strong enough to trust it's the right product
  const IMAGE_SCORE_THRESHOLD = 40;

  console.log("🔍 searchProducts:", query);

  // OFF + LLM in parallel — no sequential waiting
  const [offResult, aiResult] = await Promise.allSettled([
    fetchWithTimeout(
      `${OPENFOODFACTS_API}/search?search_terms=${encodeURIComponent(query)}&page=${page}&page_size=20&json=1&fields=code,product_name,product_name_en,brands,image_url,image_front_url,categories,quantity,ingredients_text,ingredients_text_en,nutriments,allergens_tags,labels_tags,nutriscore_grade,ecoscore_grade,nova_group,origins,packaging,stores,countries,serving_size`,
      {},
      6000,
    ).then((r) => (r.ok ? r.json() : Promise.reject(`OFF HTTP ${r.status}`))),

    extractProductDataWithAI(query),
  ]);

  let offProducts: ProductWithMeta[] = [];
  let offBestProduct: ProductWithMeta | null = null;
  let offBestScore = 0;

  if (
    offResult.status === "fulfilled" &&
    offResult.value?.products?.length > 0
  ) {
    offProducts = parseOFFProducts(offResult.value.products);
    const scored = offProducts
      .map((p) => ({ p, score: matchScore(query, p.name) }))
      .sort((a, b) => b.score - a.score);

    offBestScore = scored[0]?.score ?? 0;
    offBestProduct = scored[0]?.p ?? null;
    console.log(
      `📊 OFF best: "${offBestProduct?.name}" score=${offBestScore.toFixed(0)}`,
    );

    // Good OFF match with image → return immediately
    if (offBestScore >= GOOD_MATCH_THRESHOLD && offBestProduct?.image_url) {
      const goodMatches = scored
        .filter((s) => s.score >= MIN_MATCH_THRESHOLD)
        .slice(0, 5)
        .map((s) => s.p);
      console.log(`✅ Good OFF match: ${goodMatches.length} results`);
      return { products: goodMatches, count: goodMatches.length, page };
    }
  } else {
    console.warn(
      "⚠️ OFF search failed:",
      offResult.status === "rejected" ? offResult.reason : "no results",
    );
  }

  const llmProduct = aiResult.status === "fulfilled" ? aiResult.value : null;

  if (llmProduct) {
    // FIX: Only use OFF image if the match score is high enough to trust it's the right product
    // Score 18 (like "Margarine de table" for "Carrot cake") must NOT be used as image
    const offImage =
      offBestProduct?.image_url && offBestScore >= IMAGE_SCORE_THRESHOLD
        ? offBestProduct.image_url
        : "";

    const bestImage = offImage ? await resolveFirstValidImage([offImage]) : "";
    const finalProduct = { ...llmProduct, image_url: bestImage };

    console.log(
      `✅ LLM: ${finalProduct.name} | conf: ${finalProduct.ai_confidence?.toFixed(2)} | img: ${bestImage || "none"}`,
    );
    return { products: [finalProduct], count: 1, page: 1 };
  }

  // LLM failed — only fall back to OFF if it's a genuine match
  if (offBestProduct && offBestScore >= GOOD_MATCH_THRESHOLD) {
    console.log(`⚠️ LLM failed, using good OFF match: ${offBestProduct.name}`);
    return { products: [offBestProduct], count: 1, page };
  }

  // OFF score too low AND LLM failed — return nothing rather than a wrong product
  console.log("❌ No reliable results found");
  return { products: [], count: 0, page };
}
