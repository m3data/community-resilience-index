#!/usr/bin/env node
/**
 * Compare scraped supermarket prices against Hugo's recipe-price baseline.
 *
 * Reads:
 *   - Scraped JSON from scrape-coles.mjs / scrape-woolworths.mjs
 *   - Baseline price pack (app/src/data/price-pack-au-nsw.json)
 *
 * Produces:
 *   - Matched products with price deltas
 *   - Category-level inflation summary
 *   - Basket-level weighted movement
 *   - Output JSON suitable for the CRI food-price signal
 *
 * Usage:
 *   node compare-prices.mjs coles.json                      # single retailer
 *   node compare-prices.mjs coles.json woolworths.json      # both retailers
 *   node compare-prices.mjs coles.json -o comparison.json   # file output
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = resolve(__dirname, "../app/src/data/price-pack-au-nsw.json");

// Fuzzy product-to-ingredient matching
// Maps common supermarket product name patterns to baseline ingredient keys
const PRODUCT_MATCHERS = [
  // Pantry staples
  { pattern: /plain flour|all.?purpose flour/i, key: "all_purpose_flour" },
  { pattern: /self.?rais(?:ing|e) flour/i, key: "self_raising_flour" },
  { pattern: /bread flour/i, key: "bread_flour" },
  { pattern: /cornflour/i, key: "cornflour" },
  { pattern: /white sugar(?:\s+\d)/i, key: "white_sugar" },
  { pattern: /brown sugar/i, key: "brown_sugar" },
  { pattern: /caster sugar/i, key: "caster_sugar" },
  { pattern: /icing sugar/i, key: "icing_sugar" },
  { pattern: /table salt|cooking salt/i, key: "salt" },
  { pattern: /sea salt/i, key: "sea_salt" },

  // Rice & pasta
  { pattern: /white rice(?:\s+\d)/i, key: "white_rice" },
  { pattern: /basmati rice/i, key: "basmati_rice" },
  { pattern: /jasmine rice/i, key: "jasmine_rice" },
  { pattern: /arborio rice/i, key: "arborio_rice" },
  { pattern: /spaghetti(?:\s+\d|\s+5)/i, key: "spaghetti" },
  { pattern: /penne(?:\s+\d|\s+5)/i, key: "penne" },
  { pattern: /fettuccine/i, key: "fettuccine" },

  // Dairy
  { pattern: /full cream milk\s+(?:2|3)\s*l/i, key: "full_cream_milk" },
  { pattern: /skim milk\s+(?:2|3)\s*l/i, key: "skim_milk" },
  { pattern: /thickened cream\s+(?:300|600)/i, key: "thickened_cream" },
  { pattern: /sour cream\s+(?:300)/i, key: "sour_cream" },
  { pattern: /greek yoghurt|natural yoghurt/i, key: "greek_yoghurt" },
  { pattern: /tasty cheese(?:\s+\d)/i, key: "tasty_cheese" },
  { pattern: /cheddar cheese/i, key: "cheddar_cheese" },
  { pattern: /parmesan/i, key: "parmesan" },
  { pattern: /mozzarella/i, key: "mozzarella" },
  { pattern: /butter\s+(?:250|500)/i, key: "butter" },
  { pattern: /free range eggs?\s+(?:12|dozen)/i, key: "free_range_eggs" },
  { pattern: /cage.?free eggs?\s+(?:12|dozen)/i, key: "cage_free_eggs" },

  // Meat
  { pattern: /chicken breast(?:\s+fillet)?/i, key: "chicken_breast" },
  { pattern: /chicken thigh/i, key: "chicken_thigh" },
  { pattern: /whole chicken/i, key: "whole_chicken" },
  { pattern: /beef mince|minced beef/i, key: "beef_mince" },
  { pattern: /lamb chop/i, key: "lamb_chops" },
  { pattern: /lamb leg/i, key: "lamb_leg" },
  { pattern: /pork chop/i, key: "pork_chops" },
  { pattern: /pork mince/i, key: "pork_mince" },
  { pattern: /bacon\s+(?:200|250|short)/i, key: "bacon" },
  { pattern: /sausages?\s+(?:beef|pork|thin)/i, key: "sausages" },

  // Produce — anchored patterns to avoid matching processed products
  { pattern: /\bbanana(?:s)?\b(?!.*(?:bread|yoghurt|cake|chip|muffin|smoothie))/i, key: "bananas" },
  { pattern: /\bapple(?:s)?\b.*(?:pink lady|royal gala|granny|fuji|jazz)/i, key: "apples" },
  { pattern: /\borange(?:s)?\b(?!.*(?:juice|cordial|drink|marmalade))/i, key: "oranges" },
  { pattern: /\bavocado(?:s|es)?\b(?!.*(?:dip|guacamole|oil|smash))/i, key: "avocados" },
  { pattern: /\btomato(?:es|s)?\b\s+(?:truss|roma|cherry|grape|vine)/i, key: "tomatoes" },
  { pattern: /\bonion(?:s)?\b.*(?:brown)/i, key: "brown_onions" },
  { pattern: /\bonion(?:s)?\b.*(?:red)/i, key: "red_onions" },
  { pattern: /\bpotato(?:es|s)?\b\s+(?:brushed|washed|bag|sebago)/i, key: "potatoes" },
  { pattern: /\bsweet potato/i, key: "sweet_potatoes" },
  { pattern: /\bcarrot(?:s)?\b(?!.*(?:cake|juice|muffin))/i, key: "carrots" },
  { pattern: /\bbroccoli\b(?!.*(?:slaw|salad|stir))/i, key: "broccoli" },
  { pattern: /\bcapsicum\b.*(?:red)/i, key: "red_capsicum" },
  { pattern: /\bcapsicum\b.*(?:green)/i, key: "green_capsicum" },
  { pattern: /\bzucchini\b(?!.*(?:slice|chip|fritter))/i, key: "zucchini" },
  { pattern: /\bmushroom(?:s)?\b(?!.*(?:sauce|soup|risotto|pasta))/i, key: "mushrooms" },
  { pattern: /\blettuce\b.*(?:iceberg)/i, key: "iceberg_lettuce" },
  { pattern: /\bspinach\b.*(?:baby)/i, key: "baby_spinach" },
  { pattern: /\bcucumber\b.*(?:lebanese|telegraph)/i, key: "cucumber" },
  { pattern: /\bcorn\b.*\bcob/i, key: "corn" },
  { pattern: /\bpumpkin\b(?!.*(?:soup|seed|pie|spice|puree))/i, key: "pumpkin" },

  // Oils
  { pattern: /olive oil.*(?:extra virgin)/i, key: "extra_virgin_olive_oil" },
  { pattern: /canola oil/i, key: "canola_oil" },
  { pattern: /vegetable oil/i, key: "vegetable_oil" },
  { pattern: /coconut oil/i, key: "coconut_oil" },

  // Bakery
  { pattern: /white bread.*(?:loaf|sliced)/i, key: "white_bread" },
  { pattern: /wholemeal bread/i, key: "wholemeal_bread" },

  // Condiments
  { pattern: /tomato sauce.*(?:500|squeeze)/i, key: "tomato_sauce" },
  { pattern: /soy sauce/i, key: "soy_sauce" },
  { pattern: /worcestershire/i, key: "worcestershire_sauce" },
  { pattern: /vegemite/i, key: "vegemite" },
  { pattern: /peanut butter/i, key: "peanut_butter" },
  { pattern: /\bhoney\b(?!.*(?:soy|chicken|mustard|cereal|bar|muesli|oat))/i, key: "honey" },

  // Canned
  { pattern: /tinned tomato|diced tomato.*(?:can|400)/i, key: "tinned_tomatoes" },
  { pattern: /chickpea.*(?:can|400)/i, key: "chickpeas" },
  { pattern: /baked beans/i, key: "baked_beans" },
  { pattern: /tuna.*(?:can|95|185)/i, key: "canned_tuna" },
  { pattern: /coconut (?:milk|cream).*(?:can|400)/i, key: "coconut_milk" },
];

// Map baseline categories to supermarket categories for unmatched aggregation
const CATEGORY_MAP = {
  pantry_staples: "Pantry",
  grains: "Pantry",
  legumes: "Pantry",
  dairy: "Dairy, Eggs & Fridge",
  dairy_alternatives: "Dairy, Eggs & Fridge",
  meat: "Meat & Seafood",
  seafood: "Meat & Seafood",
  oils: "Pantry",
  produce: "Fruit & Vegetables",
  fresh_herbs: "Fruit & Vegetables",
  spices: "Pantry",
  baking: "Pantry",
  condiments: "Pantry",
  bakery: "Bakery",
  protein_alternatives: "Frozen",
  basics: "Pantry",
};

function matchProduct(productName) {
  for (const m of PRODUCT_MATCHERS) {
    if (m.pattern.test(productName)) return m.key;
  }
  return null;
}

// Extract weight from product name: "Coles Bananas | approx. 180g" → 180
// "Woolworths Washed Potatoes Bag 2kg" → 2000
function extractWeightGrams(name) {
  if (!name) return null;
  const kgMatch = name.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kgMatch) return parseFloat(kgMatch[1]) * 1000;
  const gMatch = name.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (gMatch) return parseFloat(gMatch[1]);
  const mlMatch = name.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  if (mlMatch) return parseFloat(mlMatch[1]); // treat ml ≈ g
  const lMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:l|litre|liter)\b/i);
  if (lMatch) return parseFloat(lMatch[1]) * 1000;
  return null;
}

// Get the per-kg (or per-litre) price for a product.
// Priority:
//   1. Woolworths unitPrice (already normalised by the retailer)
//   2. Weight from product name + shelf price → compute per-kg
//   3. null (can't normalise)
function getPerUnitPrice(product) {
  // Woolworths provides unitPrice and unit directly
  if (product.unitPrice != null && product.unitPrice > 0) {
    const u = (product.unit || "").toLowerCase();
    if (u === "kg" || u.includes("kg")) return product.unitPrice;
    if (u === "100g" || u.includes("100g")) return product.unitPrice * 10;
    if (u === "litre" || u.includes("litre") || u.includes("1l")) return product.unitPrice;
    if (u === "100ml" || u.includes("100ml")) return product.unitPrice * 10;
    // "each" with unitPrice — likely per-unit, not per-kg
    if (u === "each" || u.includes("ea")) return null;
    return product.unitPrice;
  }

  // Coles: extract weight from name/nameRaw
  const rawName = product.nameRaw || product.name;
  const weightG = extractWeightGrams(rawName);
  if (weightG && weightG > 0 && product.price > 0) {
    return (product.price / weightG) * 1000; // per kg
  }

  return null;
}

function loadBaseline() {
  const raw = readFileSync(BASELINE_PATH, "utf8");
  return JSON.parse(raw);
}

function loadScraped(filePath) {
  const raw = readFileSync(resolve(filePath), "utf8");
  return JSON.parse(raw);
}

function compareRetailer(scraped, baseline) {
  // Collect all candidates per ingredient key
  const candidatesByKey = {};
  const unmatched = [];

  for (const product of scraped.products) {
    const key = matchProduct(product.name);
    if (!key || !baseline.ingredients[key]) {
      unmatched.push(product);
      continue;
    }

    if (!candidatesByKey[key]) candidatesByKey[key] = [];
    candidatesByKey[key].push(product);
  }

  const matches = [];
  let normalisedCount = 0;
  let packFallbackCount = 0;

  for (const [key, candidates] of Object.entries(candidatesByKey)) {
    const base = baseline.ingredients[key];
    // Baseline per-unit price (per kg or per litre)
    const basePerUnit = base.price; // already per-unit in the pack
    const baseUnit = base.unit;

    // Try to find a candidate with a normalisable per-unit price
    let best = null;
    let bestPerUnit = null;
    let method = "pack_fallback";

    for (const c of candidates) {
      const perUnit = getPerUnitPrice(c);
      if (perUnit !== null) {
        // Pick the candidate with per-unit price closest to baseline per-unit
        if (best === null || Math.abs(perUnit - basePerUnit) < Math.abs(bestPerUnit - basePerUnit)) {
          best = c;
          bestPerUnit = perUnit;
          method = "per_unit";
        }
      }
    }

    // If no candidate had a normalisable unit price, fall back to closest pack price
    if (!best) {
      const basePackPrice = base.typical_pack_price ?? base.price;
      best = candidates.reduce((closest, c) => {
        return Math.abs(c.price - basePackPrice) < Math.abs(closest.price - basePackPrice) ? c : closest;
      });
      bestPerUnit = null;
    }

    // Compute delta using per-unit prices when available, pack prices otherwise
    let comparisonPrice, comparisonBase, comparisonUnit;
    if (bestPerUnit !== null) {
      comparisonPrice = bestPerUnit;
      comparisonBase = basePerUnit;
      comparisonUnit = `per ${baseUnit}`;
      normalisedCount++;
    } else {
      const basePackPrice = base.typical_pack_price ?? base.price;
      comparisonPrice = best.price;
      comparisonBase = basePackPrice;
      comparisonUnit = "pack (not normalised)";
      packFallbackCount++;
    }

    const delta = comparisonPrice - comparisonBase;
    const deltaPercent = comparisonBase > 0 ? ((delta / comparisonBase) * 100) : 0;

    matches.push({
      ingredientKey: key,
      productName: best.name,
      category: best.category,
      baselineCategory: base.category,
      baselinePrice: Math.round(comparisonBase * 100) / 100,
      currentPrice: Math.round(comparisonPrice * 100) / 100,
      shelfPrice: best.price,
      comparisonUnit,
      method,
      unit: best.unit,
      baselineUnit: base.unit,
      delta: Math.round(delta * 100) / 100,
      deltaPercent: Math.round(deltaPercent * 10) / 10,
      baselineDate: base.updated,
      scrapedDate: scraped.meta.scraped,
      candidateCount: candidates.length,
    });
  }

  process.stderr.write(
    `    Per-unit normalised: ${normalisedCount}, Pack fallback: ${packFallbackCount}\n`
  );

  return { matches, unmatched };
}

function computeCategorySummary(matches) {
  // Only include per-unit normalised matches in summaries
  const normalised = matches.filter((m) => m.method === "per_unit");
  const cats = {};
  for (const m of normalised) {
    const cat = m.baselineCategory;
    if (!cats[cat]) cats[cat] = { items: [], totalDelta: 0, count: 0 };
    cats[cat].items.push(m);
    cats[cat].totalDelta += m.deltaPercent;
    cats[cat].count++;
  }

  return Object.entries(cats).map(([category, data]) => ({
    category,
    supermarketCategory: CATEGORY_MAP[category] || "Other",
    itemCount: data.count,
    avgDeltaPercent: Math.round((data.totalDelta / data.count) * 10) / 10,
    maxIncrease: data.items.reduce((max, m) => Math.max(max, m.deltaPercent), -Infinity),
    maxDecrease: data.items.reduce((min, m) => Math.min(min, m.deltaPercent), Infinity),
  })).sort((a, b) => b.avgDeltaPercent - a.avgDeltaPercent);
}

function computeBasketSummary(matches) {
  // Only include per-unit normalised matches in basket summary
  // Pack fallback comparisons are unreliable (unit mismatch)
  const normalised = matches.filter((m) => m.method === "per_unit");
  if (normalised.length === 0) return null;

  const totalBaseline = normalised.reduce((s, m) => s + m.baselinePrice, 0);
  const totalCurrent = normalised.reduce((s, m) => s + m.currentPrice, 0);
  const totalDelta = totalCurrent - totalBaseline;
  const avgDeltaPercent = totalBaseline > 0 ? (totalDelta / totalBaseline) * 100 : 0;

  const increasing = normalised.filter((m) => m.deltaPercent > 1);
  const decreasing = normalised.filter((m) => m.deltaPercent < -1);
  const stable = normalised.filter((m) => Math.abs(m.deltaPercent) <= 1);

  // Top movers
  const sorted = [...normalised].sort((a, b) => b.deltaPercent - a.deltaPercent);
  const topIncreases = sorted.slice(0, 5);
  const topDecreases = sorted.slice(-5).reverse();

  return {
    matchedProducts: normalised.length,
    totalBaseline: Math.round(totalBaseline * 100) / 100,
    totalCurrent: Math.round(totalCurrent * 100) / 100,
    totalDelta: Math.round(totalDelta * 100) / 100,
    avgDeltaPercent: Math.round(avgDeltaPercent * 10) / 10,
    increasing: increasing.length,
    decreasing: decreasing.length,
    stable: stable.length,
    topIncreases: topIncreases.map((m) => ({
      name: m.productName,
      key: m.ingredientKey,
      delta: `${m.deltaPercent > 0 ? "+" : ""}${m.deltaPercent}%`,
      from: `$${m.baselinePrice.toFixed(2)}`,
      to: `$${m.currentPrice.toFixed(2)}`,
    })),
    topDecreases: topDecreases.map((m) => ({
      name: m.productName,
      key: m.ingredientKey,
      delta: `${m.deltaPercent > 0 ? "+" : ""}${m.deltaPercent}%`,
      from: `$${m.baselinePrice.toFixed(2)}`,
      to: `$${m.currentPrice.toFixed(2)}`,
    })),
  };
}

function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf("-o");
  const outFile = outIdx >= 0 ? argv[outIdx + 1] : null;
  // Remove -o and its value before collecting input files
  const inputArgs = outIdx >= 0
    ? [...argv.slice(0, outIdx), ...argv.slice(outIdx + 2)]
    : argv;
  const inputFiles = inputArgs.filter((a) => a.endsWith(".json"));

  if (inputFiles.length === 0) {
    process.stderr.write(
      "Usage: node compare-prices.mjs <scraped.json> [scraped2.json] [-o output.json]\n"
    );
    process.exit(1);
  }

  const baseline = loadBaseline();
  process.stderr.write(
    `Baseline: ${baseline.meta.version} (${baseline.meta.region}), ${baseline.meta.ingredient_count} ingredients\n`
  );

  const retailers = [];
  for (const file of inputFiles) {
    const scraped = loadScraped(file);
    process.stderr.write(
      `Scraped: ${scraped.meta.source} — ${scraped.meta.totalProducts} products (${scraped.meta.scraped})\n`
    );

    const { matches, unmatched } = compareRetailer(scraped, baseline);
    const categories = computeCategorySummary(matches);
    const basket = computeBasketSummary(matches);

    process.stderr.write(
      `  Matched: ${matches.length}/${scraped.products.length} products → ${basket?.avgDeltaPercent ?? 0}% avg movement\n`
    );

    retailers.push({
      source: scraped.meta.source,
      scrapedAt: scraped.meta.scraped,
      matches,
      unmatchedCount: unmatched.length,
      categories,
      basket,
    });
  }

  // Cross-retailer summary if multiple
  let crossRetailer = null;
  if (retailers.length > 1) {
    const allMatches = retailers.flatMap((r) => r.matches);
    // Group by ingredient key, average across retailers
    const byKey = {};
    for (const m of allMatches) {
      if (!byKey[m.ingredientKey]) byKey[m.ingredientKey] = [];
      byKey[m.ingredientKey].push(m);
    }
    const averaged = Object.entries(byKey).map(([key, items]) => ({
      ingredientKey: key,
      retailers: items.map((i) => i.productName),
      avgDeltaPercent:
        Math.round(
          (items.reduce((s, i) => s + i.deltaPercent, 0) / items.length) * 10
        ) / 10,
      priceRange: {
        min: Math.min(...items.map((i) => i.currentPrice)),
        max: Math.max(...items.map((i) => i.currentPrice)),
      },
    }));
    crossRetailer = {
      matchedIngredients: averaged.length,
      avgMovement:
        Math.round(
          (averaged.reduce((s, a) => s + a.avgDeltaPercent, 0) / averaged.length) * 10
        ) / 10,
      items: averaged.sort((a, b) => b.avgDeltaPercent - a.avgDeltaPercent),
    };
  }

  const result = {
    meta: {
      generated: new Date().toISOString(),
      baselineVersion: baseline.meta.version,
      baselineRegion: baseline.meta.region,
      baselineDate: baseline.meta.generated,
    },
    retailers,
    crossRetailer,
  };

  const json = JSON.stringify(result, null, 2);
  if (outFile) {
    writeFileSync(resolve(outFile), json);
    process.stderr.write(`\nWrote comparison to ${outFile}\n`);
  } else {
    process.stdout.write(json);
  }
}

main();
