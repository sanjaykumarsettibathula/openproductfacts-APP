import { ScannedProduct } from "./storage";

const OPENFOODFACTS_API = "https://world.openfoodfacts.org/api/v2";
const GEMINI_TEXT_MODEL = "gemini-2.0-flash-lite";
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface AlternativeProduct {
  barcode: string;
  name: string;
  brand: string;
  nutri_score: string;
  nova_group: number;
  image_url?: string;
  reason: string;
}

// --------------------------------------------------------------------------
// HERMES-SAFE FETCH WITH TIMEOUT
// --------------------------------------------------------------------------
function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

// --------------------------------------------------------------------------
// ROBUST JSON ARRAY EXTRACTOR
//
// Handles all Gemini response variants:
//   - Perfect bare array
//   - Array wrapped in object {"alternatives": [...]}
//   - Array truncated mid-token by maxOutputTokens
//   - Trailing whitespace / invisible unicode after closing ]
//   - Long reason strings with commas, quotes, special chars
// --------------------------------------------------------------------------
function extractJSONArray(raw: string): any[] | null {
  // Strip markdown fences
  const cleaned = raw
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();

  // Strategy 1: direct parse — works when response is perfect
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      for (const key of [
        "alternatives",
        "products",
        "suggestions",
        "items",
        "results",
        "data",
      ]) {
        if (Array.isArray(parsed[key])) return parsed[key];
      }
      for (const val of Object.values(parsed)) {
        if (Array.isArray(val)) return val as any[];
      }
    }
  } catch {}

  // Strategy 2: find the balanced [ ... ] span character by character
  // Immune to trailing text/invisible chars after the array
  const startIdx = cleaned.indexOf("[");
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        const slice = cleaned.slice(startIdx, i + 1);
        try {
          const parsed = JSON.parse(slice);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        break; // slice failed, fall through to repair
      }
    }
  }

  // Strategy 3: truncation repair
  // Gemini cut the response mid-token — close open strings, objects, arrays
  const fromStart = cleaned.slice(startIdx);
  try {
    let arrDepth = 0,
      objDepth = 0;
    let inStr = false,
      esc = false;

    for (const ch of fromStart) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (ch === "[") arrDepth++;
      else if (ch === "]") arrDepth--;
      else if (ch === "{") objDepth++;
      else if (ch === "}") objDepth--;
    }

    let repaired = fromStart.trimEnd();

    // Close open string
    if (inStr) repaired += '"';

    // Remove trailing comma before closing (invalid JSON)
    repaired = repaired.replace(/,\s*$/, "");

    // Close open objects
    for (let i = 0; i < objDepth; i++) repaired += "}";

    // Close open arrays
    for (let i = 0; i < arrDepth; i++) repaired += "]";

    const parsed = JSON.parse(repaired);
    if (Array.isArray(parsed)) {
      console.log(`✅ Repaired truncated JSON array (${parsed.length} items)`);
      return parsed;
    }
  } catch (e) {
    console.warn("⚠️ Truncation repair also failed:", (e as any)?.message);
  }

  return null;
}

function normaliseScore(val: any): string {
  if (!val) return "unknown";
  const upper = String(val).toUpperCase().trim().charAt(0);
  return ["A", "B", "C", "D", "E"].includes(upper) ? upper : "unknown";
}

// --------------------------------------------------------------------------
// GEMINI CALLER
// Key fix: maxOutputTokens raised to 4096 so 4-item arrays never get cut off
// --------------------------------------------------------------------------
async function callGemini(
  parts: object[],
  maxTokens = 4096,
): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ EXPO_PUBLIC_GEMINI_API_KEY not set");
    return null;
  }

  const modelsToTry = [
    GEMINI_TEXT_MODEL,
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== GEMINI_TEXT_MODEL),
  ];

  for (const model of modelsToTry) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
    };
    try {
      console.log(`🤖 Alternatives — trying Gemini: ${model}`);
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
      if (!res.ok) continue;
      const data = await res.json();
      if (data.error) {
        console.warn(`⚠️ Gemini [${model}] body error:`, data.error.message);
        continue;
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      console.log(`✅ Alternatives Gemini [${model}] succeeded`);
      return text;
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("404"))
        continue;
      console.warn(`⚠️ Gemini [${model}] threw:`, err?.message);
      continue;
    }
  }
  return null;
}

