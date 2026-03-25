/**
 * Diesel Terminal Gate Price — AIP (Australian Institute of Petroleum)
 *
 * The AIP has a JSON API at api.aip.com.au but its SSL cert is currently
 * expired. They also publish daily XLSX files.
 *
 * Strategy: try the API first (HTTP fallback), then fall back to hardcoded.
 * The API returns terminal gate prices for major cities.
 *
 * Alternative: Queensland publishes fuel prices as open data on data.qld.gov.au.
 */

import type { Signal } from "./types";

// AIP API — try HTTP since HTTPS cert is expired
const AIP_API = "http://api.aip.com.au/public/tgp";

// QLD open data as backup — diesel prices updated daily
const QLD_CKAN = "https://www.data.qld.gov.au/api/3/action";
const QLD_DATASET = "fuel-price-reporting-2025";

interface AipPrice {
  State?: string;
  Diesel?: number;
  [key: string]: unknown;
}

async function fetchFromAip(): Promise<{ price: number; source: string } | null> {
  try {
    const res = await fetch(AIP_API, {
      next: { revalidate: 3600 }, // cache 1h
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data: AipPrice[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    // Average diesel TGP across cities
    const dieselPrices = data
      .map((d) => d.Diesel)
      .filter((p): p is number => typeof p === "number" && p > 0);

    if (dieselPrices.length === 0) return null;

    const avg = dieselPrices.reduce((a, b) => a + b, 0) / dieselPrices.length;
    return {
      price: Math.round(avg * 100) / 100,
      source: "AIP Terminal Gate Prices",
    };
  } catch {
    return null;
  }
}

async function fetchFromQld(): Promise<{ price: number; source: string } | null> {
  try {
    // Get latest resource from QLD fuel price dataset
    const pkgUrl = `${QLD_CKAN}/package_show?id=${QLD_DATASET}`;
    const pkgRes = await fetch(pkgUrl, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!pkgRes.ok) return null;

    const pkg = await pkgRes.json();
    if (!pkg.success) return null;

    // Find the most recent CSV resource (last in the list)
    const csvResources = pkg.result.resources?.filter(
      (r: { format: string }) => r.format?.toUpperCase() === "CSV"
    ) ?? [];
    const csvResource = csvResources[csvResources.length - 1];
    if (!csvResource?.url) return null;

    const csvRes = await fetch(csvResource.url, {
      cache: "no-store", // CSV is >2MB, can't use Next.js fetch cache
      signal: AbortSignal.timeout(10000),
    });
    if (!csvRes.ok) return null;

    const csv = await csvRes.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return null;

    const headers = lines[0].toLowerCase().split(",");
    const priceIdx = headers.findIndex((h) => h.includes("price"));
    const fuelIdx = headers.findIndex((h) => h.includes("fuel_type") || h.includes("fueltype") || h === "fuel type");

    if (priceIdx === -1) return null;

    // Filter for diesel rows and get average of recent entries
    const dieselPrices: number[] = [];
    for (let i = Math.max(1, lines.length - 100); i < lines.length; i++) {
      const cols = lines[i].split(",");
      const fuelType = fuelIdx >= 0 ? cols[fuelIdx]?.toLowerCase() : "";
      if (fuelIdx === -1 || fuelType.includes("diesel")) {
        const price = parseFloat(cols[priceIdx]);
        if (!isNaN(price) && price > 0) {
          dieselPrices.push(price);
        }
      }
    }

    if (dieselPrices.length === 0) return null;

    // QLD prices are in tenths of a cent (e.g. 1940 = 194.0c = $1.94/L)
    const avg = dieselPrices.reduce((a, b) => a + b, 0) / dieselPrices.length;
    const priceInDollars = avg > 500 ? avg / 1000 : avg > 10 ? avg / 100 : avg;

    return {
      price: Math.round(priceInDollars * 100) / 100,
      source: "QLD Fuel Price Reporting",
    };
  } catch {
    return null;
  }
}

export async function fetchDieselPrice(): Promise<Signal | null> {
  // Try AIP first, then QLD open data
  const result = (await fetchFromAip()) ?? (await fetchFromQld());

  if (!result) return null;

  const { price, source } = result;

  // Determine trend based on pre-crisis baseline (~$1.72/L)
  const preCrisis = 1.72;
  const increase = ((price - preCrisis) / preCrisis) * 100;
  const trend = price > 2.5 ? "critical" as const : price > 2.0 ? "up" as const : "stable" as const;

  return {
    label: "Diesel terminal gate price",
    value: `$${price.toFixed(2)}/L`,
    trend,
    source,
    context:
      `${increase > 0 ? "Up" : "Down"} ${Math.abs(increase).toFixed(0)}% from pre-crisis levels ($${preCrisis.toFixed(2)}/L). ` +
      "Terminal gate price sets the floor — retail adds margin. " +
      "Regional areas typically paying 20–40c/L more. " +
      "Diesel flows through to every sector: freight, agriculture, mining, construction.",
    lastUpdated: new Date().toISOString(),
    automated: true,
  };
}
