/**
 * Brent Crude Oil — spot price + futures curve via Yahoo Finance
 *
 * No API key required. Uses Yahoo Finance v8 chart API.
 * BZ=F is the front-month Brent crude futures contract (ICE).
 * Fetches front-month price + a deferred contract (~6 months out)
 * to determine curve shape: backwardation vs contango.
 *
 * Backwardation (near > far) = acute supply tightness.
 * Contango (far > near) = market expects recovery / normal storage economics.
 */

import type { Signal } from "./types";

const YAHOO_CHART_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/";

// Futures month codes: Jan=F, Feb=G, ... Dec=Z
const MONTH_CODES = [
  "F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z",
];

interface ChartResult {
  meta: {
    regularMarketPrice: number;
    previousClose: number;
    currency: string;
  };
}

interface ChartResponse {
  chart: {
    result: ChartResult[] | null;
    error: { code: string; description: string } | null;
  };
}

/** Build a Brent futures ticker ~6 months forward from today. */
function getDeferredTicker(): string {
  const now = new Date();
  const targetMonth = now.getMonth() + 6;
  const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
  const monthIndex = targetMonth % 12;
  const yearCode = String(targetYear).slice(-2);
  return `BZ${MONTH_CODES[monthIndex]}${yearCode}.NYM`;
}

async function fetchChart(
  ticker: string
): Promise<{ price: number; previousClose: number } | null> {
  try {
    const url = `${YAHOO_CHART_URL}${encodeURIComponent(ticker)}?range=5d&interval=1d`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!res.ok) return null;

    const data: ChartResponse = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const price = result.meta.regularMarketPrice;
    const previousClose = result.meta.previousClose;
    if (typeof price !== "number" || isNaN(price) || price <= 0) return null;

    return { price, previousClose: previousClose ?? price };
  } catch {
    return null;
  }
}

export async function fetchBrentCrude(): Promise<Signal | null> {
  try {
    // Fetch front-month and deferred contract in parallel
    const deferredTicker = getDeferredTicker();
    const [front, deferred] = await Promise.all([
      fetchChart("BZ=F"),
      fetchChart(deferredTicker),
    ]);

    if (!front) return null;

    const { price, previousClose } = front;
    const dailyChange = ((price - previousClose) / previousClose) * 100;

    // Curve shape analysis
    let curveShape: "backwardation" | "contango" | "unknown" = "unknown";
    let curveSpread: number | null = null;
    if (deferred) {
      curveSpread = deferred.price - price;
      curveShape = curveSpread < 0 ? "backwardation" : "contango";
    }

    // Trend: reflects pressure on communities (higher = worse)
    const trend =
      price > 100
        ? ("critical" as const)
        : price > 80
          ? ("up" as const)
          : price < 60
            ? ("down" as const)
            : ("stable" as const);

    // Context narrative
    const changeDir = dailyChange >= 0 ? "Up" : "Down";
    const changeStr = `${changeDir} ${Math.abs(dailyChange).toFixed(1)}% from previous close ($${previousClose.toFixed(2)}).`;

    let curveContext: string;
    if (curveShape === "backwardation") {
      curveContext =
        `Curve in backwardation (near $${Math.abs(curveSpread!).toFixed(2)} above 6-month forward). ` +
        `Signals acute supply tightness — prices likely to stay elevated.`;
    } else if (curveShape === "contango") {
      curveContext =
        `Curve in contango (6-month forward $${curveSpread!.toFixed(2)} above spot). ` +
        `Market expects supply recovery or normal storage economics.`;
    } else {
      curveContext = "Deferred contract unavailable — curve shape not determined.";
    }

    // Secondary: futures curve interpretation for citizens
    let secondary: Signal["secondary"];
    if (curveShape === "backwardation") {
      secondary = {
        label: "Market outlook",
        value: "Markets expect prices to stay high or rise",
        detail: `Backwardation — near $${Math.abs(curveSpread!).toFixed(2)} above 6-month forward`,
      };
    } else if (curveShape === "contango") {
      secondary = {
        label: "Market outlook",
        value: "Markets expect prices to ease over coming months",
        detail: `Contango — 6-month forward $${curveSpread!.toFixed(2)} above spot`,
      };
    }

    return {
      label: "Brent crude oil",
      value: `US$${price.toFixed(2)}/bbl`,
      trend,
      source: "Yahoo Finance — ICE Brent (BZ=F)",
      context:
        `Front-month Brent futures. ${changeStr} ` +
        `Brent underpins Australian fuel import costs — ~90% of crude is imported.`,
      lastUpdated: new Date().toISOString(),
      automated: true,
      layer: 1,
      layerLabel: "Upstream market signal",
      propagatesTo: "Wholesale fuel prices, typically within 1-2 weeks",
      secondary,
    };
  } catch {
    return null;
  }
}
