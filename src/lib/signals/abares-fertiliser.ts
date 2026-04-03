/**
 * ABARES Weekly Commodity Prices — farm input cost signal
 *
 * Source: https://www.agriculture.gov.au/abares/data/weekly-commodity-price-update
 * Updated every Thursday. HTML table with structured price data.
 *
 * The ABARES weekly update does NOT include fertiliser prices (urea, MAP, DAP).
 * It covers agricultural commodities: wheat, corn, canola, beef, lamb, mutton,
 * dairy, cotton, sugar, wool, fodder. Wheat is the headline food-chain indicator
 * because grain prices flow directly into bread, cereals, and animal feed costs.
 *
 * This module parses the HTML table on the main page, extracts wheat (primary)
 * and other grain/livestock prices (components), and returns a signal that
 * shows upstream food input cost pressure from ABARES's authoritative data.
 *
 * Layer 5: Downstream cascade — farm commodity prices feed into food prices
 * with a 3-6 month lag via planting decisions, feed costs, and processor margins.
 */

import type { Signal, SignalComponent, Trend } from "./types";

const ABARES_URL =
  "https://www.agriculture.gov.au/abares/data/weekly-commodity-price-update";

/** Row extracted from the ABARES HTML table */
interface AbaresRow {
  indicator: string;
  weekDate: string;
  unit: string;
  latestPrice: number;
  previousWeek: number;
  weeklyChange: string; // e.g. "1%", "-2%", "0%"
  price12MonthsAgo: number;
  annualChange: string; // e.g. "13%", "-6%"
}

/**
 * Indicators we care about for the food cascade signal.
 * Key: substring to match in the indicator name (case-insensitive).
 * Value: short label for the component display.
 */
const FOOD_INDICATORS: Record<string, string> = {
  "wheat": "Wheat (world)",
  "apw": "Wheat (AU export)",
  "corn": "Corn (world)",
  "canola": "Canola (world)",
  "feed barley": "Feed barley (AU)",
  "beef": "Beef (EYCI)",
  "lamb": "Lamb",
  "whole milk powder": "Dairy (WMP)",
};

/**
 * Parse the ABARES HTML table.
 *
 * The table structure is:
 *   <table class="table">
 *     <thead><tr><th>Indicator</th><th>Week average</th>...</tr></thead>
 *     <tbody>
 *       <tr><td colspan="8"><strong>Section header</strong></td></tr>
 *       <tr><td>Indicator name</td><td>Date</td><td>Unit</td><td>Price</td>...</tr>
 *     </tbody>
 *   </table>
 */
function parseAbaresTable(html: string): {
  rows: AbaresRow[];
  publicationDate: string | null;
} {
  const rows: AbaresRow[] = [];
  let publicationDate: string | null = null;

  // Extract publication date from "Current indicators – 2 April 2026" heading
  const dateMatch = html.match(
    /Current indicators\s*(?:–|—|-)\s*(\d{1,2}\s+\w+\s+\d{4})/i
  );
  if (dateMatch) {
    publicationDate = dateMatch[1];
  }

  // Extract the table body content
  const tableMatch = html.match(
    /<table[^>]*class="table"[^>]*>([\s\S]*?)<\/table>/i
  );
  if (!tableMatch) return { rows, publicationDate };

  const tableHtml = tableMatch[1];

  // Match data rows (those with multiple <td> cells, not section headers with colspan)
  const rowRegex =
    /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/g;

  let match;
  while ((match = rowRegex.exec(tableHtml)) !== null) {
    const indicator = match[1].trim();
    const weekDate = match[2].trim();
    const unit = match[3].trim();
    const latestStr = match[4].trim().replace(/,/g, "");
    const prevStr = match[5].trim().replace(/,/g, "");
    const weeklyChange = match[6].trim();
    const annualStr = match[7].trim().replace(/,/g, "");
    const annualChange = match[8].trim();

    const latestPrice = parseFloat(latestStr);
    const previousWeek = parseFloat(prevStr);
    const price12MonthsAgo = parseFloat(annualStr);

    if (isNaN(latestPrice) || isNaN(previousWeek)) continue;

    rows.push({
      indicator,
      weekDate,
      unit,
      latestPrice,
      previousWeek,
      weeklyChange,
      price12MonthsAgo: isNaN(price12MonthsAgo) ? 0 : price12MonthsAgo,
      annualChange,
    });
  }

  return { rows, publicationDate };
}

