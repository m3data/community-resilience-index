/**
 * AUD/USD Exchange Rate — Yahoo Finance
 *
 * No auth required. Fetches delayed quote for AUDUSD=X.
 * Oil is priced in USD — a falling AUD amplifies fuel cost increases
 * for Australian consumers even when the USD barrel price is flat.
 * Returns current rate, daily change, and distance from 52-week range.
 */

import type { Signal, Trend } from "./types";

const YAHOO_QUOTE_URL =
  "https://query1.finance.yahoo.com/v7/finance/quote";

interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketPreviousClose?: number;
}

interface YahooResponse {
  quoteResponse?: {
    result?: YahooQuote[];
    error?: unknown;
  };
}

function classifyTrend(changePct: number): Trend {
  if (Math.abs(changePct) >= 2) return "critical";
  if (changePct >= 0.3) return "up";
  if (changePct <= -0.3) return "down";
  return "stable";
}

function formatRate(rate: number): string {
  return rate.toFixed(4);
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function rangeContext(
  price: number,
  low?: number,
  high?: number
): string | null {
  if (low === undefined || high === undefined) return null;
  if (high <= low) return null;

  const range = high - low;
  const position = (price - low) / range;

  if (position <= 0.15) {
    return `Near 52-week low (${formatRate(low)}–${formatRate(high)}) — weak AUD increases import costs including fuel.`;
  }
  if (position >= 0.85) {
    return `Near 52-week high (${formatRate(low)}–${formatRate(high)}) — strong AUD provides some buffer on USD-denominated imports.`;
  }
  return `Mid-range within 52-week band (${formatRate(low)}–${formatRate(high)}).`;
}

async function fetchSparkline(): Promise<number[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/AUDUSD%3DX?range=3mo&interval=1d`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "CRI-Signals/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const closes: (number | null)[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return closes.filter((v): v is number => typeof v === "number" && !isNaN(v));
  } catch {
    return [];
  }
}

export async function fetchAudUsd(): Promise<Signal | null> {
  try {
    const url = `${YAHOO_QUOTE_URL}?symbols=AUDUSD%3DX&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketTime,fiftyTwoWeekHigh,fiftyTwoWeekLow,regularMarketPreviousClose`;

    const [quoteRes, closes] = await Promise.all([
      fetch(url, {
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "CRI-Signals/1.0" },
      }),
      fetchSparkline(),
    ]);

    const res = quoteRes;
    if (!res.ok) return null;

    const data: YahooResponse = await res.json();
    const quotes = data.quoteResponse?.result;
    if (!quotes || quotes.length === 0) return null;

    const q = quotes[0];
    const rate = q.regularMarketPrice;
    const changePct = q.regularMarketChangePercent;
    const trend = classifyTrend(changePct);

    const value = `${formatRate(rate)} (${formatPct(changePct)})`;

    let context =
      "The AUD/USD rate determines how much Australians pay for USD-priced imports — crude oil, refined fuel, and many industrial inputs. ";

    if (changePct <= -0.5) {
      context +=
        "A falling AUD amplifies fuel cost increases even when the USD barrel price is flat. ";
    } else if (changePct >= 0.5) {
      context +=
        "A rising AUD provides some relief on imported fuel and energy costs. ";
    }

    const range = rangeContext(
      rate,
      q.fiftyTwoWeekLow,
      q.fiftyTwoWeekHigh
    );
    if (range) {
      context += range;
    }

    return {
      label: "AUD/USD exchange rate",
      value,
      trend,
      source: "Yahoo Finance (delayed)",
      context: context.trim(),
      lastUpdated: q.regularMarketTime
        ? new Date(q.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
      automated: true,
      layer: 1,
      layerLabel: "Upstream market signal",
      propagatesTo: "All USD-denominated imports including crude oil and refined fuel",
      sparkline: closes.length >= 2 ? { values: closes, label: "3 months" } : undefined,
    };
  } catch {
    return null;
  }
}
