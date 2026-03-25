/**
 * ABS Data API — Consumer Price Index (Food & Non-Alcoholic Beverages)
 *
 * Free, no auth. SDMX REST API.
 * Dimension order: MEASURE.INDEX.TSEST.REGION.FREQ
 *
 * We fetch YoY percentage change (MEASURE=3) for food (INDEX=20001),
 * original series (TSEST=10), Australia (REGION=50), quarterly (FREQ=Q).
 */

import type { Signal } from "./types";

const ABS_BASE = "https://data.api.abs.gov.au/rest/data";
const DATAFLOW = "ABS,CPI,1.1.0";

// MEASURE=3 (YoY % change), INDEX=20001 (Food & non-alcoholic beverages),
// TSEST=10 (Original), REGION=50 (Australia), FREQ=Q (Quarterly)
const FOOD_CPI_PATH = "3.20001.10.50.Q";

interface AbsObservation {
  TIME_PERIOD: string;
  OBS_VALUE: number;
}

function getCurrentQuarterRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);

  // Request last 4 quarters for trend comparison
  const startYear = quarter === 1 ? year - 1 : year - 1;
  const startQ = quarter;
  return {
    start: `${startYear}-Q${startQ}`,
    end: `${year}-Q${quarter}`,
  };
}

function parseAbsCsvResponse(csv: string): AbsObservation[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const timeIdx = headers.indexOf("TIME_PERIOD");
  const valueIdx = headers.indexOf("OBS_VALUE");

  if (timeIdx === -1 || valueIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      TIME_PERIOD: cols[timeIdx],
      OBS_VALUE: parseFloat(cols[valueIdx]),
    };
  }).filter((obs) => !isNaN(obs.OBS_VALUE));
}

export async function fetchFoodCpi(): Promise<Signal | null> {
  try {
    const { start, end } = getCurrentQuarterRange();
    const url = `${ABS_BASE}/${DATAFLOW}/${FOOD_CPI_PATH}?startPeriod=${start}&endPeriod=${end}`;

    const res = await fetch(url, {
      next: { revalidate: 86400 }, // cache 24h
      headers: { Accept: "application/vnd.sdmx.data+csv" },
    });
    if (!res.ok) return null;

    const csv = await res.text();
    const observations = parseAbsCsvResponse(csv);
    if (observations.length === 0) return null;

    // Most recent observation
    const latest = observations[observations.length - 1];
    const previous = observations.length > 1 ? observations[observations.length - 2] : null;

    const yoyChange = latest.OBS_VALUE;
    const trend = yoyChange > 5 ? "up" as const : yoyChange > 2 ? "stable" as const : "down" as const;

    // Determine if accelerating or decelerating
    let context = `Food prices ${yoyChange > 0 ? "up" : "down"} ${Math.abs(yoyChange).toFixed(1)}% year-on-year (${latest.TIME_PERIOD}).`;
    if (previous) {
      const diff = yoyChange - previous.OBS_VALUE;
      if (Math.abs(diff) > 0.5) {
        context += ` ${diff > 0 ? "Accelerating" : "Decelerating"} — was ${previous.OBS_VALUE.toFixed(1)}% in ${previous.TIME_PERIOD}.`;
      }
    }
    context += " Diesel is embedded in every food item: farm machinery, transport, refrigeration, processing, retail delivery.";

    return {
      label: "Food price pressure",
      value: `${yoyChange > 0 ? "+" : ""}${yoyChange.toFixed(1)}% YoY`,
      trend,
      source: `ABS CPI — ${latest.TIME_PERIOD}`,
      sourceUrl: "https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release",
      context,
      lastUpdated: new Date().toISOString(),
      automated: true,
    };
  } catch {
    return null;
  }
}
