/**
 * WA FuelWatch — Retail Fuel Analytics
 *
 * The only fully transparent fuel pricing data in Australia.
 * Daily station-level prices for all WA retailers — no auth, no scraping.
 *
 * Products: 1=ULP, 2=PULP, 4=Diesel, 5=LPG, 6=98RON, 11=E10
 *
 * We fetch diesel, ULP, P98, and E10 — presenting all fuel types in
 * one card with diesel as the headline (it drives the cascade).
 * Metro/regional split, brand analytics on diesel.
 */

import type { Signal, SignalComponent, RegionalValue } from "./types";

const FUELWATCH_BASE =
  "https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS";

// Perth metro bounding box (approximate)
const PERTH_METRO = {
  latMin: -32.4,
  latMax: -31.5,
  lngMin: 115.5,
  lngMax: 116.2,
};

// Major brands (vertically integrated or major franchise)
const MAJOR_BRANDS = new Set([
  "BP", "Shell", "Ampol", "Caltex", "Viva",
  "Reddy Express", // Viva subsidiary
]);

// Fuel types to fetch
const FUEL_TYPES = [
  { id: 4, name: "Diesel", preCrisis: 178 },
  { id: 1, name: "ULP 91", preCrisis: 165 },
  { id: 6, name: "P98", preCrisis: 195 },
  { id: 11, name: "E10", preCrisis: 160 },
] as const;

interface Station {
  brand: string;
  price: number; // cents per litre
  location: string;
  lat: number;
  lng: number;
  isMetro: boolean;
}

function parseStations(xml: string): Station[] {
  const stations: Station[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const price = block.match(/<price>([\d.]+)<\/price>/)?.[1];
    const brand = block.match(/<brand>([^<]+)<\/brand>/)?.[1];
    const location = block.match(/<location>([^<]+)<\/location>/)?.[1];
    const lat = block.match(/<latitude>([-\d.]+)<\/latitude>/)?.[1];
    const lng = block.match(/<longitude>([-\d.]+)<\/longitude>/)?.[1];

    if (price && brand && location && lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      stations.push({
        brand,
        price: parseFloat(price),
        location,
        lat: latNum,
        lng: lngNum,
        isMetro:
          latNum >= PERTH_METRO.latMin &&
          latNum <= PERTH_METRO.latMax &&
          lngNum >= PERTH_METRO.lngMin &&
          lngNum <= PERTH_METRO.lngMax,
      });
    }
  }
  return stations;
}