// --------------------------------------------------------------------------
// STEP 1: AI suggests healthier alternatives dynamically
// --------------------------------------------------------------------------
interface AIAlternativeSuggestion {
  search_query: string;
  name: string;
  brand: string;
  nutri_score: string;
  nova_group: number;
  reason: string;
}

async function getAISuggestedAlternatives(
  product: ScannedProduct,
): Promise<AIAlternativeSuggestion[]> {
  const nutriScore = normaliseScore(product.nutri_score);

  // Tell AI what score range to target based on original score
  const targetScores =
    nutriScore === "C" ? "A or B only" : "A, B, or C (never D or E)";

  const prompt = `You are a nutrition expert. Suggest 4 healthier alternatives for this food product.

Product: "${product.name}"
Brand: "${product.brand || "unknown"}"
Category: "${product.categories || "unknown"}"
Nutri-Score: ${nutriScore} (target alternatives with Nutri-Score: ${targetScores})
NOVA: ${product.nova_group || "unknown"}

Rules:
1. Same food type and purpose ONLY (chips→chips, chocolate→chocolate, cola→cola, noodles→noodles)
2. Suggested Nutri-Score MUST be ${targetScores}
3. Real products that exist in India or globally
4. Different brands
5. search_query: brand + product name, max 5 words, concise and searchable
6. reason: one short sentence, max 10 words

Return ONLY a JSON array. Start with [ end with ]. No text outside the array. No explanation.

[{"search_query":"","name":"","brand":"","nutri_score":"","nova_group":0,"reason":""}]`;

  // Use 4096 tokens so 4-item arrays with reason strings never get truncated
  const raw = await callGemini([{ text: prompt }], 4096);
  if (!raw) return [];

  console.log(`🔍 Raw AI response (first 400 chars): ${raw.slice(0, 400)}`);

  const arr = extractJSONArray(raw);

  if (!arr) {
    console.warn(
      "⚠️ Could not extract array from AI response:",
      raw.slice(0, 300),
    );
    return [];
  }

  const valid = arr.filter(
    (item: any) =>
      typeof item.search_query === "string" &&
      item.search_query.trim().length > 2 &&
      typeof item.name === "string" &&
      item.name.trim().length > 0,
  );

  console.log(
    `🤖 AI suggested ${valid.length} valid alternatives for "${product.name}"`,
  );
  return valid;
}

