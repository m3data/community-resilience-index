/**
 * Crack Spread Signal (Proxy) — Yahoo Finance
 *
 * No auth required. Derives the distillate crack spread from two futures:
 *   - HO=F (NY Harbor ULSD futures, $/gallon)
 *   - BZ=F (Brent crude futures, $/barrel)
 *
 * Crack spread = (HO price * 42 gal/barrel) - Brent price = $/barrel margin
 *
 * This is a US-based proxy for the Singapore gasoil crack spread — the
 * refining margin that determines whether Asian refineries (Australia's
 * primary fuel suppliers) are incentivised to produce. The directional
 * signal is the same: when margins collapse, refineries cut runs and
 * downstream supply tightens.
 *
 * Singapore gasoil futures (SGX) are not available on Yahoo Finance.
 */

import type { Signal, Trend } from "./types";

const BRENT_TICKER = "BZ=F";
const ULSD_TICKER = "HO=F";

const YAHOO_QUOTE_URL =
  "https://query1.finance.yahoo.com/v7/finance/quote";

interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketTime: number;
  currency?: string;
}

interface YahooResponse {
  quoteResponse?: {
    result?: YahooQuote[];
    error?: unknown;
  };
}

const GALLONS_PER_BARREL = 42;

/** Typical crack spread thresholds ($/barrel) */
const SPREAD_THRESHOLDS = {
  /** Below this, refineries start cutting runs */
  stressed: 15,
  /** Below this, margins are tight */
  tight: 25,
  /** Above this, margins are elevated — strong incentive to produce */
  elevated: 40,
};

async function fetchQuotes(): Promise<Map<string, YahooQuote>> {
  const symbols = `${BRENT_TICKER},${ULSD_TICKER}`;
  const url = `${YAHOO_QUOTE_URL}?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketTime,currency`;

  const res = await fetch(url, {
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "CRI-Signals/1.0",
    },
  });

  if (!res.ok) return new Map();

  const data: YahooResponse = await res.json();
  const quotes = data.quoteResponse?.result ?? [];
  const map = new Map<string, YahooQuote>();
  for (const q of quotes) {
    map.set(q.symbol, q);
  }
  return map;
}

async function fetchSpreadHistory(): Promise<number[]> {
  try {
    const chartUrl = "https://query1.finance.yahoo.com/v8/finance/chart/";
    const [hoRes, bzRes] = await Promise.all([
      fetch(`${chartUrl}${ULSD_TICKER}?range=3mo&interval=1d`, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "CRI-Signals/1.0" },
      }),
      fetch(`${chartUrl}${BRENT_TICKER}?range=3mo&interval=1d`, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "CRI-Signals/1.0" },
      }),
    ]);
    if (!hoRes.ok || !bzRes.ok) return [];
    const hoData = await hoRes.json();
    const bzData = await bzRes.json();
    const hoCloses: (number | null)[] = hoData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const bzCloses: (number | null)[] = bzData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const len = Math.min(hoCloses.length, bzCloses.length);
    const spreads: number[] = [];
    for (let i = 0; i < len; i++) {
      const ho = hoCloses[i];
      const bz = bzCloses[i];
      if (typeof ho === "number" && typeof bz === "number" && !isNaN(ho) && !isNaN(bz)) {
        spreads.push(ho * GALLONS_PER_BARREL - bz);
      }
    }
    return spreads;
  } catch {
    return [];
  }
}

function classifySpread(spreadPerBarrel: number): Trend {
  if (spreadPerBarrel < SPREAD_THRESHOLDS.stressed) return "critical";
  if (spreadPerBarrel < SPREAD_THRESHOLDS.tight) return "down";
  if (spreadPerBarrel > SPREAD_THRESHOLDS.elevated) return "up";
  return "stable";
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export async function fetchCrackSpread(): Promise<Signal | null> {
  try {
    const [quotes, spreadHistory] = await Promise.all([
      fetchQuotes(),
      fetchSpreadHistory(),
    ]);

    const ho = quotes.get(ULSD_TICKER);
    const bz = quotes.get(BRENT_TICKER);

    if (!ho || !bz) return null;

    // HO=F is quoted in $/gallon; convert to $/barrel
    const ulsdPerBarrel = ho.regularMarketPrice * GALLONS_PER_BARREL;
    const spreadPerBarrel = ulsdPerBarrel - bz.regularMarketPrice;

    const trend = classifySpread(spreadPerBarrel);

    const latestTime = Math.max(ho.regularMarketTime, bz.regularMarketTime);

    const value = `${formatUsd(spreadPerBarrel)}/bbl`;

    let context =
      "Proxy for the Singapore gasoil crack spread — the refining margin that determines whether Asian refineries produce fuel for the Australian market. ";

    if (spreadPerBarrel < SPREAD_THRESHOLDS.stressed) {
      context +=
        `At ${formatUsd(spreadPerBarrel)}/bbl, margins are below stress levels. ` +
        "Refineries are likely cutting production runs. If sustained, this reduces fuel supply into Australia's import-dependent market.";
    } else if (spreadPerBarrel < SPREAD_THRESHOLDS.tight) {
      context +=
        `At ${formatUsd(spreadPerBarrel)}/bbl, margins are tight but above the stress threshold. ` +
        "Refineries remain operational but have reduced incentive to expand production.";
    } else if (spreadPerBarrel > SPREAD_THRESHOLDS.elevated) {
      context +=
        `At ${formatUsd(spreadPerBarrel)}/bbl, margins are elevated — strong incentive for refineries to maximise output. ` +
        "However, elevated margins also mean higher wholesale fuel prices downstream.";
    } else {
      context +=
        `At ${formatUsd(spreadPerBarrel)}/bbl, margins are in normal range — refineries have adequate incentive to produce.`;
    }

    context +=
      ` Components: Brent crude ${formatUsd(bz.regularMarketPrice)}/bbl, ULSD ${formatUsd(ho.regularMarketPrice)}/gal (${formatUsd(ulsdPerBarrel)}/bbl).`;

    return {
      label: "Crack spread (proxy)",
      value,
      trend,
      source: "Yahoo Finance (delayed) — US distillate proxy",
      context: context.trim(),
      lastUpdated: new Date(latestTime * 1000).toISOString(),
      automated: true,
      layer: 1,
      layerLabel: "Upstream market signal",
      propagatesTo: "Refinery production decisions and wholesale fuel supply",
      sparkline: spreadHistory.length >= 2 ? { values: spreadHistory, label: "3 months" } : undefined,
    };
  } catch {
    return null;
  }
}
