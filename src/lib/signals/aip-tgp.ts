/**
 * AIP Terminal Gate Prices — Layer 3: Wholesale Price
 *
 * Daily wholesale petrol and diesel prices by capital city, published by the
 * Australian Institute of Petroleum. Data sourced from BP, Ampol, Viva Energy,
 * and ExxonMobil.
 *
 * Strategy: crawl the AIP historical data page to discover the latest daily
 * XLSX URL, download and parse last 7 days, compute city spreads and trends.
 *
 * This is the wholesale floor — retail adds margin. When TGP spikes, retail
 * follows in days.
 */

import ExcelJS from "exceljs";
import type { Signal, SignalComponent, RegionalValue } from "./types";

const AIP_HISTORICAL_PAGE = "http://www.aip.com.au/historical-ulp-and-diesel-tgp-data";

const CITIES = [
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Adelaide",
  "Perth",
  "Darwin",
  "Hobart",
] as const;

// Maps city column index (1-based) in the sheet to city name
// Col 1 = date, Col 2 = Sydney, ..., Col 8 = Hobart, Col 9 = National Average
const CITY_COL: Record<string, number> = {
  Sydney: 2,
  Melbourne: 3,
  Brisbane: 4,
  Adelaide: 5,
  Perth: 6,
  Darwin: 7,
  Hobart: 8,
};
const NATIONAL_COL = 9;

interface TgpRow {
  date: Date;
  cities: Record<string, number>;
  national: number;
}

function toDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel serial number
    return new Date((val - 25569) * 86400 * 1000);
  }
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseTgpSheet(wb: ExcelJS.Workbook, sheetName: string): TgpRow[] {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    console.warn(`[aip-tgp] Sheet "${sheetName}" not found`);
    return [];
  }

  const rows: TgpRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const dateVal = toDate(row.getCell(1).value);
    if (!dateVal) return;

    const cities: Record<string, number> = {};
    for (const [city, col] of Object.entries(CITY_COL)) {
      const v = row.getCell(col).value;
      if (typeof v === "number") cities[city] = v;
    }
    const national = row.getCell(NATIONAL_COL).value;

    rows.push({
      date: dateVal,
      cities,
      national: typeof national === "number" ? national : 0,
    });
  });
  console.log(`[aip-tgp] Parsed ${rows.length} rows from "${sheetName}"`);
  return rows;
}

