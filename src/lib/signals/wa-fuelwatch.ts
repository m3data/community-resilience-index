/**
 * WA FuelWatch — Diesel prices via RSS feed
 *
 * No API key required. RSS XML feed.
 * Product=4 is diesel. Prices are in cents per litre (e.g. 259.5 = $2.595/L).
 * Feed returns all metro + regional stations for the given product.
 *
 * We compute a statewide average and compare to the QLD/national signal.
 */

import type { Signal } from "./types";

const FUELWATCH_RSS =
  "https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS?Product=4&Day=today";

function extractPrices(xml: string): number[] {
  const prices: number[] = [];
  const priceRegex = /<price>([\d.]+)<\/price>/g;
  let match;
  while ((match = priceRegex.exec(xml)) !== null) {
    const cents = parseFloat(match[1]);
    if (!isNaN(cents) && cents > 0) {
      prices.push(cents);
    }
  }
  return prices;
}

function extractDate(xml: string): string | null {
  const dateMatch = xml.match(/<date>(\d{4}-\d{2}-\d{2})<\/date>/);
  return dateMatch ? dateMatch[1] : null;
}

export async function fetchWaDiesel(): Promise<Signal | null> {
  try {
    const res = await fetch(FUELWATCH_RSS, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const xml = await res.text();
    const prices = extractPrices(xml);
    if (prices.length === 0) return null;

    const date = extractDate(xml);

    // Prices are in cents per litre
    const avgCents = prices.reduce((a, b) => a + b, 0) / prices.length;
    const avgDollars = Math.round(avgCents) / 100;
    const minDollars = Math.round(Math.min(...prices)) / 100;
    const maxDollars = Math.round(Math.max(...prices)) / 100;

    const preCrisis = 1.72;
    const increase = ((avgDollars - preCrisis) / preCrisis) * 100;
    const trend =
      avgDollars > 2.5
        ? ("critical" as const)
        : avgDollars > 2.0
          ? ("up" as const)
          : ("stable" as const);

    return {
      label: "WA diesel price",
      value: `$${avgDollars.toFixed(2)}/L`,
      trend,
      source: `FuelWatch WA — ${date ?? "today"}`,
      sourceUrl: "https://www.fuelwatch.wa.gov.au/",
      context:
        `Average across ${prices.length} WA stations. ` +
        `Range: $${minDollars.toFixed(2)}–$${maxDollars.toFixed(2)}/L. ` +
        `${increase > 0 ? "Up" : "Down"} ${Math.abs(increase).toFixed(0)}% from pre-crisis ($${preCrisis.toFixed(2)}/L). ` +
        `Regional WA stations typically 20–60c/L above metro.`,
      lastUpdated: date ? new Date(date).toISOString() : new Date().toISOString(),
      automated: true,
    };
  } catch {
    return null;
  }
}
