/**
 * Cascade Pressure Indicator — synthesised forward-looking signal
 *
 * Derives estimated cost-of-living pressure from upstream signals:
 *   - Diesel TGP movement (freight cost driver)
 *   - Brent crude trend (upstream of diesel)
 *   - Crack spread (refining margin — amplifies or dampens crude→diesel)
 *   - AUD/USD (import cost amplifier)
 *   - RBA cash rate (mortgage/rent pressure)
 *   - Farm inputs (agricultural cost pressure)
 *
 * This is not a forecast. It's a structural pressure estimate based on
 * known cost relationships in the Australian supply chain.
 *
 * Key relationships (from ACCC, BITRE, ABARES research):
 *   - Diesel is ~30-40% of road freight operating costs
 *   - Freight is ~8-12% of retail food cost (fresh higher, shelf-stable lower)
 *   - 10% diesel rise → ~3-4% freight cost increase → ~0.3-0.5% food price impact
 *   - AUD depreciation amplifies imported fuel/fertiliser costs
 *   - Rate rises compound through mortgage stress + business costs
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Signal, SignalComponent } from "./types";

export interface CascadeInputs {
  /** Diesel TGP national average (c/L) — current */
  dieselTgp: number | null;
  /** Diesel TGP national average — 1 week ago */
  dieselTgpWeekAgo: number | null;
  /** Diesel TGP national average — 4 weeks ago */
  dieselTgpMonthAgo: number | null;

  /** Brent crude (USD/bbl) */
  brentCrude: number | null;
  /** Brent crude trend */
  brentTrend: "up" | "down" | "stable" | "critical" | null;

  /** Crack spread trend */
  crackTrend: "up" | "down" | "stable" | "critical" | null;

  /** AUD/USD rate */
  audUsd: number | null;
  /** AUD/USD trend */
  audTrend: "up" | "down" | "stable" | "critical" | null;

  /** RBA cash rate (%) */
  rbaCashRate: number | null;

  /** Farm inputs trend */
  farmInputsTrend: "up" | "down" | "stable" | "critical" | null;
}

interface PressureChannel {
  name: string;
  pressure: number; // -1 to +1 scale
  horizon: string;
  description: string;
}

// ── Cost structure coefficients (from ACCC, BITRE, ABARES) ───────────────────

/** Diesel share of road freight operating costs */
const DIESEL_FREIGHT_SHARE = 0.35;

/** Freight share of retail food cost (average across categories) */
const FREIGHT_FOOD_SHARE = 0.10;

/** Fresh produce: higher freight share */
const FREIGHT_FRESH_SHARE = 0.15;

/** Shelf-stable: lower freight share */
const FREIGHT_SHELF_SHARE = 0.06;

/** Reference diesel price — long-run average for baseline (c/L) */
const DIESEL_BASELINE = 180;

/** Reference AUD/USD — long-run average */
const AUD_BASELINE = 0.70;

