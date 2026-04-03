/**
 * Container Shipping Rates — Yahoo Finance proxy
 *
 * No auth required. The Containerised Freight Index (FBX / Drewry WCI)
 * is not freely available via API. This module uses two publicly traded
 * proxies to sense container shipping cost pressure:
 *
 *   - ZIM (ZIM Integrated Shipping Services) — pure-play container line.
 *     Stock price is highly correlated with container freight rates because
 *     ZIM has minimal fleet ownership and buys capacity at spot/short-term
 *     charter rates. Revenue tracks freight rates almost directly.
 *
 *   - BDRY (Breakwave Dry Bulk Shipping ETF) — tracks near-term Baltic Dry
 *     Index futures. Dry bulk (iron ore, coal, grain) is a different market
 *     from containers, but both respond to the same chokepoint disruptions
 *     (Suez, Hormuz, Panama Canal).
 *
 * When both proxies spike together, it signals broad shipping disruption
 * (chokepoint, war risk, port congestion). When only one moves, it's
 * segment-specific (container demand vs bulk commodity flows).
 *
 * Australia imports ~99% of manufactured goods by sea. Container rate
 * spikes flow through to retail prices on electronics, building materials,
 * clothing, and packaged food within 4-8 weeks.
 */

import type { Signal, SignalComponent, Trend } from "./types";

const YAHOO_CHART_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/";

const YAHOO_QUOTE_URL =
  "https://query1.finance.yahoo.com/v7/finance/quote";

/** ZIM — container shipping line (primary proxy) */
const ZIM_TICKER = "ZIM";
/** BDRY — dry bulk shipping ETF (secondary / chokepoint confirmation) */
const BDRY_TICKER = "BDRY";

const TICKER_LABELS: Record<string, string> = {
  [ZIM_TICKER]: "ZIM (containers)",
  [BDRY_TICKER]: "BDRY (dry bulk)",
};

interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketTime: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
}

interface YahooResponse {
  quoteResponse?: {
    result?: YahooQuote[];
    error?: unknown;
  };
}

interface ChartResult {
  meta: {
    regularMarketPrice: number;
    previousClose: number;
    chartPreviousClose?: number;
  };
  indicators?: {
    quote?: { close?: (number | null)[] }[];
  };
}

interface ChartResponse {
  chart: {
    result: ChartResult[] | null;
    error: { code: string; description: string } | null;
  };
}

/**
 * Fetch delayed quotes for both tickers in a single API call.
 */
async function fetchQuotes(): Promise<Map<string, YahooQuote>> {
  const symbols = `${ZIM_TICKER},${BDRY_TICKER}`;
  const url = `${YAHOO_QUOTE_URL}?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketTime,fiftyTwoWeekHigh,fiftyTwoWeekLow,currency`;

  const res = await fetch(url, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "CRI-Signals/1.0" },
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

/**
 * Fetch 3-month daily closes for ZIM (primary container proxy).
 * Returns the close array and a computed month-on-month % change.
 */
async function fetchChartData(
  ticker: string,
): Promise<{ closes: number[]; monthChange: number | null }> {
  try {
    const url = `${YAHOO_CHART_URL}${encodeURIComponent(ticker)}?range=3mo&interval=1d`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "CRI-Signals/1.0" },
    });
    if (!res.ok) return { closes: [], monthChange: null };

    const data: ChartResponse = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { closes: [], monthChange: null };

    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(
      (v): v is number => typeof v === "number" && !isNaN(v),
    );

    // Month-on-month: compare last 5-day average vs 5-day average ~22 trading days ago
    let monthChange: number | null = null;
    if (closes.length >= 27) {
      const recentAvg =
        closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const monthAgoAvg =
        closes.slice(-27, -22).reduce((a, b) => a + b, 0) / 5;
      if (monthAgoAvg > 0) {
        monthChange = ((recentAvg - monthAgoAvg) / monthAgoAvg) * 100;
      }
    }

    return { closes, monthChange };
  } catch {
    return { closes: [], monthChange: null };
  }
}

/**
 * Classify trend from month-on-month percentage change.
 * Container shipping rates: >20% monthly spike = critical (disruption-level),
 * >5% = elevated, <-5% = easing, otherwise stable.
 */
