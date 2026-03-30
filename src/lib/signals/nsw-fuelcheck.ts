/**
 * NSW FuelCheck — Live fuel prices via api.onegov.nsw.gov.au
 *
 * Uses the FuelCheckApp API with apikey authentication.
 * Free tier: 2,500 calls/month, 5/min.
 *
 * Single API call returns all fuel types across all NSW stations.
 * We present all fuel types in one card with diesel as headline
 * (it drives the cascade), plus metro/regional and brand analytics.
 *
 * Sydney metro postcodes: 2000-2249.
 */

import type { Signal, SignalComponent } from "./types";

const API_URL =
  "https://api.onegov.nsw.gov.au/FuelCheckApp/v1/fuel/prices";

// Major brands (vertically integrated or major franchise)
const MAJOR_BRANDS = new Set([
  "BP", "Shell", "Ampol", "Ampol Foodary", "EG Ampol",
  "Mobil", "Reddy Express",
]);

// Fuel types to report — diesel first (cascade driver)
const FUEL_TYPES = [
  { code: "DL", name: "Diesel", preCrisis: 172 },
  { code: "U91", name: "ULP 91", preCrisis: 165 },
  { code: "P98", name: "P98", preCrisis: 195 },
  { code: "E10", name: "E10", preCrisis: 160 },
] as const;

interface ApiStation {
  code: string;
  name: string;
  address: string;
  brand: string;
}

interface ApiPrice {
  stationcode: string;
  fueltype: string;
  price: number;
  lastupdated: string;
}

interface StationPrice {
  price: number; // cents per litre
  brand: string;
  isMetro: boolean;
}

function extractPostcode(address: string): number | null {
  const match = address.match(/(\d{4})\s*$/);
  return match ? parseInt(match[1], 10) : null;
}

function isSydneyMetro(postcode: number): boolean {
  return postcode >= 2000 && postcode <= 2249;
}

function parseDate(dateStr: string): Date | null {
  const parts = dateStr.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/
  );
  if (!parts) return null;
  return new Date(
    parseInt(parts[3]),
    parseInt(parts[2]) - 1,
    parseInt(parts[1]),
    parseInt(parts[4]),
    parseInt(parts[5]),
    parseInt(parts[6] ?? "0")
  );
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface FuelTypeAnalytics {
  name: string;
  code: string;
  preCrisis: number;
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  spread: number;
  metro: { mean: number; count: number } | null;
  regional: { mean: number; count: number } | null;
  metroRegionalGap: number | null;
  brands: {
    majorMean: number;
    majorCount: number;
    indyMean: number;
    indyCount: number;
    gap: number;
    cheapest: { name: string; mean: number; count: number };
  };
}

function analyseType(
  stations: StationPrice[],
  name: string,
  code: string,
  preCrisis: number
): FuelTypeAnalytics | null {
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

  const majorPrices = stations.filter((s) => MAJOR_BRANDS.has(s.brand)).map((s) => s.price);
  const indyPrices = stations.filter((s) => !MAJOR_BRANDS.has(s.brand)).map((s) => s.price);

  const brandAvgs = Array.from(brandMap.entries())
    .filter(([, p]) => p.length >= 3)
    .map(([bName, p]) => ({ name: bName, mean: avg(p), count: p.length }))
    .sort((a, b) => a.mean - b.mean);

  return {
    name,
    code,
    preCrisis,
    count: stations.length,
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
      majorMean: majorPrices.length > 0 ? avg(majorPrices) : 0,
      majorCount: majorPrices.length,
      indyMean: indyPrices.length > 0 ? avg(indyPrices) : 0,
      indyCount: indyPrices.length,
      gap: majorPrices.length > 0 && indyPrices.length > 0
        ? avg(majorPrices) - avg(indyPrices) : 0,
      cheapest: brandAvgs[0] ?? { name: "Unknown", mean: 0, count: 0 },
    },
  };
}

