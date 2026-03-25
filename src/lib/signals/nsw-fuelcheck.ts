/**
 * NSW FuelCheck — Diesel prices via data.nsw.gov.au CKAN API
 *
 * No API key required for basic GET queries.
 * FuelCode "DL" = diesel. Prices are in cents per litre (e.g. 239.9).
 * Dataset updates daily with station-level pricing across NSW.
 *
 * We compute a statewide average plus metro/regional split using postcodes.
 * Sydney metro postcodes: 2000-2249. Regional: everything else.
 */

import type { Signal } from "./types";

const CKAN_API = "https://data.nsw.gov.au/data/api/action/datastore_search";
const RESOURCE_ID = "df5c9553-433c-4a90-a5a9-de19ecc543f6";

interface FuelRecord {
  Price: string;
  Postcode: string;
  Suburb: string;
  PriceUpdatedDate: string;
}

function isSydneyMetro(postcode: string): boolean {
  const pc = parseInt(postcode, 10);
  return pc >= 2000 && pc <= 2249;
}

export async function fetchNswDiesel(): Promise<Signal | null> {
  try {
    // Fetch diesel records — API returns most recent prices per station
    const url = `${CKAN_API}?resource_id=${RESOURCE_ID}&filters=${encodeURIComponent(JSON.stringify({ FuelCode: "DL" }))}&limit=5000`;

    const res = await fetch(url, {
      next: { revalidate: 3600 }, // cache 1h
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.success || !data.result?.records?.length) return null;

    const records: FuelRecord[] = data.result.records;

    // Parse prices — already in cents per litre
    const allPrices: number[] = [];
    const metroPrices: number[] = [];
    const regionalPrices: number[] = [];

    for (const r of records) {
      const price = parseFloat(r.Price);
      if (isNaN(price) || price <= 0) continue;

      const dollars = price / 100;
      allPrices.push(dollars);

      if (isSydneyMetro(r.Postcode)) {
        metroPrices.push(dollars);
      } else {
        regionalPrices.push(dollars);
      }
    }

    if (allPrices.length === 0) return null;

    const avg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);

    const metroAvg =
      metroPrices.length > 0
        ? metroPrices.reduce((a, b) => a + b, 0) / metroPrices.length
        : null;
    const regionalAvg =
      regionalPrices.length > 0
        ? regionalPrices.reduce((a, b) => a + b, 0) / regionalPrices.length
        : null;

    const preCrisis = 1.72;
    const increase = ((avg - preCrisis) / preCrisis) * 100;
    const trend =
      avg > 2.5
        ? ("critical" as const)
        : avg > 2.0
          ? ("up" as const)
          : ("stable" as const);

    // Find most recent update date
    const dates = records
      .map((r) => {
        const parts = r.PriceUpdatedDate?.match(
          /(\d{1,2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/
        );
        if (!parts) return null;
        return new Date(
          parseInt(parts[3]),
          parseInt(parts[2]) - 1,
          parseInt(parts[1]),
          parseInt(parts[4]),
          parseInt(parts[5])
        );
      })
      .filter((d): d is Date => d !== null);

    const mostRecent =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : null;

    let context =
      `Average across ${allPrices.length} NSW stations. ` +
      `Range: $${min.toFixed(2)}–$${max.toFixed(2)}/L. ` +
      `${increase > 0 ? "Up" : "Down"} ${Math.abs(increase).toFixed(0)}% from pre-crisis ($${preCrisis.toFixed(2)}/L).`;

    if (metroAvg !== null && regionalAvg !== null) {
      const gap = regionalAvg - metroAvg;
      context +=
        ` Sydney metro avg: $${metroAvg.toFixed(2)}/L.` +
        ` Regional NSW avg: $${regionalAvg.toFixed(2)}/L` +
        ` (${gap > 0 ? "+" : ""}${(gap * 100).toFixed(0)}c/L ${gap > 0 ? "above" : "below"} metro).`;
    }

    return {
      label: "NSW diesel price",
      value: `$${avg.toFixed(2)}/L`,
      trend,
      source: `NSW FuelCheck — ${allPrices.length} stations`,
      sourceUrl: "https://www.fuelcheck.nsw.gov.au/app",
      context,
      lastUpdated: mostRecent?.toISOString() ?? new Date().toISOString(),
      automated: true,
    };
  } catch {
    return null;
  }
}