/** Discover the latest daily TGP XLSX URL from the AIP historical page. */
async function discoverTgpUrl(): Promise<string | null> {
  try {
    // AIP uses http, follow redirects
    const res = await fetch(AIP_HISTORICAL_PAGE, {
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 3600 },
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`[aip-tgp] Discovery page returned ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Pattern: AIP_TGP_Data_DD-Mon-YYYY.xlsx
    const matches = html.match(
      /https?:\/\/[^"]*AIP_TGP_Data_[^"]*\.xlsx/g
    );
    if (!matches || matches.length === 0) {
      console.warn("[aip-tgp] No XLSX links found on discovery page");
      return null;
    }

    const url = matches[matches.length - 1];
    console.log(`[aip-tgp] Discovered: ${url}`);
    return url;
  } catch (e) {
    console.warn("[aip-tgp] Discovery failed:", e);
    return null;
  }
}

/** Cache the discovered URL + downloaded workbook for the process lifetime */
let cachedWb: { url: string; wb: ExcelJS.Workbook } | null = null;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function computeTrend(
  latest: number,
  weekAgo: number | undefined
): "up" | "down" | "stable" | "critical" {
  if (!weekAgo) return "stable";
  const pctChange = ((latest - weekAgo) / weekAgo) * 100;
  if (pctChange > 5) return "critical";
  if (pctChange > 1) return "up";
  if (pctChange < -1) return "down";
  return "stable";
}

async function getWorkbook(): Promise<ExcelJS.Workbook | null> {
  if (cachedWb) return cachedWb.wb;

  const url = await discoverTgpUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // cache XLSX for 1 hour — updated daily
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      console.warn(`[aip-tgp] XLSX download returned ${res.status}`);
      return null;
    }

    const buf = await res.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(Buffer.from(buf) as any);
    cachedWb = { url, wb };
    console.log(`[aip-tgp] Workbook loaded (${(buf.byteLength / 1024).toFixed(0)} KB)`);
    return wb;
  } catch (e) {
    console.warn("[aip-tgp] XLSX download failed:", e);
    return null;
  }
}

export async function fetchAipDieselTgp(): Promise<Signal | null> {
  try {
    const wb = await getWorkbook();
    if (!wb) return null;

    const dieselRows = parseTgpSheet(wb, "Diesel TGP");
    if (dieselRows.length === 0) return null;

    const latest = dieselRows[dieselRows.length - 1];
    // ~5 trading days back for weekly comparison
    const weekAgo =
      dieselRows.length > 5
        ? dieselRows[dieselRows.length - 6]
        : undefined;

    const trend = computeTrend(latest.national, weekAgo?.national);

    // Regional values for city breakdown
    const regions: RegionalValue[] = CITIES.map((city) => {
      const val = latest.cities[city];
      const prev = weekAgo?.cities[city];
      return {
        region: city,
        value: val ? `${val.toFixed(1)} c/L` : "N/A",
        trend: val && prev ? computeTrend(val, prev) : undefined,
      };
    });

    // Find cheapest and most expensive city
    const cityPrices = CITIES.map((c) => ({
      city: c,
      price: latest.cities[c] ?? 0,
    })).filter((c) => c.price > 0);
    const cheapest = cityPrices.reduce((a, b) =>
      a.price < b.price ? a : b
    );
    const dearest = cityPrices.reduce((a, b) =>
      a.price > b.price ? a : b
    );
    const spread = dearest.price - cheapest.price;

    // Weekly change
    let weeklyChange = "";
    if (weekAgo) {
      const diff = latest.national - weekAgo.national;
      const pct = ((diff / weekAgo.national) * 100).toFixed(1);
      weeklyChange = ` ${diff > 0 ? "Up" : "Down"} ${Math.abs(diff).toFixed(1)} c/L (${diff > 0 ? "+" : ""}${pct}%) over the past week.`;
    }

    const context =
      `Wholesale diesel terminal gate price — the floor price before retail margin is added.` +
      ` National average ${latest.national.toFixed(1)} c/L as of ${formatDate(latest.date)}.${weeklyChange}` +
      ` ${dearest.city} highest at ${dearest.price.toFixed(1)} c/L, ${cheapest.city} lowest at ${cheapest.price.toFixed(1)} c/L (spread: ${spread.toFixed(1)} c/L).` +
      ` Averages across BP, Ampol, Viva Energy, and ExxonMobil.` +
      ` When TGP rises, retail pump prices follow within days.`;

    // Sparkline: last 30 trading days of national average
    const sparklineSlice = dieselRows.slice(-30).map((r) => r.national).filter((v) => v > 0);

    return {
      label: "Diesel wholesale (TGP)",
      value: `${latest.national.toFixed(1)} c/L`,
      trend,
      source: "Australian Institute of Petroleum",
      sourceUrl:
        "https://www.aip.com.au/pricing/terminal-gate-prices",
      context,
      lastUpdated: latest.date.toISOString(),
      automated: true,
      layer: 3,
      layerLabel: "Wholesale price transmission",
      propagatesTo:
        "Retail diesel prices, typically within 1-3 days for metro, 3-7 days for regional",
      regions,
      sparkline: sparklineSlice.length >= 2 ? { values: sparklineSlice, label: "30 trading days" } : undefined,
    };
  } catch {
    return null;
  }
}

export async function fetchAipPetrolTgp(): Promise<Signal | null> {
  try {
    const wb = await getWorkbook();
    if (!wb) return null;

    const petrolRows = parseTgpSheet(wb, "Petrol TGP");
    if (petrolRows.length === 0) return null;

    const latest = petrolRows[petrolRows.length - 1];
    const weekAgo =
      petrolRows.length > 5
        ? petrolRows[petrolRows.length - 6]
        : undefined;

    const trend = computeTrend(latest.national, weekAgo?.national);

    const regions: RegionalValue[] = CITIES.map((city) => {
      const val = latest.cities[city];
      const prev = weekAgo?.cities[city];
      return {
        region: city,
        value: val ? `${val.toFixed(1)} c/L` : "N/A",
        trend: val && prev ? computeTrend(val, prev) : undefined,
      };
    });

    const cityPrices = CITIES.map((c) => ({
      city: c,
      price: latest.cities[c] ?? 0,
    })).filter((c) => c.price > 0);
    const cheapest = cityPrices.reduce((a, b) =>
      a.price < b.price ? a : b
    );
    const dearest = cityPrices.reduce((a, b) =>
      a.price > b.price ? a : b
    );
    const spread = dearest.price - cheapest.price;

    let weeklyChange = "";
    if (weekAgo) {
      const diff = latest.national - weekAgo.national;
      const pct = ((diff / weekAgo.national) * 100).toFixed(1);
      weeklyChange = ` ${diff > 0 ? "Up" : "Down"} ${Math.abs(diff).toFixed(1)} c/L (${diff > 0 ? "+" : ""}${pct}%) over the past week.`;
    }

    const context =
      `Wholesale petrol (ULP) terminal gate price.` +
      ` National average ${latest.national.toFixed(1)} c/L as of ${formatDate(latest.date)}.${weeklyChange}` +
      ` ${dearest.city} highest at ${dearest.price.toFixed(1)} c/L, ${cheapest.city} lowest at ${cheapest.price.toFixed(1)} c/L (spread: ${spread.toFixed(1)} c/L).` +
      ` Averages across BP, Ampol, Viva Energy, and ExxonMobil.`;

    // Sparkline: last 30 trading days of national average
    const sparklineSlice = petrolRows.slice(-30).map((r) => r.national).filter((v) => v > 0);

    return {
      label: "Petrol wholesale (TGP)",
      value: `${latest.national.toFixed(1)} c/L`,
      trend,
      source: "Australian Institute of Petroleum",
      sourceUrl:
        "https://www.aip.com.au/pricing/terminal-gate-prices",
      context,
      lastUpdated: latest.date.toISOString(),
      automated: true,
      layer: 3,
      layerLabel: "Wholesale price transmission",
      propagatesTo:
        "Retail petrol prices, typically within 1-3 days for metro, 3-7 days for regional",
      regions,
      sparkline: sparklineSlice.length >= 2 ? { values: sparklineSlice, label: "30 trading days" } : undefined,
    };
  } catch {
    return null;
  }
}
