/**
 * ASX Energy & Fuel Equity Signals — Yahoo Finance
 *
 * No auth required. Fetches delayed quotes for ASX-listed energy stocks
 * and the energy sub-index. Tracks:
 *   - ALD.AX (Ampol — refiner/retailer)
 *   - VEA.AX (Viva Energy — refiner/retailer)
 *   - XEJ.AX (S&P/ASX 200 Energy sub-index)
 *
 * Divergence between refiners is meaningful: if one spikes and the other
 * doesn't, it's company-specific rather than a market-wide energy move.
 */

import type { Signal, SignalComponent, Trend } from "./types";

const TICKERS = ["ALD.AX", "VEA.AX", "XEJ.AX"] as const;

const TICKER_LABELS: Record<string, string> = {
  "ALD.AX": "Ampol",
  "VEA.AX": "Viva Energy",
  "XEJ.AX": "ASX Energy Index",
};

const YAHOO_QUOTE_URL =
  "https://query1.finance.yahoo.com/v7/finance/quote";

interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketTime: number; // unix epoch
  currency?: string;
}

interface YahooResponse {
  quoteResponse?: {
    result?: YahooQuote[];
    error?: unknown;
  };
}

/**
 * Fetch quotes for all tickers in a single API call.
 */
async function fetchQuotes(): Promise<YahooQuote[]> {
  const symbols = TICKERS.join(",");
  const url = `${YAHOO_QUOTE_URL}?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketTime,currency`;

  const res = await fetch(url, {
    next: { revalidate: 900 }, // cache 15min — delayed quotes
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "CRI-Signals/1.0",
    },
  });

  if (!res.ok) return [];

  const data: YahooResponse = await res.json();
  return data.quoteResponse?.result ?? [];
}

function classifyChange(pct: number): Trend {
  if (Math.abs(pct) >= 5) return "critical";
  if (pct >= 1) return "up";
  if (pct <= -1) return "down";
  return "stable";
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function formatPrice(price: number, currency?: string): string {
  if (currency === "GBp") return `${price.toFixed(2)}p`;
  return `$${price.toFixed(2)}`;
}

function checkDivergence(
  quotes: Map<string, YahooQuote>
): string | null {
  const ald = quotes.get("ALD.AX");
  const vea = quotes.get("VEA.AX");
  if (!ald || !vea) return null;

  const diff = Math.abs(
    ald.regularMarketChangePercent - vea.regularMarketChangePercent
  );

  if (diff >= 3) {
    const higher =
      ald.regularMarketChangePercent > vea.regularMarketChangePercent
        ? "Ampol"
        : "Viva";
    return `Significant divergence between refiners (${diff.toFixed(1)}pp gap) — ${higher} outperforming. Likely company-specific, not a broad energy move.`;
  }
  return null;
}

export async function fetchAsxEnergy(): Promise<Signal | null> {
  try {
    const quotes = await fetchQuotes();
    if (quotes.length === 0) return null;

    const quoteMap = new Map<string, YahooQuote>();
    for (const q of quotes) {
      quoteMap.set(q.symbol, q);
    }

    // Build components for structured sub-values
    const components: SignalComponent[] = [];
    let worstTrend: Trend = "stable";
    let latestTime = 0;

    for (const ticker of TICKERS) {
      const q = quoteMap.get(ticker);
      if (!q) continue;

      const label = TICKER_LABELS[ticker];
      const price = formatPrice(q.regularMarketPrice, q.currency);
      const change = formatPct(q.regularMarketChangePercent);
      const trend = classifyChange(q.regularMarketChangePercent);

      components.push({ label, value: price, change, trend });

      if (
        trend === "critical" ||
        (trend !== "stable" && worstTrend === "stable")
      ) {
        worstTrend = trend;
      }

      if (q.regularMarketTime > latestTime) {
        latestTime = q.regularMarketTime;
      }
    }

    if (components.length === 0) return null;

    // Interpreted summary as headline value
    const divergence = checkDivergence(quoteMap);
    const value = divergence
      ? "Refiners diverging"
      : worstTrend === "critical"
        ? "Significant sector move"
        : worstTrend === "stable"
          ? "Within normal range"
          : "Mixed signals";

    let context =
      "Equity prices for Australia's two refiners (Ampol, Viva) and the ASX energy index. ";

    if (divergence) {
      context += divergence + " ";
    } else if (quoteMap.has("ALD.AX") && quoteMap.has("VEA.AX")) {
      context +=
        "Refiners moving together — consistent with broad energy sector dynamics. ";
    }

    const xej = quoteMap.get("XEJ.AX");
    if (xej && Math.abs(xej.regularMarketChangePercent) >= 2) {
      context += `Energy sub-index move of ${formatPct(xej.regularMarketChangePercent)} signals significant sector-wide repricing.`;
    }

    return {
      label: "ASX energy & fuel equities",
      value,
      trend: worstTrend,
      source: "Yahoo Finance (delayed)",
      context: context.trim(),
      lastUpdated: latestTime
        ? new Date(latestTime * 1000).toISOString()
        : new Date().toISOString(),
      automated: true,
      layer: 1,
      layerLabel: "Upstream market signal",
      propagatesTo: "Refining capacity and fuel supply decisions",
      components,
    };
  } catch {
    return null;
  }
}