function computePressureChannels(inputs: CascadeInputs): PressureChannel[] {
  const channels: PressureChannel[] = [];

  // ── Channel 1: Diesel → Freight → Food ─────────────────────────────────
  if (inputs.dieselTgp !== null) {
    const dieselDeviation = (inputs.dieselTgp - DIESEL_BASELINE) / DIESEL_BASELINE;
    const freightPressure = dieselDeviation * DIESEL_FREIGHT_SHARE;
    const foodPressure = freightPressure * FREIGHT_FOOD_SHARE / DIESEL_FREIGHT_SHARE;

    // Weekly acceleration
    let weeklyAccel = "";
    if (inputs.dieselTgpWeekAgo !== null) {
      const weekChange = ((inputs.dieselTgp - inputs.dieselTgpWeekAgo) / inputs.dieselTgpWeekAgo) * 100;
      if (Math.abs(weekChange) > 0.5) {
        weeklyAccel = ` ${weekChange > 0 ? "Rising" : "Falling"} ${Math.abs(weekChange).toFixed(1)}% this week.`;
      }
    }

    // Monthly trend
    let monthlyTrend = "";
    if (inputs.dieselTgpMonthAgo !== null) {
      const monthChange = ((inputs.dieselTgp - inputs.dieselTgpMonthAgo) / inputs.dieselTgpMonthAgo) * 100;
      if (Math.abs(monthChange) > 1) {
        monthlyTrend = ` ${monthChange > 0 ? "Up" : "Down"} ${Math.abs(monthChange).toFixed(1)}% over 4 weeks.`;
      }
    }

    channels.push({
      name: "Freight costs",
      pressure: Math.min(1, Math.max(-1, freightPressure * 3)), // scale to -1..1
      horizon: "2-6 weeks to reach shelves",
      description:
        `Diesel wholesale at ${inputs.dieselTgp.toFixed(0)} c/L — ${Math.round(dieselDeviation * 100)}% above long-run average.${weeklyAccel}${monthlyTrend}` +
        ` Every truck moving food pays this price. Fresh produce (${Math.round(FREIGHT_FRESH_SHARE * 100)}% freight cost) feels it first, shelf-stable (${Math.round(FREIGHT_SHELF_SHARE * 100)}%) later.`,
    });
  }

  // ── Channel 2: Crude → Diesel pipeline ──────────────────────────────────
  if (inputs.brentCrude !== null && inputs.brentTrend) {
    const crudePressure =
      inputs.brentTrend === "critical" ? 0.9 :
      inputs.brentTrend === "up" ? 0.5 :
      inputs.brentTrend === "down" ? -0.3 : 0;

    // Crack spread modifies: widening spread means refiners extracting margin
    let crackMod = "";
    if (inputs.crackTrend === "up" || inputs.crackTrend === "critical") {
      crackMod = " Refining margins are widening — diesel prices may rise faster than crude.";
    } else if (inputs.crackTrend === "down") {
      crackMod = " Refining margins are narrowing — some buffering of crude price movements.";
    }

    channels.push({
      name: "Crude oil pipeline",
      pressure: crudePressure,
      horizon: "2-4 weeks to reach diesel TGP",
      description:
        `Brent crude at US$${inputs.brentCrude.toFixed(0)}/bbl, trend ${inputs.brentTrend}.${crackMod}` +
        ` This is the furthest-upstream pressure signal — what happens here reaches the bowser in weeks and shelves in months.`,
    });
  }

  // ── Channel 3: Currency amplifier ───────────────────────────────────────
  if (inputs.audUsd !== null) {
    const currencyDeviation = (AUD_BASELINE - inputs.audUsd) / AUD_BASELINE;
    // Falling AUD = more expensive imports = positive pressure
    const currencyPressure = currencyDeviation * 0.8;

    if (Math.abs(currencyDeviation) > 0.03) { // only surface if meaningful
      channels.push({
        name: "Import cost amplifier",
        pressure: Math.min(1, Math.max(-1, currencyPressure)),
        horizon: "Immediate on new import contracts",
        description:
          `AUD at US$${inputs.audUsd.toFixed(3)} — ${currencyDeviation > 0 ? `${Math.round(currencyDeviation * 100)}% below` : `${Math.round(Math.abs(currencyDeviation) * 100)}% above`} long-run average.` +
          ` ${currencyDeviation > 0 ? "A weaker dollar makes every barrel of imported crude and tonne of imported fertiliser more expensive in Australian terms." : "A stronger dollar provides some buffer against imported cost pressures."}`,
      });
    }
  }

  // ── Channel 4: Interest rate pressure ───────────────────────────────────
  if (inputs.rbaCashRate !== null) {
    // Rate above 3% is historically elevated for Australia
    const ratePressure = inputs.rbaCashRate > 4.5 ? 0.8 :
      inputs.rbaCashRate > 3.5 ? 0.5 :
      inputs.rbaCashRate > 2.5 ? 0.2 : -0.1;

    channels.push({
      name: "Interest rate pressure",
      pressure: ratePressure,
      horizon: "Ongoing — compounds monthly",
      description:
        `Cash rate at ${inputs.rbaCashRate.toFixed(2)}%.` +
        ` Higher rates increase business operating costs (commercial loans, overdraft facilities) which flow through to consumer prices.` +
        ` They also compress household discretionary spending — less buffer to absorb price increases elsewhere.`,
    });
  }

  // ── Channel 5: Farm input costs ─────────────────────────────────────────
  if (inputs.farmInputsTrend) {
    const farmPressure =
      inputs.farmInputsTrend === "critical" ? 0.8 :
      inputs.farmInputsTrend === "up" ? 0.4 :
      inputs.farmInputsTrend === "down" ? -0.2 : 0;

    if (farmPressure !== 0) {
      channels.push({
        name: "Farm input costs",
        pressure: farmPressure,
        horizon: "3-9 months (next planting/harvest cycle)",
        description:
          `Farm inputs (fertiliser, chemicals, fuel) are ${inputs.farmInputsTrend === "critical" || inputs.farmInputsTrend === "up" ? "rising" : "easing"}.` +
          ` These costs affect production decisions now and flow through to food prices over the next growing season.` +
          ` Farmers absorb margin compression up to a point, then pass costs through or reduce planting.`,
      });
    }
  }

  return channels;
}