/**
 * Decode common HTML entities that may appear in indicator names.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&ndash;/g, "\u2013")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
}

/**
 * Find the row matching a food indicator key.
 */
function findRow(
  rows: AbaresRow[],
  key: string
): AbaresRow | undefined {
  const lowerKey = key.toLowerCase();
  return rows.find((r) =>
    decodeEntities(r.indicator).toLowerCase().includes(lowerKey)
  );
}

/**
 * Parse a percentage string like "13%", "-6%", "0%" into a number.
 */
function parsePercent(s: string): number {
  const num = parseFloat(s.replace("%", ""));
  return isNaN(num) ? 0 : num;
}

/**
 * Determine trend from annual change percentage.
 */
function trendFromAnnualChange(annualPct: number): Trend {
  if (annualPct > 15) return "critical";
  if (annualPct > 5) return "up";
  if (annualPct < -5) return "down";
  return "stable";
}

/**
 * Parse an ABARES date like "2 April 2026" into an ISO string.
 */
function parsePublicationDate(dateStr: string): string | null {
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  } catch {
    return null;
  }
}

export async function fetchAbaresFertiliser(): Promise<Signal | null> {
  try {
    const res = await fetch(ABARES_URL, {
      next: { revalidate: 86400 }, // daily revalidation — ABARES updates weekly on Thursday
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const { rows, publicationDate } = parseAbaresTable(html);

    if (rows.length === 0) return null;

    // Find headline indicator: wheat (world price, most liquid grain market)
    // Match "Wheat ... US no. 2" — first wheat row in the table is the world price
    const wheat = findRow(rows, "wheat");
    if (!wheat) return null;

    const wheatAnnualPct = parsePercent(wheat.annualChange);

    // Build components from all food-relevant indicators
    const components: SignalComponent[] = [];
    for (const [key, label] of Object.entries(FOOD_INDICATORS)) {
      const row = findRow(rows, key);
      if (!row) continue;

      const annualPct = parsePercent(row.annualChange);
      const direction = annualPct >= 0 ? "+" : "";

      components.push({
        label,
        value: `${row.latestPrice.toLocaleString("en-AU")} ${row.unit}`,
        change: `${direction}${row.annualChange} YoY`,
        trend: trendFromAnnualChange(annualPct),
      });
    }

    // Overall trend based on wheat annual change
    const trend = trendFromAnnualChange(wheatAnnualPct);

    // Build the headline value
    const wheatDirection = wheatAnnualPct >= 0 ? "+" : "";
    const headlineValue = `Wheat ${wheatDirection}${wheat.annualChange} YoY`;

    // Count how many food indicators are rising significantly (>5% annual)
    const risingCount = components.filter(
      (c) => c.trend === "up" || c.trend === "critical"
    ).length;
    const totalTracked = components.length;

    // Build context
    let context = `World wheat price at ${wheat.latestPrice} ${wheat.unit} (${wheatDirection}${wheat.annualChange} from a year ago, ${wheat.weeklyChange} this week).`;

    // Add Australian wheat if available
    const auWheat = findRow(rows, "apw");
    if (auWheat) {
      context += ` Australian export wheat at ${auWheat.latestPrice} ${auWheat.unit} (${auWheat.annualChange} YoY).`;
    }

    if (risingCount > 0) {
      context += ` ${risingCount} of ${totalTracked} tracked food commodities rising year-on-year.`;
    }

    context +=
      " Grain and livestock prices are upstream costs for bread, cereals, meat, and dairy." +
      " When commodity prices rise, food shelf prices follow with a 3-6 month lag" +
      " as processors, transport, and retailers pass through costs.";

    // Source line with publication date
    const sourceDate = publicationDate ?? "weekly update";
    const lastUpdated = publicationDate
      ? parsePublicationDate(publicationDate)
      : new Date().toISOString();

    return {
      label: "Farm commodity prices (ABARES)",
      value: headlineValue,
      trend,
      source: `ABARES Weekly Commodity Prices — ${sourceDate}`,
      sourceUrl: ABARES_URL,
      context,
      lastUpdated,
      automated: true,
      layer: 5,
      layerLabel: "Downstream cascade",
      propagatesTo:
        "Farm input costs, planting decisions, food prices with 3-6 month lag",
      components,
    };
  } catch {
    return null;
  }
}
