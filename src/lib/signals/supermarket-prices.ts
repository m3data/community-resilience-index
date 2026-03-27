/**
 * Supermarket shelf price signal — Layer 4: Retail impact
 *
 * Reads scraped Coles/Woolworths price data compared against
 * Hugo's Anuna recipe-price baseline (Dec 2025 NSW).
 *
 * Data flow:
 *   scrape-coles.mjs → compare-prices.mjs → comparison.json → this module
 *
 * The comparison JSON lives at app/src/data/price-comparison.json.
 * Updated by running the scrape + compare pipeline (manual or scheduled).
 * This module reads it statically — no live scraping at request time.
 */

import type { Signal, SignalComponent } from "./types";
import { readFileSync } from "fs";
import { join } from "path";

interface RetailerBasket {
  matchedProducts: number;
  totalBaseline: number;
  totalCurrent: number;
  totalDelta: number;
  avgDeltaPercent: number;
  increasing: number;
  decreasing: number;
  stable: number;
  topIncreases: Array<{
    name: string;
    key: string;
    delta: string;
    from: string;
    to: string;
  }>;
  topDecreases: Array<{
    name: string;
    key: string;
    delta: string;
    from: string;
    to: string;
  }>;
}

interface CategorySummary {
  category: string;
  supermarketCategory: string;
  itemCount: number;
  avgDeltaPercent: number;
  maxIncrease: number;
  maxDecrease: number;
}

interface RetailerComparison {
  source: string;
  scrapedAt: string;
  basket: RetailerBasket | null;
  categories: CategorySummary[];
}

interface PriceComparison {
  meta: {
    generated: string;
    baselineVersion: string;
    baselineRegion: string;
    baselineDate: string;
  };
  retailers: RetailerComparison[];
  crossRetailer: {
    matchedIngredients: number;
    avgMovement: number;
  } | null;
}

function loadComparison(): PriceComparison | null {
  try {
    const filePath = join(process.cwd(), "app/src/data/price-comparison.json");
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function staleness(scrapedAt: string): { days: number; stale: boolean } {
  const scraped = new Date(scrapedAt).getTime();
  const now = Date.now();
  const days = Math.floor((now - scraped) / (1000 * 60 * 60 * 24));
  return { days, stale: days > 7 };
}

export function fetchSupermarketPrices(): Signal | null {
  const data = loadComparison();
  if (!data || data.retailers.length === 0) return null;

  // Use cross-retailer average if available, otherwise first retailer
  const avgMovement = data.crossRetailer?.avgMovement
    ?? data.retailers[0]?.basket?.avgDeltaPercent
    ?? null;

  if (avgMovement === null) return null;

  // Build components from each retailer's basket
  const components: SignalComponent[] = [];

  for (const retailer of data.retailers) {
    if (!retailer.basket) continue;

    const b = retailer.basket;
    const age = staleness(retailer.scrapedAt);
    const staleNote = age.stale ? ` (${age.days}d old)` : "";

    components.push({
      label: retailer.source,
      value: `${b.avgDeltaPercent > 0 ? "+" : ""}${b.avgDeltaPercent}% vs Dec 2025`,
      change: `${b.matchedProducts} products matched`,
      trend: b.avgDeltaPercent > 5 ? "critical"
        : b.avgDeltaPercent > 2 ? "up"
        : b.avgDeltaPercent < -1 ? "down"
        : "stable",
    });

    // Add top category movers as sub-components
    const hotCategories = retailer.categories
      .filter((c) => Math.abs(c.avgDeltaPercent) > 3)
      .slice(0, 3);

    for (const cat of hotCategories) {
      components.push({
        label: `  ${cat.supermarketCategory}`,
        value: `${cat.avgDeltaPercent > 0 ? "+" : ""}${cat.avgDeltaPercent}%`,
        change: `${cat.itemCount} items`,
        trend: cat.avgDeltaPercent > 5 ? "critical"
          : cat.avgDeltaPercent > 2 ? "up"
          : cat.avgDeltaPercent < -1 ? "down"
          : "stable",
      });
    }
  }

  // Overall trend
  let trend: Signal["trend"] = "stable";
  if (avgMovement > 5) trend = "critical";
  else if (avgMovement > 2) trend = "up";
  else if (avgMovement < -1) trend = "down";

  // Context narrative
  const retailerNames = data.retailers.map((r) => r.source).join(" and ");
  const matchCount = data.crossRetailer?.matchedIngredients
    ?? data.retailers[0]?.basket?.matchedProducts ?? 0;

  let context = `Shelf prices at ${retailerNames} moved ${avgMovement > 0 ? "up" : "down"} ${Math.abs(avgMovement).toFixed(1)}% on average compared to the Dec 2025 baseline (${matchCount} products matched to the Anuna recipe-price pack).`;

  // Add top movers narrative
  const firstBasket = data.retailers[0]?.basket;
  if (firstBasket) {
    const topUp = firstBasket.topIncreases[0];
    const topDown = firstBasket.topDecreases[0];
    if (topUp) {
      context += ` Biggest increase: ${topUp.key.replace(/_/g, " ")} (${topUp.delta}, ${topUp.from} → ${topUp.to}).`;
    }
    if (topDown && parseFloat(topDown.delta) < 0) {
      context += ` Biggest decrease: ${topDown.key.replace(/_/g, " ")} (${topDown.delta}).`;
    }
  }

  // Staleness warning
  const mostRecent = data.retailers
    .map((r) => r.scrapedAt)
    .sort()
    .pop();
  const age = mostRecent ? staleness(mostRecent) : { days: 999, stale: true };
  if (age.stale) {
    context += ` Note: price data is ${age.days} days old — re-run the scraper for current prices.`;
  }

  context += " Prices compared against the Anuna recipe-price pack (247 ingredients, Dec 2025 NSW metropolitan averages). Not all scraped products match baseline ingredients — match rate depends on product naming.";

  return {
    label: "Supermarket shelf prices",
    value: `${avgMovement > 0 ? "+" : ""}${avgMovement}% vs baseline`,
    trend,
    source: retailerNames,
    context,
    lastUpdated: mostRecent ?? null,
    automated: false, // requires manual scraper run
    layer: 4,
    layerLabel: "Retail impact",
    propagatesTo: "Household food budgets, food bank demand, dietary trade-offs",
    components,
  };
}