function classifyTrend(monthChange: number | null): Trend {
  if (monthChange === null) return "stable";
  if (monthChange > 20) return "critical";
  if (monthChange > 5) return "up";
  if (monthChange < -5) return "down";
  return "stable";
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function formatUsd(price: number): string {
  return `US$${price.toFixed(2)}`;
}

/**
 * Check whether both proxies are moving in the same direction,
 * which signals broad shipping disruption rather than segment-specific moves.
 */
function checkConvergence(
  quotes: Map<string, YahooQuote>,
): "converging-up" | "converging-down" | "diverging" | "insufficient" {
  const zim = quotes.get(ZIM_TICKER);
  const bdry = quotes.get(BDRY_TICKER);
  if (!zim || !bdry) return "insufficient";

  const zimPct = zim.regularMarketChangePercent;
  const bdryPct = bdry.regularMarketChangePercent;

  if (zimPct > 2 && bdryPct > 2) return "converging-up";
  if (zimPct < -2 && bdryPct < -2) return "converging-down";
  return "diverging";
}

/**
 * Determine where ZIM sits in its 52-week range.
 * Near the top = elevated freight rates. Near the bottom = depressed rates.
 */
function rangePosition(quote: YahooQuote): number | null {
  const low = quote.fiftyTwoWeekLow;
  const high = quote.fiftyTwoWeekHigh;
  if (low === undefined || high === undefined || high <= low) return null;
  return (quote.regularMarketPrice - low) / (high - low);
}

export async function fetchFreightIndex(): Promise<Signal | null> {
  try {
    // Fetch quotes and ZIM chart data in parallel
    const [quotes, zimChart] = await Promise.all([
      fetchQuotes(),
      fetchChartData(ZIM_TICKER),
    ]);

    const zim = quotes.get(ZIM_TICKER);
    if (!zim) return null;

    const bdry = quotes.get(BDRY_TICKER);
    const { closes: zimCloses, monthChange } = zimChart;

    // Trend based on month-on-month change in ZIM (container proxy)
    const trend = classifyTrend(monthChange);

    // Build headline value
    let value: string;
    if (monthChange !== null) {
      value = `${formatPct(monthChange)} monthly`;
    } else {
      value = `${formatUsd(zim.regularMarketPrice)} (ZIM)`;
    }

    // Components for structured display
    const components: SignalComponent[] = [];

    components.push({
      label: TICKER_LABELS[ZIM_TICKER],
      value: formatUsd(zim.regularMarketPrice),
      change: formatPct(zim.regularMarketChangePercent),
      trend:
        Math.abs(zim.regularMarketChangePercent) >= 5
          ? "critical"
          : zim.regularMarketChangePercent >= 1
            ? "up"
            : zim.regularMarketChangePercent <= -1
              ? "down"
              : "stable",
    });

    if (bdry) {
      components.push({
        label: TICKER_LABELS[BDRY_TICKER],
        value: formatUsd(bdry.regularMarketPrice),
        change: formatPct(bdry.regularMarketChangePercent),
        trend:
          Math.abs(bdry.regularMarketChangePercent) >= 5
            ? "critical"
            : bdry.regularMarketChangePercent >= 1
              ? "up"
              : bdry.regularMarketChangePercent <= -1
                ? "down"
                : "stable",
      });
    }

    // Context narrative
    let context =
      "Container shipping rates measure how much it costs to move goods by sea. " +
      "When rates spike, import costs rise — affecting everything from electronics to building materials. " +
      "Australia imports virtually all manufactured consumer goods by sea. ";

    // Add convergence analysis
    const convergence = checkConvergence(quotes);
    if (convergence === "converging-up") {
      context +=
        "Both container and dry bulk proxies are rising together — consistent with broad shipping disruption (chokepoint, port congestion, or conflict risk). ";
    } else if (convergence === "converging-down") {
      context +=
        "Both container and dry bulk proxies are falling — shipping costs easing across segments. ";
    } else if (convergence === "diverging" && bdry) {
      context +=
        "Container and dry bulk proxies are moving in different directions — likely segment-specific rather than a broad shipping disruption. ";
    }

    // 52-week range context for ZIM
    const position = rangePosition(zim);
    if (position !== null) {
      if (position >= 0.8) {
        context +=
          "ZIM is near its 52-week high — container freight rates are elevated.";
      } else if (position <= 0.2) {
        context +=
          "ZIM is near its 52-week low — container freight rates are depressed.";
      }
    }

    // Latest timestamp
    let latestTime = zim.regularMarketTime;
    if (bdry && bdry.regularMarketTime > latestTime) {
      latestTime = bdry.regularMarketTime;
    }

    // Secondary insight: month-on-month interpretation
    let secondary: Signal["secondary"];
    if (monthChange !== null) {
      if (monthChange > 20) {
        secondary = {
          label: "Rate pressure",
          value: "Shipping costs spiking — expect import price increases",
          detail: `ZIM ${formatPct(monthChange)} month-on-month`,
        };
      } else if (monthChange > 5) {
        secondary = {
          label: "Rate pressure",
          value: "Shipping costs rising — may flow through to retail",
          detail: `ZIM ${formatPct(monthChange)} month-on-month`,
        };
      } else if (monthChange < -10) {
        secondary = {
          label: "Rate pressure",
          value: "Shipping costs falling — some relief for importers",
          detail: `ZIM ${formatPct(monthChange)} month-on-month`,
        };
      }
    }

    return {
      label: "Container shipping rates",
      value,
      trend,
      source: "Yahoo Finance (delayed) — ZIM/BDRY proxy",
      sourceUrl: "https://finance.yahoo.com/quote/ZIM/",
      context: context.trim(),
      lastUpdated: latestTime
        ? new Date(latestTime * 1000).toISOString()
        : new Date().toISOString(),
      automated: true,
      layer: 1,
      layerLabel: "Upstream market signal",
      propagatesTo:
        "Import costs for manufactured goods, building materials, consumer products — typically 4-8 weeks to retail",
      components,
      sparkline:
        zimCloses.length >= 2
          ? { values: zimCloses, label: "3 months" }
          : undefined,
      secondary,
    };
  } catch {
    return null;
  }
}
