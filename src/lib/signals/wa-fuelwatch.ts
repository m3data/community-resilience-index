/**
 * WA FuelWatch — Retail Fuel Analytics
 *
 * The only fully transparent fuel pricing data in Australia.
 * Daily station-level prices for all WA retailers — no auth, no scraping.
 *
 * Products: 1=ULP, 2=PULP, 4=Diesel, 5=LPG, 6=98RON, 11=E10
 *
 * We extract:
 *   - State average, median, min, max
 *   - Metro vs regional spread (Perth metro lat/lng box)
 *   - Brand-level averages (majors vs independents)
 *   - Wholesale→retail margin (Perth TGP vs WA metro pump)
 *   - Station count and availability indicator
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
  // Match each <item> block
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

interface RetailAnalytics {
  stationCount: number;
  date: string | null;
  prices: {
    mean: number;
    median: number;
    min: number;
    max: number;
    spread: number;
  };
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

function computeAnalytics(stations: Station[]): RetailAnalytics | null {
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

  // Find cheapest and dearest brand (min 3 stations)
  const brandAvgs = Array.from(brandMap.entries())
    .filter(([, p]) => p.length >= 3)
    .map(([name, p]) => ({ name, mean: avg(p), count: p.length }))
    .sort((a, b) => a.mean - b.mean);

  const cheapestBrand = brandAvgs[0] ?? { name: "Unknown", mean: 0, count: 0 };
  const dearestBrand = brandAvgs[brandAvgs.length - 1] ?? { name: "Unknown", mean: 0, count: 0 };

  return {
    stationCount: stations.length,
    date: null, // set by caller
    prices: {
      mean: avg(prices),
      median: median(prices),
      min: Math.min(...prices),
      max: Math.max(...prices),
      spread: Math.max(...prices) - Math.min(...prices),
    },
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
        ? avg(majorPrices) - avg(indyPrices)
        : 0,
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

// ── Diesel signal ────────────────────────────────────────────────────────────

export async function fetchWaDiesel(): Promise<Signal | null> {
  const feed = await fetchFuelWatchRSS(4); // diesel
  if (!feed) return null;

  const stations = parseStations(feed.xml);
  const analytics = computeAnalytics(stations);
  if (!analytics) return null;

  const preCrisis = 178; // c/L pre-crisis baseline
  const increase = ((analytics.prices.mean - preCrisis) / preCrisis) * 100;

  const trend =
    analytics.prices.mean > 300
      ? ("critical" as const)
      : analytics.prices.mean > 220
        ? ("up" as const)
        : ("stable" as const);

  // Components: the analytical breakdown
  const components: SignalComponent[] = [];

  if (analytics.metro && analytics.regional) {
    components.push({
      label: "Perth metro average",
      value: `${analytics.metro.mean.toFixed(1)} c/L`,
      change: `${analytics.metro.count} stations`,
      trend: analytics.metro.mean > 300 ? "critical" : analytics.metro.mean > 220 ? "up" : "stable",
    });
    components.push({
      label: "Regional WA average",
      value: `${analytics.regional.mean.toFixed(1)} c/L`,
      change: `${analytics.regional.count} stations (+${analytics.metroRegionalGap!.toFixed(0)} c/L gap)`,
      trend: analytics.regional.mean > 300 ? "critical" : analytics.regional.mean > 220 ? "up" : "stable",
    });
  }

  components.push({
    label: "Major brands (BP, Shell, Ampol)",
    value: `${analytics.brands.majors.mean.toFixed(1)} c/L`,
    change: `${analytics.brands.majors.count} stations`,
    trend: analytics.brands.majorIndyGap > 5 ? "up" : "stable",
  });
  components.push({
    label: `Independents (cheapest: ${analytics.brands.cheapestBrand.name})`,
    value: `${analytics.brands.independents.mean.toFixed(1)} c/L`,
    change: `${analytics.brands.independents.count} stations (${analytics.brands.majorIndyGap.toFixed(0)} c/L cheaper)`,
    trend: "stable",
  });

  // Context narrative
  let context =
    `${analytics.stationCount} WA stations reporting diesel today. ` +
    `Median ${analytics.prices.median.toFixed(1)} c/L, range ${analytics.prices.min.toFixed(0)}–${analytics.prices.max.toFixed(0)} c/L (spread: ${analytics.prices.spread.toFixed(0)} c/L). ` +
    `Up ${increase.toFixed(0)}% from pre-crisis levels.`;

  if (analytics.metroRegionalGap !== null) {
    context += ` Regional stations are ${analytics.metroRegionalGap.toFixed(0)} c/L above Perth metro on average — ${analytics.metroRegionalGap > 20 ? "a significant gap that compounds cost-of-living pressure in remote communities" : "a typical metro-regional differential"}.`;
  }

  if (analytics.brands.majorIndyGap > 3) {
    context +=
      ` Major brands (BP, Shell, Ampol) are ${analytics.brands.majorIndyGap.toFixed(0)} c/L above independents. ` +
      `${analytics.brands.cheapestBrand.name} is cheapest at ${analytics.brands.cheapestBrand.mean.toFixed(1)} c/L. ` +
      `The spread between brands is itself a signal of market power — where there's competition, prices are lower.`;
  }

  context += ` WA is the only state with fully transparent pricing. This data is a proxy for national retail conditions.`;

  return {
    label: "WA diesel retail",
    value: `$${(analytics.prices.median / 100).toFixed(2)}/L`,
    trend,
    source: `FuelWatch WA — ${feed.date ?? "today"}`,
    sourceUrl: "https://www.fuelwatch.wa.gov.au/",
    context,
    lastUpdated: feed.date ? new Date(feed.date).toISOString() : new Date().toISOString(),
    automated: true,
    layer: 4,
    layerLabel: "Retail impact",
    propagatesTo: "Household transport costs, freight costs, business operating costs",
    components,
  };
}

// ── Petrol signal ────────────────────────────────────────────────────────────

export async function fetchWaPetrol(): Promise<Signal | null> {
  const feed = await fetchFuelWatchRSS(1); // ULP
  if (!feed) return null;

  const stations = parseStations(feed.xml);
  const analytics = computeAnalytics(stations);
  if (!analytics) return null;

  const preCrisis = 165; // c/L
  const increase = ((analytics.prices.mean - preCrisis) / preCrisis) * 100;

  const trend =
    analytics.prices.mean > 260
      ? ("critical" as const)
      : analytics.prices.mean > 200
        ? ("up" as const)
        : ("stable" as const);

  const components: SignalComponent[] = [];

  if (analytics.metro && analytics.regional) {
    components.push({
      label: "Perth metro",
      value: `${analytics.metro.mean.toFixed(1)} c/L`,
      change: `${analytics.metro.count} stations`,
    });
    components.push({
      label: "Regional WA",
      value: `${analytics.regional.mean.toFixed(1)} c/L`,
      change: `+${analytics.metroRegionalGap!.toFixed(0)} c/L gap`,
    });
  }

  const context =
    `${analytics.stationCount} WA stations reporting ULP today. ` +
    `Median ${analytics.prices.median.toFixed(1)} c/L, range ${analytics.prices.min.toFixed(0)}–${analytics.prices.max.toFixed(0)} c/L. ` +
    `Up ${increase.toFixed(0)}% from pre-crisis. ` +
    `Majors at ${analytics.brands.majors.mean.toFixed(1)} c/L vs independents at ${analytics.brands.independents.mean.toFixed(1)} c/L.`;

  return {
    label: "WA petrol retail",
    value: `$${(analytics.prices.median / 100).toFixed(2)}/L`,
    trend,
    source: `FuelWatch WA — ${feed.date ?? "today"}`,
    sourceUrl: "https://www.fuelwatch.wa.gov.au/",
    context,
    lastUpdated: feed.date ? new Date(feed.date).toISOString() : new Date().toISOString(),
    automated: true,
    layer: 4,
    layerLabel: "Retail impact",
    propagatesTo: "Household transport costs — 70% of Australian commuters drive",
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
  const waDiesel = signals.waDiesel;

  if (!dieselTgp || !waDiesel) return null;

  // Extract Perth TGP from regions
  const perthTgp = dieselTgp.regions?.find((r) => r.region === "Perth");
  const perthTgpValue = perthTgp ? parseFloat(perthTgp.value) : null;

  // Extract WA metro retail from components
  const metroComp = waDiesel.components?.find((c) => c.label.includes("metro"));
  const metroRetail = metroComp ? parseFloat(metroComp.value) : null;

  if (perthTgpValue === null || isNaN(perthTgpValue) || metroRetail === null || isNaN(metroRetail)) {
    return null;
  }

  const margin = metroRetail - perthTgpValue;
  const marginPct = (margin / perthTgpValue) * 100;

  // Historical context: pre-crisis retail margins were typically 10-15 c/L (6-9%)
  const historicalMargin = 12; // c/L typical
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
