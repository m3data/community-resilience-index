/**
 * AEMO NEM Wholesale Electricity Spot Price — AEMO Visualisations API
 *
 * No auth required. Fetches current 5-minute dispatch prices for all NEM
 * regions (NSW1, VIC1, QLD1, SA1, TAS1) from AEMO's public dashboard API.
 *
 * Returns spot price by region in $/MWh. Prices above $300/MWh indicate
 * supply stress — typically gas-fired peakers setting the marginal price
 * during demand spikes. Negative prices indicate excess renewable generation.
 *
 * Electricity and fuel are coupled: gas-fired peakers set marginal price
 * during demand spikes, so electricity stress is also a fuel-cost signal.
 */

import type { Signal, RegionalValue, Trend } from "./types";

const AEMO_API_URL =
  "https://visualisations.aemo.com.au/aemo/apps/api/report/ELEC_NEM_SUMMARY";

const REGIONS = ["NSW1", "VIC1", "QLD1", "SA1", "TAS1"] as const;
type Region = (typeof REGIONS)[number];

const REGION_LABELS: Record<Region, string> = {
  NSW1: "NSW",
  VIC1: "VIC",
  QLD1: "QLD",
  SA1: "SA",
  TAS1: "TAS",
};

/** Price thresholds in $/MWh */
const SPIKE_THRESHOLD = 300;
const HIGH_THRESHOLD = 150;
const NEGATIVE_THRESHOLD = 0;

interface AemoRegionSummary {
  SETTLEMENTDATE: string;
  REGIONID: string;
  PRICE: number;
  TOTALDEMAND: number;
  PRICE_STATUS?: string;
}

interface AemoResponse {
  ELEC_NEM_SUMMARY?: AemoRegionSummary[];
}

function classifyTrend(prices: number[]): Trend {
  if (prices.some((p) => p >= SPIKE_THRESHOLD)) return "critical";
  if (prices.some((p) => p >= HIGH_THRESHOLD)) return "up";
  if (prices.every((p) => p < NEGATIVE_THRESHOLD)) return "down";
  return "stable";
}

function formatPrice(price: number): string {
  if (Math.abs(price) >= 1000) {
    return `$${price.toFixed(0)}`;
  }
  return `$${price.toFixed(2)}`;
}

function buildContext(regions: Map<Region, AemoRegionSummary>): string {
  const prices = Array.from(regions.values()).map((r) => r.PRICE);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);

  let context =
    "NEM wholesale spot price reflects real-time supply/demand balance across the eastern grid. ";

  // Check for price spikes
  const spikeRegions = Array.from(regions.entries())
    .filter(([, r]) => r.PRICE >= SPIKE_THRESHOLD)
    .map(([id]) => REGION_LABELS[id]);

  if (spikeRegions.length > 0) {
    context += `Price spike in ${spikeRegions.join(", ")} (>${SPIKE_THRESHOLD} $/MWh) — likely gas peakers setting marginal price during high demand. `;
  } else if (maxPrice >= HIGH_THRESHOLD) {
    context += "Elevated prices but below spike territory. ";
  }

  // Check for negative prices (excess renewables)
  const negativeRegions = Array.from(regions.entries())
    .filter(([, r]) => r.PRICE < NEGATIVE_THRESHOLD)
    .map(([id]) => REGION_LABELS[id]);

  if (negativeRegions.length > 0) {
    context += `Negative pricing in ${negativeRegions.join(", ")} — excess renewable generation, generators paying to stay online. `;
  }

  // Price spread across regions
  const spread = maxPrice - minPrice;
  if (spread > 100) {
    context += `Large price spread across regions ($${spread.toFixed(0)}/MWh) suggests interconnector constraints or localised supply stress.`;
  } else if (spikeRegions.length === 0 && negativeRegions.length === 0) {
    context += "Prices within normal operating range across all regions.";
  }

  return context.trim();
}

export async function fetchAemoElectricity(): Promise<Signal | null> {
  try {
    const res = await fetch(AEMO_API_URL, {
      next: { revalidate: 300 }, // cache 5min — matches dispatch interval
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "CRI-Signals/1.0",
      },
    });

    if (!res.ok) return null;

    const data: AemoResponse = await res.json();
    const summaries = data.ELEC_NEM_SUMMARY;
    if (!summaries || summaries.length === 0) return null;

    const regionMap = new Map<Region, AemoRegionSummary>();
    for (const summary of summaries) {
      const id = summary.REGIONID as Region;
      if (REGIONS.includes(id)) {
        regionMap.set(id, summary);
      }
    }

    if (regionMap.size === 0) return null;

    // Build regional values
    const regions: RegionalValue[] = [];
    const prices: number[] = [];

    for (const region of REGIONS) {
      const r = regionMap.get(region);
      if (!r) continue;
      const p = r.PRICE;
      prices.push(p);
      regions.push({
        region: REGION_LABELS[region],
        value: `${formatPrice(p)}/MWh`,
        trend: p >= SPIKE_THRESHOLD ? "critical" : p >= HIGH_THRESHOLD ? "up" : p < NEGATIVE_THRESHOLD ? "down" : "stable",
      });
    }

    if (regions.length === 0) return null;

    const trend = classifyTrend(prices);
    const context = buildContext(regionMap);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);

    // Interpreted summary
    const value = trend === "critical"
      ? `Spike — up to ${formatPrice(maxPrice)}/MWh`
      : trend === "up"
        ? `Elevated — ${formatPrice(minPrice)} to ${formatPrice(maxPrice)}/MWh`
        : `${formatPrice(minPrice)} to ${formatPrice(maxPrice)}/MWh`;

    // Use the most recent settlement date
    let latestDate: string | null = null;
    for (const r of regionMap.values()) {
      if (!latestDate || r.SETTLEMENTDATE > latestDate) {
        latestDate = r.SETTLEMENTDATE;
      }
    }

    return {
      label: "NEM wholesale electricity",
      value,
      trend,
      source: "AEMO (5-min dispatch)",
      context,
      lastUpdated: latestDate
        ? new Date(latestDate).toISOString()
        : new Date().toISOString(),
      automated: true,
      layer: 2,
      layerLabel: "Supply position",
      propagatesTo: "Retail electricity bills and business operating costs",
      regions,
    };
  } catch {
    return null;
  }
}