function extractDate(xml: string): string | null {
  const dateMatch = xml.match(/<date>(\d{4}-\d{2}-\d{2})<\/date>/);
  return dateMatch ? dateMatch[1] : null;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

interface FuelAnalytics {
  name: string;
  preCrisis: number;
  stationCount: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  spread: number;
  metro: { mean: number; count: number } | null;
  regional: { mean: number; count: number } | null;
  metroRegionalGap: number | null;
  brands: {
    majors: { mean: number; count: number };
    independents: { mean: number; count: number };
    majorIndyGap: number;
    cheapestBrand: { name: string; mean: number; count: number };
    dearestBrand: { name: string; mean: number; count: number };
  };
}

function computeAnalytics(stations: Station[], name: string, preCrisis: number): FuelAnalytics | null {
  if (stations.length === 0) return null;

  const prices = stations.map((s) => s.price);
  const metroStations = stations.filter((s) => s.isMetro);
  const regionalStations = stations.filter((s) => !s.isMetro);

  // Brand analytics
  const brandMap = new Map<string, number[]>();
  for (const s of stations) {
    if (!brandMap.has(s.brand)) brandMap.set(s.brand, []);
    brandMap.get(s.brand)!.push(s.price);
  }

  const majorPrices: number[] = [];
  const indyPrices: number[] = [];
  for (const s of stations) {
    if (MAJOR_BRANDS.has(s.brand)) majorPrices.push(s.price);
    else indyPrices.push(s.price);
  }

  const brandAvgs = Array.from(brandMap.entries())
    .filter(([, p]) => p.length >= 3)
    .map(([bName, p]) => ({ name: bName, mean: avg(p), count: p.length }))
    .sort((a, b) => a.mean - b.mean);

  const cheapestBrand = brandAvgs[0] ?? { name: "Unknown", mean: 0, count: 0 };
  const dearestBrand = brandAvgs[brandAvgs.length - 1] ?? { name: "Unknown", mean: 0, count: 0 };

  return {
    name,
    preCrisis,
    stationCount: stations.length,
    mean: avg(prices),
    median: median(prices),
    min: Math.min(...prices),
    max: Math.max(...prices),
    spread: Math.max(...prices) - Math.min(...prices),
    metro: metroStations.length > 0
      ? { mean: avg(metroStations.map((s) => s.price)), count: metroStations.length }
      : null,
    regional: regionalStations.length > 0
      ? { mean: avg(regionalStations.map((s) => s.price)), count: regionalStations.length }
      : null,
    metroRegionalGap:
      metroStations.length > 0 && regionalStations.length > 0
        ? avg(regionalStations.map((s) => s.price)) - avg(metroStations.map((s) => s.price))
        : null,
    brands: {
      majors: { mean: majorPrices.length > 0 ? avg(majorPrices) : 0, count: majorPrices.length },
      independents: { mean: indyPrices.length > 0 ? avg(indyPrices) : 0, count: indyPrices.length },
      majorIndyGap: majorPrices.length > 0 && indyPrices.length > 0
        ? avg(majorPrices) - avg(indyPrices) : 0,
      cheapestBrand,
      dearestBrand,
    },
  };
}

async function fetchFuelWatchRSS(product: number): Promise<{ xml: string; date: string | null } | null> {
  try {
    const res = await fetch(`${FUELWATCH_BASE}?Product=${product}&Day=today`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const xml = await res.text();
    return { xml, date: extractDate(xml) };
  } catch {
    return null;
  }
}

// ── Combined WA fuel signal ─────────────────────────────────────────────────

export async function fetchWaFuel(): Promise<Signal | null> {
  // Fetch all fuel types in parallel
  const feeds = await Promise.all(
    FUEL_TYPES.map(async (ft) => {
      const feed = await fetchFuelWatchRSS(ft.id);
      if (!feed) return null;
      const stations = parseStations(feed.xml);
      const analytics = computeAnalytics(stations, ft.name, ft.preCrisis);
      return { feed, analytics, ...ft };
    })
  );

  // Diesel is required — it's the headline
  const dieselResult = feeds[0];
  if (!dieselResult?.analytics) return null;
  const diesel = dieselResult.analytics;

  const dieselIncrease = ((diesel.mean - diesel.preCrisis) / diesel.preCrisis) * 100;
  const trend =
    diesel.mean > 300
      ? ("critical" as const)
      : diesel.mean > 220
        ? ("up" as const)
        : ("stable" as const);

  // Components: fuel type overview first, then diesel metro/regional + brand breakdown
  const components: SignalComponent[] = [];

  // Fuel type price overview
  for (const result of feeds) {
    if (!result?.analytics) continue;
    const a = result.analytics;
    const increase = ((a.median - a.preCrisis) / a.preCrisis) * 100;
    components.push({
      label: a.name,
      value: `$${(a.median / 100).toFixed(2)}/L`,
      change: `${a.stationCount} stations — ${increase > 0 ? "+" : ""}${increase.toFixed(0)}% from pre-crisis`,
      trend: a.mean > 300 ? "critical" : a.mean > 220 ? "up" : "stable",
    });
  }

  // Diesel metro/regional breakdown
  if (diesel.metro && diesel.regional) {
    components.push({
      label: "Diesel — Perth metro",
      value: `${diesel.metro.mean.toFixed(1)} c/L`,
      change: `${diesel.metro.count} stations`,
      trend: diesel.metro.mean > 300 ? "critical" : diesel.metro.mean > 220 ? "up" : "stable",
    });
    components.push({
      label: "Diesel — Regional WA",
      value: `${diesel.regional.mean.toFixed(1)} c/L`,
      change: `${diesel.regional.count} stations (+${diesel.metroRegionalGap!.toFixed(0)} c/L gap)`,
      trend: diesel.regional.mean > 300 ? "critical" : diesel.regional.mean > 220 ? "up" : "stable",
    });
  }

  // Diesel brand breakdown
  components.push({
    label: "Diesel — Major brands (BP, Shell, Ampol)",
    value: `${diesel.brands.majors.mean.toFixed(1)} c/L`,
    change: `${diesel.brands.majors.count} stations`,
    trend: diesel.brands.majorIndyGap > 5 ? "up" : "stable",
  });
  components.push({
    label: `Diesel — Independents (cheapest: ${diesel.brands.cheapestBrand.name})`,
    value: `${diesel.brands.independents.mean.toFixed(1)} c/L`,
    change: `${diesel.brands.independents.count} stations (${diesel.brands.majorIndyGap.toFixed(0)} c/L cheaper)`,
    trend: "stable",
  });

  // Context narrative — diesel-led since it drives the cascade
  let context =
    `${diesel.stationCount} WA stations reporting diesel today. ` +
    `Diesel median ${diesel.median.toFixed(1)} c/L, range ${diesel.min.toFixed(0)}–${diesel.max.toFixed(0)} c/L (spread: ${diesel.spread.toFixed(0)} c/L). ` +
    `Up ${dieselIncrease.toFixed(0)}% from pre-crisis levels.`;

  if (diesel.metroRegionalGap !== null) {
    context += ` Regional stations are ${diesel.metroRegionalGap.toFixed(0)} c/L above Perth metro on average — ${diesel.metroRegionalGap > 20 ? "a significant gap that compounds cost-of-living pressure in remote communities" : "a typical metro-regional differential"}.`;
  }

  if (diesel.brands.majorIndyGap > 3) {
    context +=
      ` Major brands are ${diesel.brands.majorIndyGap.toFixed(0)} c/L above independents. ` +
      `${diesel.brands.cheapestBrand.name} is cheapest at ${diesel.brands.cheapestBrand.mean.toFixed(1)} c/L. ` +
      `The spread between brands is itself a signal of market power — where there's competition, prices are lower.`;
  }

  // Add other fuel type summaries
  const otherFuels = feeds.filter((f) => f?.analytics && f.name !== "Diesel");
  if (otherFuels.length > 0) {
    const summaries = otherFuels
      .map((f) => `${f!.analytics!.name} $${(f!.analytics!.median / 100).toFixed(2)}/L`)
      .join(", ");
    context += ` Other fuels: ${summaries}.`;
  }

  context += ` WA is the only state with fully transparent pricing. This data is a proxy for national retail conditions.`;

  const feedDate = dieselResult.feed.date;

  return {
    label: "WA fuel retail",
    value: `Diesel $${(diesel.median / 100).toFixed(2)}/L`,
    trend,
    source: `FuelWatch WA — ${feedDate ?? "today"}`,
    sourceUrl: "https://www.fuelwatch.wa.gov.au/",
    context,
    lastUpdated: feedDate ? new Date(feedDate).toISOString() : new Date().toISOString(),
    automated: true,
    layer: 4,
    layerLabel: "Retail impact",
    propagatesTo: "Household transport costs, freight costs, business operating costs",
    components,
  };
}

// ── Wholesale→Retail margin signal ───────────────────────────────────────────

/**
 * Compute the margin between Perth TGP (wholesale) and WA metro pump price.
 * This requires both the TGP signal and WA retail signal to be available.
 * Called from the signals index after both have been fetched.
 */
export function computeRetailMargin(
  signals: Record<string, Signal>
): Signal | null {
  const dieselTgp = signals.dieselTgp;
  const waFuel = signals.waFuel;

  if (!dieselTgp || !waFuel) return null;

  // Extract Perth TGP from regions
  const perthTgp = dieselTgp.regions?.find((r) => r.region === "Perth");
  const perthTgpValue = perthTgp ? parseFloat(perthTgp.value) : null;

  // Extract WA metro retail from components
  const metroComp = waFuel.components?.find((c) => c.label.includes("Perth metro"));
  const metroRetail = metroComp ? parseFloat(metroComp.value) : null;

  if (perthTgpValue === null || isNaN(perthTgpValue) || metroRetail === null || isNaN(metroRetail)) {
    return null;
  }

  const margin = metroRetail - perthTgpValue;
  const marginPct = (margin / perthTgpValue) * 100;

  // Historical context: pre-crisis retail margins were typically 10-15 c/L (6-9%)
  const isElevated = margin > 20;
  const isCompressed = margin < 5;

  const trend: Signal["trend"] = isElevated ? "up" : isCompressed ? "down" : "stable";

  const context =
    `Perth wholesale diesel (TGP): ${perthTgpValue.toFixed(1)} c/L. ` +
    `Perth metro retail average: ${metroRetail.toFixed(1)} c/L. ` +
    `Retail margin: ${margin.toFixed(1)} c/L (${marginPct.toFixed(1)}%). ` +
    (isElevated
      ? `Margin is above the typical 10-15 c/L range — retailers may be extracting additional margin from the crisis. The ACCC is currently investigating pricing conduct by Ampol, BP, Mobil, and Viva.`
      : isCompressed
        ? `Margin is compressed below historical norms — retailers are absorbing some wholesale cost, likely due to competitive pressure. This is typically temporary.`
        : `Margin is within the typical 10-15 c/L range. Wholesale price movements are being passed through normally.`) +
    ` When margins widen during a crisis, it signals that retailers are pricing above cost-justified levels. When they compress, retailers are absorbing pain — temporarily.`;

  return {
    label: "Wholesale→retail margin (diesel)",
    value: `${margin.toFixed(0)} c/L (${marginPct.toFixed(1)}%)`,
    trend,
    source: "Derived: Perth TGP vs WA FuelWatch metro",
    sourceUrl: "https://www.fuelwatch.wa.gov.au/",
    context,
    lastUpdated: new Date().toISOString(),
    automated: true,
    layer: 4,
    layerLabel: "Retail impact — margin analysis",
    propagatesTo: "If margins widen, pump prices rise faster than wholesale. If they compress, there's temporary buffering.",
  };
}