export async function fetchNswFuel(): Promise<Signal | null> {
  const apiKey = process.env.NSW_FUELCHECK_API_KEY;
  if (!apiKey) return null;

  try {
    const now = new Date();
    const timestamp = [
      now.getUTCDate().toString().padStart(2, "0"),
      (now.getUTCMonth() + 1).toString().padStart(2, "0"),
      now.getUTCFullYear(),
    ].join("/") + " " + [
      now.getUTCHours().toString().padStart(2, "0"),
      now.getUTCMinutes().toString().padStart(2, "0"),
      now.getUTCSeconds().toString().padStart(2, "0"),
    ].join(":");

    const res = await fetch(API_URL, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(30000),
      headers: {
        apikey: apiKey,
        requesttimestamp: timestamp,
      },
    });
    if (!res.ok) return null;

    const data: { stations: ApiStation[]; prices: ApiPrice[] } = await res.json();
    if (!data.stations?.length || !data.prices?.length) return null;

    // Build station lookup
    const stationLookup = new Map<string, { brand: string; postcode: number | null }>();
    for (const s of data.stations) {
      stationLookup.set(s.code, {
        brand: s.brand,
        postcode: extractPostcode(s.address),
      });
    }

    // Group prices by fuel type
    const byType = new Map<string, StationPrice[]>();
    for (const p of data.prices) {
      const priceCents = p.price; // already in cents
      if (priceCents <= 0 || priceCents > 1000) continue; // sanity: 0 to $10/L

      const station = stationLookup.get(p.stationcode);
      const pc = station?.postcode;

      if (!byType.has(p.fueltype)) byType.set(p.fueltype, []);
      byType.get(p.fueltype)!.push({
        price: priceCents,
        brand: station?.brand ?? "Unknown",
        isMetro: pc ? isSydneyMetro(pc) : false,
      });
    }

    // Analyse each fuel type
    const analytics: FuelTypeAnalytics[] = [];
    for (const ft of FUEL_TYPES) {
      const stations = byType.get(ft.code);
      if (!stations || stations.length === 0) continue;
      const a = analyseType(stations, ft.name, ft.code, ft.preCrisis);
      if (a) analytics.push(a);
    }

    // Diesel is required as headline
    const diesel = analytics.find((a) => a.code === "DL");
    if (!diesel) return null;

    const dieselIncrease = ((diesel.mean - diesel.preCrisis) / diesel.preCrisis) * 100;
    const trend =
      diesel.mean > 300
        ? ("critical" as const)
        : diesel.mean > 220
          ? ("up" as const)
          : ("stable" as const);

    // Most recent update
    const dates = data.prices
      .filter((p) => p.lastupdated)
      .map((p) => parseDate(p.lastupdated))
      .filter((d): d is Date => d !== null);
    const mostRecent =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : null;

    // Components: fuel type overview, then diesel metro/regional + brand
    const components: SignalComponent[] = [];

    // All fuel types
    for (const a of analytics) {
      const increase = ((a.median - a.preCrisis) / a.preCrisis) * 100;
      components.push({
        label: a.name,
        value: `$${(a.median / 100).toFixed(2)}/L`,
        change: `${a.count} stations — ${increase > 0 ? "+" : ""}${increase.toFixed(0)}% from pre-crisis`,
        trend: a.mean > 300 ? "critical" : a.mean > 220 ? "up" : "stable",
      });
    }

    // Diesel metro/regional
    if (diesel.metro && diesel.regional) {
      components.push({
        label: "Diesel — Sydney metro",
        value: `${diesel.metro.mean.toFixed(1)} c/L`,
        change: `${diesel.metro.count} stations`,
        trend: diesel.metro.mean > 300 ? "critical" : diesel.metro.mean > 220 ? "up" : "stable",
      });
      components.push({
        label: "Diesel — Regional NSW",
        value: `${diesel.regional.mean.toFixed(1)} c/L`,
        change: `${diesel.regional.count} stations (+${diesel.metroRegionalGap!.toFixed(0)} c/L gap)`,
        trend: diesel.regional.mean > 300 ? "critical" : diesel.regional.mean > 220 ? "up" : "stable",
      });
    }

    // Diesel brand breakdown
    if (diesel.brands.majorCount > 0 && diesel.brands.indyCount > 0) {
      components.push({
        label: "Diesel — Major brands (BP, Shell, Ampol)",
        value: `${diesel.brands.majorMean.toFixed(1)} c/L`,
        change: `${diesel.brands.majorCount} stations`,
        trend: diesel.brands.gap > 5 ? "up" : "stable",
      });
      components.push({
        label: `Diesel — Independents (cheapest: ${diesel.brands.cheapest.name})`,
        value: `${diesel.brands.indyMean.toFixed(1)} c/L`,
        change: `${diesel.brands.indyCount} stations (${diesel.brands.gap.toFixed(0)} c/L cheaper)`,
        trend: "stable",
      });
    }

    // Context narrative
    let context =
      `${diesel.count} NSW stations reporting diesel. ` +
      `Diesel median ${diesel.median.toFixed(1)} c/L, range ${diesel.min.toFixed(0)}–${diesel.max.toFixed(0)} c/L (spread: ${diesel.spread.toFixed(0)} c/L). ` +
      `Up ${dieselIncrease.toFixed(0)}% from pre-crisis levels.`;

    if (diesel.metroRegionalGap !== null) {
      context += ` Regional stations are ${diesel.metroRegionalGap.toFixed(0)} c/L ${diesel.metroRegionalGap > 0 ? "above" : "below"} Sydney metro on average — ${Math.abs(diesel.metroRegionalGap) > 20 ? "a significant gap that compounds cost-of-living pressure in regional communities" : "a typical metro-regional differential"}.`;
    }

    if (diesel.brands.gap > 3) {
      context +=
        ` Major brands are ${diesel.brands.gap.toFixed(0)} c/L above independents. ` +
        `${diesel.brands.cheapest.name} is cheapest at ${diesel.brands.cheapest.mean.toFixed(1)} c/L. ` +
        `The spread between brands is itself a signal of market power.`;
    }

    // Other fuel type summaries
    const otherFuels = analytics.filter((a) => a.code !== "DL");
    if (otherFuels.length > 0) {
      const summaries = otherFuels
        .map((a) => `${a.name} $${(a.median / 100).toFixed(2)}/L`)
        .join(", ");
      context += ` Other fuels: ${summaries}.`;
    }

    return {
      label: "NSW fuel retail",
      value: `Diesel $${(diesel.median / 100).toFixed(2)}/L`,
      trend,
      source: `NSW FuelCheck — ${diesel.count} diesel stations`,
      sourceUrl: "https://www.fuelcheck.nsw.gov.au/app",
      context,
      lastUpdated: mostRecent?.toISOString() ?? new Date().toISOString(),
      automated: true,
      layer: 4,
      layerLabel: "Retail impact",
      propagatesTo: "Household transport costs, freight costs, business operating costs",
      components,
    };
  } catch {
    return null;
  }
}