function computeOverallPressure(channels: PressureChannel[]): {
  level: number; // 0-1
  label: string;
  trend: Signal["trend"];
} {
  if (channels.length === 0) return { level: 0, label: "Insufficient data", trend: "stable" };

  // Weighted average — diesel/freight channel gets highest weight
  const weights: Record<string, number> = {
    "Freight costs": 0.35,
    "Crude oil pipeline": 0.25,
    "Import cost amplifier": 0.15,
    "Interest rate pressure": 0.15,
    "Farm input costs": 0.10,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const ch of channels) {
    const w = weights[ch.name] ?? 0.1;
    weightedSum += ch.pressure * w;
    totalWeight += w;
  }

  const level = totalWeight > 0 ? Math.max(0, Math.min(1, (weightedSum / totalWeight + 1) / 2)) : 0.5;
  // level is 0..1 where 0.5 = baseline, >0.5 = elevated, <0.5 = easing

  const normalised = (level - 0.5) * 2; // -1..1

  let label: string;
  let trend: Signal["trend"];
  if (normalised > 0.6) { label = "High"; trend = "critical"; }
  else if (normalised > 0.3) { label = "Elevated"; trend = "up"; }
  else if (normalised > 0.05) { label = "Moderate"; trend = "up"; }
  else if (normalised > -0.1) { label = "Baseline"; trend = "stable"; }
  else { label = "Easing"; trend = "down"; }

  return { level, label, trend };
}

// ── Shelf price impact (from recipe-price price packs) ───────────────────────

/**
 * Category-specific freight cost share of retail price.
 * Fresh produce travels refrigerated, shorter shelf life = higher freight share.
 * Shelf-stable is denser, longer supply chains tolerate delays = lower share.
 */
const CATEGORY_FREIGHT_SHARE: Record<string, number> = {
  produce: 0.15,        // fresh fruit/veg — refrigerated, high spoilage
  meat: 0.12,           // refrigerated, weight-sensitive
  seafood: 0.14,        // cold chain, often air-freighted
  dairy: 0.10,          // refrigerated but dense
  bakery: 0.08,         // local production, short chains
  grains: 0.06,         // shelf-stable, bulk transport
  pantry_staples: 0.05, // shelf-stable, long shelf life
  oils: 0.05,           // dense liquids, shelf-stable
  condiments: 0.06,     // shelf-stable
  legumes: 0.05,        // dried, shelf-stable
  baking: 0.05,         // shelf-stable
  spices: 0.03,         // tiny volumes, high value/weight
};

interface PricePackItem {
  price: number;
  unit: string;
  category: string;
  typical_pack_price?: number;
}

interface ShelfImpact {
  category: string;
  freightShare: number;
  priceImpactPct: number;
  /** Example items with estimated price increase */
  examples: Array<{ name: string; basePrice: number; unit: string; increase: number }>;
}

let cachedPricePack: Record<string, PricePackItem> | null = null;

function loadPricePack(): Record<string, PricePackItem> | null {
  if (cachedPricePack) return cachedPricePack;
  try {
    const raw = readFileSync(
      join(process.cwd(), "src", "data", "price-pack-au-nsw.json"),
      "utf-8"
    );
    const data = JSON.parse(raw);
    cachedPricePack = data.ingredients ?? null;
    return cachedPricePack;
  } catch {
    return null;
  }
}

/** A household weekly basket — common items a family buys */
const WEEKLY_BASKET: Record<string, { qty: number; unit: string }> = {
  white_bread: { qty: 2, unit: "each" },
  full_cream_milk: { qty: 4, unit: "litre" },
  eggs: { qty: 12, unit: "each" },
  chicken_breast: { qty: 1, unit: "kg" },
  beef_mince: { qty: 0.5, unit: "kg" },
  white_rice: { qty: 1, unit: "kg" },
  pasta: { qty: 0.5, unit: "kg" },
  potato: { qty: 2, unit: "kg" },
  onion: { qty: 1, unit: "kg" },
  tomato: { qty: 1, unit: "kg" },
  banana: { qty: 1, unit: "kg" },
  apple: { qty: 1, unit: "kg" },
  butter: { qty: 0.25, unit: "kg" },
  cheddar_cheese: { qty: 0.5, unit: "kg" },
  vegetable_oil: { qty: 0.5, unit: "litre" },
  canned_tomatoes: { qty: 0.8, unit: "kg" },
  white_sugar: { qty: 0.5, unit: "kg" },
  all_purpose_flour: { qty: 0.5, unit: "kg" },
};

