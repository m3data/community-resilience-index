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
    const quotes = await fetchQuotes();

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
    };
  } catch {
    return null;
  }
}
