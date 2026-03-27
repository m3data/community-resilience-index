/**
 * ASX Food & Agriculture Equity Signals — Yahoo Finance
 *
 * Delayed quotes for food retailers and agricultural input companies.
 * Divergence between retailers (COL/WOW) and ag inputs (ELD/NUF) signals
 * where in the supply chain pressure is building. Falling ELD/NUF while
 * commodity prices rise = farm sector stress.
 *
 * Tickers:
 *   COL.AX — Coles Group
 *   WOW.AX — Woolworths Group
 *   ELD.AX — Elders (farm inputs & services)
 *   NUF.AX — Nufarm (agricultural chemicals)
 *   XSJ.AX — ASX Consumer Staples sub-index
 */

import type { Signal, Trend } from "./types";

interface QuoteResult {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
}

const TICKERS = ["COL.AX", "WOW.AX", "ELD.AX", "NUF.AX", "XSJ.AX"] as const;

const LABELS: Record<string, string> = {
  "COL.AX": "Coles",
  "WOW.AX": "Woolworths",
  "ELD.AX": "Elders",
  "NUF.AX": "Nufarm",
  "XSJ.AX": "Consumer Staples",
};

const YAHOO_URL =
  "https://query1.finance.yahoo.com/v7/finance/quote?symbols=COL.AX,WOW.AX,ELD.AX,NUF.AX,XSJ.AX&fields=shortName,regularMarketPrice,regularMarketChangePercent,regularMarketTime";

/**
 * Parse the Yahoo Finance v7 quote response.
 * Returns a map of symbol → quote data, or null on failure.
 */
function parseQuoteResponse(
  json: unknown
): Map<string, QuoteResult> | null {
  if (
    typeof json !== "object" ||
    json === null ||
    !("quoteResponse" in json)
  )
    return null;

  const qr = (json as { quoteResponse: unknown }).quoteResponse;
  if (typeof qr !== "object" || qr === null || !("result" in qr)) return null;

  const results = (qr as { result: unknown }).result;
  if (!Array.isArray(results) || results.length === 0) return null;

  const map = new Map<string, QuoteResult>();
  for (const r of results) {
    if (typeof r === "object" && r !== null && "symbol" in r) {
      map.set(r.symbol as string, r as QuoteResult);
    }
  }
  return map.size > 0 ? map : null;
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function avgPct(quotes: Map<string, QuoteResult>, symbols: string[]): number | null {
  const values = symbols
    .map((s) => quotes.get(s)?.regularMarketChangePercent)
    .filter((v): v is number => v !== undefined && !isNaN(v));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function classifyTrend(retailAvg: number | null, agAvg: number | null): Trend {
  // If ag inputs falling while retailers stable/rising → supply chain stress
  if (agAvg !== null && retailAvg !== null) {
    if (agAvg < -3 && retailAvg - agAvg > 2) return "critical";
  }
  // Otherwise use the consumer staples direction
  const combined = retailAvg ?? agAvg;
  if (combined === null) return "stable";
  if (combined < -1.5) return "down";
  if (combined > 1.5) return "up";
  return "stable";
}

function buildContext(
  quotes: Map<string, QuoteResult>,
  retailAvg: number | null,
  agAvg: number | null
): string {
  const parts: string[] = [];

  // Individual ticker summaries
  for (const ticker of TICKERS) {
    const q = quotes.get(ticker);
    if (!q?.regularMarketPrice) continue;
    const label = LABELS[ticker] ?? ticker;
    const pct = q.regularMarketChangePercent;
    const pctStr = pct !== undefined ? ` (${formatPct(pct)})` : "";
    parts.push(`${label} ${formatPrice(q.regularMarketPrice)}${pctStr}`);
  }

  let context = parts.join(". ") + ".";

  // Divergence analysis
  if (retailAvg !== null && agAvg !== null) {
    const spread = retailAvg - agAvg;
    if (Math.abs(spread) > 2) {
      if (spread > 0) {
        context +=
          " Retailers outperforming ag inputs — potential margin expansion at the expense of farm-gate returns.";
      } else {
        context +=
          " Ag inputs outperforming retailers — rising input costs may flow through to shelf prices.";
      }
    } else {
      context += " Retailers and ag inputs moving together — no divergence signal.";
    }
  }

  return context;
}

function formatQuoteDate(quotes: Map<string, QuoteResult>): string | null {
  for (const ticker of TICKERS) {
    const t = quotes.get(ticker)?.regularMarketTime;
    if (t) {
      return new Date(t * 1000).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
  return null;
}

export async function fetchAsxFood(): Promise<Signal | null> {
  try {
    const res = await fetch(YAHOO_URL, {
      next: { revalidate: 3600 }, // cache 1h — delayed quotes
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const quotes = parseQuoteResponse(json);
    if (!quotes) return null;

    const retailAvg = avgPct(quotes, ["COL.AX", "WOW.AX"]);
    const agAvg = avgPct(quotes, ["ELD.AX", "NUF.AX"]);
    const trend = classifyTrend(retailAvg, agAvg);

    // Build the headline value from the consumer staples index
    const xsj = quotes.get("XSJ.AX");
    let value: string;
    if (xsj?.regularMarketPrice) {
      const pct = xsj.regularMarketChangePercent;
      const pctStr = pct !== undefined ? ` (${formatPct(pct)})` : "";
      value = `${formatPrice(xsj.regularMarketPrice)}${pctStr}`;
    } else {
      // Fall back to retailer average if index unavailable
      const col = quotes.get("COL.AX");
      const wow = quotes.get("WOW.AX");
      if (col?.regularMarketPrice && wow?.regularMarketPrice) {
        value = `COL ${formatPrice(col.regularMarketPrice)} / WOW ${formatPrice(wow.regularMarketPrice)}`;
      } else {
        return null; // not enough data
      }
    }

    const quoteDate = formatQuoteDate(quotes);
    const source = quoteDate
      ? `Yahoo Finance — ${quoteDate} (delayed)`
      : "Yahoo Finance (delayed)";

    return {
      label: "ASX food & agriculture",
      value,
      trend,
      source,
      context: buildContext(quotes, retailAvg, agAvg),
      lastUpdated: new Date().toISOString(),
      automated: true,
      layer: 1,
      layerLabel: "Upstream market signal",
      propagatesTo: "Food retail prices and farm viability, 3-6 month lag",
    };
  } catch {
    return null;
  }
}