function computeBasketImpact(dieselTgp: number): {
  weeklyBasketBase: number;
  weeklyBasketIncrease: number;
  annualIncrease: number;
  categoryBreakdown: Array<{ category: string; label: string; impactPct: number }>;
} | null {
  const pack = loadPricePack();
  if (!pack) return null;

  const dieselDeviation = (dieselTgp - DIESEL_BASELINE) / DIESEL_BASELINE;
  const freightCostIncrease = dieselDeviation * DIESEL_FREIGHT_SHARE;

  let totalBase = 0;
  let totalIncrease = 0;

  for (const [itemKey, basketItem] of Object.entries(WEEKLY_BASKET)) {
    const packItem = pack[itemKey];
    if (!packItem) continue;

    const itemCost = packItem.price * basketItem.qty;
    totalBase += itemCost;

    const freightShare = CATEGORY_FREIGHT_SHARE[packItem.category] ?? 0.06;
    const itemFreightCost = itemCost * freightShare;
    const itemIncrease = itemFreightCost * freightCostIncrease / DIESEL_FREIGHT_SHARE;
    totalIncrease += itemIncrease;
  }

  // Category-level breakdown
  const categories = new Map<string, { label: string; freightShare: number }>();
  const CATEGORY_LABELS: Record<string, string> = {
    produce: "Fresh fruit & veg",
    meat: "Meat",
    dairy: "Dairy",
    bakery: "Bakery",
    grains: "Grains & pasta",
    pantry_staples: "Pantry staples",
    oils: "Oils",
    condiments: "Condiments",
  };

  for (const cat of Object.keys(CATEGORY_FREIGHT_SHARE)) {
    const share = CATEGORY_FREIGHT_SHARE[cat];
    const impactPct = (freightCostIncrease / DIESEL_FREIGHT_SHARE) * share * 100;
    if (CATEGORY_LABELS[cat]) {
      categories.set(cat, { label: CATEGORY_LABELS[cat], freightShare: share });
    }
  }

  const categoryBreakdown = Array.from(categories.entries())
    .map(([cat, info]) => ({
      category: cat,
      label: info.label,
      impactPct: (freightCostIncrease / DIESEL_FREIGHT_SHARE) * info.freightShare * 100,
    }))
    .sort((a, b) => b.impactPct - a.impactPct);

  return {
    weeklyBasketBase: Math.round(totalBase * 100) / 100,
    weeklyBasketIncrease: Math.round(totalIncrease * 100) / 100,
    annualIncrease: Math.round(totalIncrease * 52 * 100) / 100,
    categoryBreakdown,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Build the cascade pressure indicator from already-fetched signals.
 * Called after all other signals have been fetched — this is a derived signal.
 */
export function computeCascadePressure(
  signals: Record<string, Signal>
): Signal | null {
  // Extract inputs from existing signals
  const inputs = extractInputs(signals);

  // Need at least diesel TGP to compute anything meaningful
  if (inputs.dieselTgp === null && inputs.brentCrude === null) return null;

  const channels = computePressureChannels(inputs);
  if (channels.length === 0) return null;

  const overall = computeOverallPressure(channels);

  // Build components from channels
  const components: SignalComponent[] = channels.map((ch) => {
    const pct = Math.round(ch.pressure * 100);
    return {
      label: ch.name,
      value: pct > 0 ? `+${pct}% pressure` : pct < 0 ? `${pct}% (easing)` : "Neutral",
      change: ch.horizon,
      trend: ch.pressure > 0.5 ? "critical" as const :
        ch.pressure > 0.2 ? "up" as const :
        ch.pressure < -0.1 ? "down" as const : "stable" as const,
    };
  });

  // Build context narrative
  const highChannels = channels.filter((c) => c.pressure > 0.3);
  const easingChannels = channels.filter((c) => c.pressure < -0.1);

  let context = `Cascade pressure is ${overall.label.toLowerCase()}.`;

  if (highChannels.length > 0) {
    const names = highChannels.map((c) => c.name.toLowerCase()).join(", ");
    context += ` Pressure building through ${names}.`;
  }

  if (inputs.dieselTgp !== null) {
    const devPct = Math.round(((inputs.dieselTgp - DIESEL_BASELINE) / DIESEL_BASELINE) * 100);
    context += ` Diesel wholesale is ${devPct}% above long-run average — this flows through to everything moved by truck.`;
  }

  if (easingChannels.length > 0) {
    const names = easingChannels.map((c) => c.name.toLowerCase()).join(", ");
    context += ` Some easing in ${names}.`;
  }

  // Time horizon summary
  const nearTerm = channels.filter((c) => c.horizon.includes("week"));
  const medTerm = channels.filter((c) => c.horizon.includes("month"));
  if (nearTerm.length > 0 && medTerm.length > 0) {
    context += ` Near-term pressure (weeks): freight costs. Medium-term (months): farm inputs and rate compounding.`;
  }

  // Shelf price impact — concrete dollar amounts from price pack reference
  let basketContext = "";
  if (inputs.dieselTgp !== null) {
    const basketImpact = computeBasketImpact(inputs.dieselTgp);
    if (basketImpact) {
      basketContext =
        ` Weekly household basket (18 staple items): $${basketImpact.weeklyBasketBase.toFixed(2)} at baseline prices.` +
        ` Estimated freight-driven increase at current diesel: +$${basketImpact.weeklyBasketIncrease.toFixed(2)}/week (~$${basketImpact.annualIncrease.toFixed(0)}/year).` +
        ` This is a structural estimate based on published freight cost shares, not a forecast of what you will pay.`;

      // Add highest-impact categories
      const topCats = basketImpact.categoryBreakdown.slice(0, 3);
      if (topCats.length > 0) {
        basketContext += ` Hardest-hit categories: ${topCats.map((c) => `${c.label} (+${c.impactPct.toFixed(1)}%)`).join(", ")}.`;
      }

      basketContext += ` Based on NSW metro prices (Dec 2025) via Anuna recipe-price. Freight-only impact — does not include farm input costs, energy, or labour.`;

      // Add basket impact as a component
      components.push({
        label: "Est. freight cost on groceries",
        value: `+$${basketImpact.weeklyBasketIncrease.toFixed(2)}/week`,
        change: `~$${basketImpact.annualIncrease.toFixed(0)}/year (structural estimate)`,
        trend: basketImpact.weeklyBasketIncrease > 5 ? "critical" :
          basketImpact.weeklyBasketIncrease > 2 ? "up" : "stable",
      });
    }
  }

  return {
    label: "Cascade pressure indicator",
    value: overall.label,
    trend: overall.trend,
    source: "Derived from upstream signals + Anuna recipe-price",
    sourceUrl: "/methodology",
    context: context + basketContext,
    lastUpdated: new Date().toISOString(),
    automated: true,
    layer: 4,
    layerLabel: "Cost-of-living pressure (derived)",
    propagatesTo: "Grocery prices, transport costs, household budgets — typically 2-8 weeks for fuel-linked, 3-9 months for agricultural inputs",
    components,
  };
}

// ── Input extraction from signal objects ──────────────────────────────────────

function extractInputs(signals: Record<string, Signal>): CascadeInputs {
  const dieselSig = signals.dieselTgp;
  const brentSig = signals.brentCrude;
  const crackSig = signals.crackSpread;
  const audSig = signals.audUsd;
  const rbaSig = signals.rbaCashRate;
  const farmSig = signals.farmInputs;

  return {
    dieselTgp: parsePrice(dieselSig?.value),
    dieselTgpWeekAgo: parsePriceFromRegions(dieselSig, "week"),
    dieselTgpMonthAgo: null, // would need historical tracking — future enhancement
    brentCrude: parseUsdPrice(brentSig?.value),
    brentTrend: brentSig?.trend ?? null,
    crackTrend: crackSig?.trend ?? null,
    audUsd: parseAudUsd(audSig?.value),
    audTrend: audSig?.trend ?? null,
    rbaCashRate: parseRate(rbaSig?.value),
    farmInputsTrend: farmSig?.trend ?? null,
  };
}

function parsePrice(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/([\d.]+)\s*c\/L/);
  return match ? parseFloat(match[1]) : null;
}

function parseUsdPrice(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/US?\$([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function parseAudUsd(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/US?\$([\d.]+)/);
  if (match) return parseFloat(match[1]);
  const match2 = value.match(/([\d.]+)/);
  return match2 ? parseFloat(match2[1]) : null;
}

function parseRate(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/([\d.]+)%/);
  return match ? parseFloat(match[1]) : null;
}

function parsePriceFromRegions(
  signal: Signal | undefined,
  _period: string
): number | null {
  // The diesel TGP signal includes weekly change in its context text
  // For now, extract from context narrative if available
  if (!signal?.context) return null;
  const match = signal.context.match(/(?:Up|Down)\s+([\d.]+)\s*c\/L/);
  if (!match) return null;
  const current = parsePrice(signal.value);
  if (!current) return null;
  const change = parseFloat(match[1]);
  // Determine direction from context
  const isUp = signal.context.includes("Up ");
  return isUp ? current - change : current + change;
}
