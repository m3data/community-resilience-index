/**
 * RBA Cash Rate Target — Reserve Bank of Australia
 *
 * Free, no auth. CSV download from RBA Statistical Tables (F1).
 * The cash rate target is the primary monetary policy lever — it flows
 * through to mortgage rates, business lending, and consumer credit costs.
 * Rate rises compound with fuel and food price stress on household budgets.
 */

import type { Signal, Trend } from "./types";

const RBA_CSV_URL =
  "https://www.rba.gov.au/statistics/tables/csv/f1-data.csv";

interface CashRateObservation {
  date: Date;
  rate: number;
}

/**
 * Parse the RBA F1 CSV to extract cash rate target observations.
 *
 * The CSV has a header section (title, description, units rows) followed by
 * column headers and data rows. The cash rate target column is identified
 * by searching for "Cash Rate Target" in the description row.
 */
function parseRbaCsv(csv: string): CashRateObservation[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 5) return [];

  // Find the header row (contains "Series ID" or "Title")
  // RBA CSVs have metadata rows before the actual header
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    if (lines[i].startsWith("Series ID") || lines[i].startsWith("Title")) {
      headerIdx = i;
      break;
    }
  }

  // If no "Series ID" row found, try to find the row with "Cash Rate Target"
  // and use the subsequent structure
  let cashRateColIdx = -1;

  if (headerIdx !== -1) {
    // Look in the Title or Description rows for "Cash Rate Target"
    for (let i = 0; i <= headerIdx; i++) {
      const cols = splitCsvLine(lines[i]);
      for (let j = 0; j < cols.length; j++) {
        if (cols[j].toLowerCase().includes("cash rate target")) {
          cashRateColIdx = j;
          break;
        }
      }
      if (cashRateColIdx !== -1) break;
    }
  }

  // Fallback: scan all early rows for "Cash Rate Target"
  if (cashRateColIdx === -1) {
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const cols = splitCsvLine(lines[i]);
      for (let j = 0; j < cols.length; j++) {
        if (cols[j].toLowerCase().includes("cash rate target")) {
          cashRateColIdx = j;
          break;
        }
      }
      if (cashRateColIdx !== -1) break;
    }
  }

  if (cashRateColIdx === -1) return [];

  // Find where data rows start (first row with a parseable date in column 0)
  const observations: CashRateObservation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length <= cashRateColIdx) continue;

    const dateStr = cols[0].trim();
    const date = parseRbaDate(dateStr);
    if (!date) continue;

    const rateStr = cols[cashRateColIdx].trim();
    const rate = parseFloat(rateStr);
    if (isNaN(rate)) continue;

    observations.push({ date, rate });
  }

  return observations;
}

/**
 * Parse RBA date formats: "DD-Mon-YYYY" (e.g. "07-Feb-2024")
 */
function parseRbaDate(s: string): Date | null {
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const match = s.match(/^(\d{1,2})-(\w{3})-(\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = months[match[2]];
  const year = parseInt(match[3], 10);

  if (month === undefined || isNaN(day) || isNaN(year)) return null;
  return new Date(year, month, day);
}

/**
 * Split a CSV line respecting quoted fields.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function classifyTrend(current: number, previous: number | null): Trend {
  if (previous === null) return "stable";
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function fetchRbaCashRate(): Promise<Signal | null> {
  try {
    const res = await fetch(RBA_CSV_URL, {
      next: { revalidate: 86400 }, // cache 24h — rate decisions are monthly
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const csv = await res.text();
    const observations = parseRbaCsv(csv);
    if (observations.length === 0) return null;

    // Sort by date ascending
    observations.sort((a, b) => a.date.getTime() - b.date.getTime());

    const latest = observations[observations.length - 1];

    // Find last change: walk backwards to find a different rate
    let lastChangeIdx = observations.length - 1;
    for (let i = observations.length - 2; i >= 0; i--) {
      if (observations[i].rate !== latest.rate) {
        lastChangeIdx = i + 1;
        break;
      }
      if (i === 0) {
        lastChangeIdx = 0; // rate has been the same for the entire series
      }
    }

    const previousRate =
      lastChangeIdx > 0 ? observations[lastChangeIdx - 1].rate : null;
    const lastChangeDate = observations[lastChangeIdx].date;
    const trend = classifyTrend(latest.rate, previousRate);

    const direction =
      previousRate !== null
        ? latest.rate > previousRate
          ? "increase"
          : latest.rate < previousRate
            ? "decrease"
            : "hold"
        : "hold";

    let context = `RBA cash rate target at ${latest.rate.toFixed(2)}%.`;
    if (previousRate !== null && direction !== "hold") {
      const changeBps = Math.abs(latest.rate - previousRate) * 100;
      context += ` Last ${direction} of ${changeBps.toFixed(0)}bps on ${formatDate(lastChangeDate)} (from ${previousRate.toFixed(2)}%).`;
    } else {
      context += ` Held since ${formatDate(lastChangeDate)}.`;
    }
    context +=
      " The cash rate flows through to mortgage repayments, business lending costs, and consumer credit — compounding with fuel and food price stress on household budgets.";

    return {
      label: "RBA cash rate target",
      value: `${latest.rate.toFixed(2)}%`,
      trend,
      source: `RBA — ${formatDate(latest.date)}`,
      context,
      lastUpdated: new Date().toISOString(),
      automated: true,
      layer: 5,
      layerLabel: "Downstream cascade",
      propagatesTo: "Mortgage payments, business lending, and consumer spending capacity",
    };
  } catch {
    return null;
  }
}