// --------------------------------------------------------------------------
// STEP 2: Verify each suggestion against OFF
// --------------------------------------------------------------------------
async function verifyWithOFF(
  suggestion: AIAlternativeSuggestion,
): Promise<AlternativeProduct> {
  try {
    const params = new URLSearchParams({
      search_terms: suggestion.search_query,
      page: "1",
      page_size: "5",
      json: "1",
      fields:
        "code,product_name,brands,nutriscore_grade,nova_group,image_url,image_front_url",
    });

    const res = await fetchWithTimeout(
      `${OPENFOODFACTS_API}/search?${params.toString()}`,
      {},
      10000,
    );

    if (!res.ok) throw new Error(`OFF HTTP ${res.status}`);

    const data = await res.json();
    const products: any[] = data.products || [];

    if (products.length > 0) {
      const queryWords = suggestion.search_query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);

      const scored = products
        .filter((p: any) => p.product_name?.trim())
        .map((p: any) => {
          const combined = `${(p.brands || "").toLowerCase()} ${p.product_name.toLowerCase()}`;
          const matchCount = queryWords.filter((w) =>
            combined.includes(w),
          ).length;
          return { p, score: matchCount };
        })
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      if (best && best.score >= 1) {
        const offNutri = normaliseScore(best.p.nutriscore_grade);
        console.log(
          `✅ OFF verified: "${best.p.product_name}" nutri=${offNutri}`,
        );
        return {
          barcode: best.p.code || "",
          name: best.p.product_name,
          brand: best.p.brands?.split(",")[0]?.trim() || suggestion.brand,
          nutri_score:
            offNutri !== "unknown"
              ? offNutri
              : normaliseScore(suggestion.nutri_score),
          nova_group: best.p.nova_group || suggestion.nova_group || 0,
          image_url: best.p.image_url || best.p.image_front_url || "",
          reason: suggestion.reason,
        };
      }
    }

    console.log(
      `ℹ️ OFF: no match for "${suggestion.search_query}" — using AI data`,
    );
  } catch (err: any) {
    console.warn(
      `⚠️ OFF verify failed for "${suggestion.search_query}":`,
      err?.message,
    );
  }

  // Fallback: use AI suggestion data directly
  return {
    barcode: "",
    name: suggestion.name,
    brand: suggestion.brand || "",
    nutri_score: normaliseScore(suggestion.nutri_score),
    nova_group: suggestion.nova_group || 0,
    image_url: "",
    reason: suggestion.reason,
  };
}

// --------------------------------------------------------------------------
// MAIN EXPORT
// --------------------------------------------------------------------------
const SCORE_RANK: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
  unknown: 0,
};

export async function searchHealthierAlternatives(
  product: ScannedProduct,
): Promise<AlternativeProduct[]> {
  try {
    const nutriScore = normaliseScore(product.nutri_score);

    // Only show alternatives for C, D, E or NOVA 4. A and B are already good.
    const shouldTrigger =
      ["C", "D", "E"].includes(nutriScore) || product.nova_group === 4;

    if (!shouldTrigger) {
      console.log(
        `ℹ️ No alternatives needed: nutri=${nutriScore} nova=${product.nova_group}`,
      );
      return [];
    }

    console.log(
      `🔍 Finding alternatives for: "${product.name}" (${nutriScore}, NOVA ${product.nova_group})`,
    );

    const suggestions = await getAISuggestedAlternatives(product);
    if (suggestions.length === 0) {
      console.warn("⚠️ AI returned no valid suggestions");
      return [];
    }

    // Verify all in parallel
    const verified = await Promise.all(
      suggestions.slice(0, 4).map((s) => verifyWithOFF(s)),
    );

    // Filter by score rules:
    // - C original → only A or B alternatives
    // - D or E original → A, B, or C alternatives
    // - NOVA 4 triggered (any score) → A, B, or C
    // - Never show D or E as alternatives
    const results = verified.filter((alt) => {
      const altNutri = alt.nutri_score;

      // Hard rule: never suggest D or E
      if (altNutri === "D" || altNutri === "E") return false;

      // unknown score from AI fallback — let it through since AI validated it
      if (altNutri === "unknown") return true;

      const altRank = SCORE_RANK[altNutri] ?? 0;

      if (nutriScore === "C") {
        // Must be strictly better than C (i.e. A or B)
        return altRank > SCORE_RANK["C"];
      }

      // D, E, or NOVA-4-triggered: accept A, B, or C
      return altRank >= SCORE_RANK["C"];
    });

    // Sort best score first
    results.sort(
      (a, b) =>
        (SCORE_RANK[b.nutri_score] ?? 0) - (SCORE_RANK[a.nutri_score] ?? 0),
    );

    console.log(
      `✅ Final alternatives: ${results.length} for "${product.name}"`,
    );
    return results;
  } catch (err) {
    console.error("❌ searchHealthierAlternatives failed:", err);
    return [];
  }
}
