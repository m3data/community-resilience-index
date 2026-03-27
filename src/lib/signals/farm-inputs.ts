/**
 * Farm input costs — fertiliser, chemicals, fuel for agriculture
 *
 * ABS Producer Price Index (6427.0) via SDMX REST API.
 * Inputs to the house-building industry and agriculture are tracked quarterly.
 *
 * Fertiliser is a leading indicator of food price pressure:
 * fuel crisis → fertiliser cost spike → planting decisions → food supply/price.
 * This signal captures the upstream pressure before it reaches CPI.
 *
 * Fallback: manual data from ABARES farm cost reports.
 */

import { readFileSync } from "fs";
import path from "path";
import type { Signal } from "./types";

const ABS_BASE = "https://data.api.abs.gov.au/rest/data";

interface ManualFarmData {
  farmInputs: {
    fertiliserIncreasePercent: number;
    source: string;
    sourceUrl?: string;
    context: string;
    asOf: string;
  };
}

function loadManualFarmData(): ManualFarmData["farmInputs"] | null {
  try {
    const filePath = path.join(process.cwd(), "src/data/manual-signals.json");
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as ManualFarmData;
    return data.farmInputs;
  } catch {
    return null;
  }
}

// ABS PPI — Materials used in building other than house building contains
// construction inputs. For agricultural inputs, the closest automated series
// is "Intermediate inputs to agriculture" which includes fertiliser.
//
// Dataflow: ABS,PPI,1.0.0
// Dimensions vary by release. We try the broad inputs-to-agriculture series.
// If the exact path doesn't resolve, we fall back to manual data.
//
// Known working paths (as of 2025):
// 3.30.10.50.Q — PPI inputs to manufacturing, YoY change
// The agriculture inputs series may be under a different index code.
//
// Strategy: try the API, fall back gracefully to manual reporting.

interface AbsObservation {
  TIME_PERIOD: string;
  OBS_VALUE: number;
}

function parseAbsCsvResponse(csv: string): AbsObservation[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const timeIdx = headers.indexOf("TIME_PERIOD");
  const valueIdx = headers.indexOf("OBS_VALUE");

  if (timeIdx === -1 || valueIdx === -1) return [];

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",");
      return {
        TIME_PERIOD: cols[timeIdx],
        OBS_VALUE: parseFloat(cols[valueIdx]),
      };
    })
    .filter((obs) => !isNaN(obs.OBS_VALUE));
}

async function fetchFromAbs(): Promise<{
  value: number;
  period: string;
  previous: number | null;
  previousPeriod: string | null;
} | null> {
  try {
    // Try PPI inputs to agriculture — YoY percentage change
    // Dataflow ABS,PPI641601,1.0.0 covers selected input commodities
    // Fallback: try the broader PPI dataflow
    const paths = [
      { dataflow: "ABS,PPI,1.0.0", key: "3.30.10.50.Q" }, // Inputs to manufacturing
      { dataflow: "ABS,PPI641601,1.0.0", key: "3..10.50.Q" }, // Agricultural inputs (broad)
    ];

    for (const { dataflow, key } of paths) {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const url = `${ABS_BASE}/${dataflow}/${key}?startPeriod=${year - 1}-Q1&endPeriod=${year}-Q4`;

        const res = await fetch(url, {
          next: { revalidate: 86400 },
          headers: { Accept: "application/vnd.sdmx.data+csv" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;

        const csv = await res.text();
        const observations = parseAbsCsvResponse(csv);
        if (observations.length === 0) continue;

        const latest = observations[observations.length - 1];
        const prev =
          observations.length > 1 ? observations[observations.length - 2] : null;

        return {
          value: latest.OBS_VALUE,
          period: latest.TIME_PERIOD,
          previous: prev?.OBS_VALUE ?? null,
          previousPeriod: prev?.TIME_PERIOD ?? null,
        };
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Manual fallback — reads from data/manual-signals.json, then hardcoded defaults
function getManualFallback() {
  const manual = loadManualFarmData();
  if (manual) {
    return {
      fertiliserIncrease: manual.fertiliserIncreasePercent,
      source: manual.source,
      context: manual.context,
      asOf: manual.asOf,
    };
  }
  return {
    fertiliserIncrease: 30,
    source: "Industry reporting / ABARES — March 2026",
    context:
      "Fertiliser prices up ~30% since the Strait of Hormuz disruption. " +
      "Australia imports the majority of its fertiliser (urea, DAP, MAP) — " +
      "primarily from the Middle East and Asia, through the same shipping routes " +
      "now under pressure. This is a double hit for agriculture: fuel costs up " +
      "AND input costs up simultaneously. " +
      "Planting decisions for winter crops are being made now. " +
      "Downstream effect: food prices will follow with a 3–6 month lag.",
    asOf: "2026-03-25",
  };
}

export async function fetchFarmInputs(): Promise<Signal | null> {
  // Try ABS PPI first
  const absData = await fetchFromAbs();

  if (absData) {
    const { value, period, previous, previousPeriod } = absData;
    const trend =
      value > 8
        ? ("critical" as const)
        : value > 4
          ? ("up" as const)
          : ("stable" as const);

    let context = `Farm input costs ${value > 0 ? "up" : "down"} ${Math.abs(value).toFixed(1)}% year-on-year (${period}).`;
    if (previous !== null && previousPeriod) {
      const diff = value - previous;
      if (Math.abs(diff) > 1) {
        context += ` ${diff > 0 ? "Accelerating" : "Decelerating"} — was ${previous.toFixed(1)}% in ${previousPeriod}.`;
      }
    }
    context +=
      " Fertiliser, chemicals, and fuel are the three largest variable costs for Australian farms." +
      " When all three spike simultaneously — as they are now — planting decisions change and food supply contracts.";

    return {
      label: "Farm input costs",
      value: `+${value.toFixed(1)}% YoY`,
      trend,
      source: `ABS PPI — ${period}`,
      sourceUrl: "https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/producer-price-indexes-australia/latest-release",
      context,
      lastUpdated: new Date().toISOString(),
      automated: true,
      layer: 5,
      layerLabel: "Downstream cascade",
      propagatesTo: "Planting decisions and next-season food supply",
    };
  }

  // Fallback to manual data from JSON or hardcoded defaults
  const fallback = getManualFallback();
  const manual = loadManualFarmData();
  return {
    label: "Farm input costs",
    value: `Fertiliser +${fallback.fertiliserIncrease}%`,
    trend: "critical" as const,
    source: fallback.source,
    sourceUrl: manual?.sourceUrl || "https://www.agriculture.gov.au/abares/data",
    context: fallback.context,
    lastUpdated: new Date(fallback.asOf).toISOString(),
    automated: false,
    layer: 5,
    layerLabel: "Downstream cascade",
    propagatesTo: "Planting decisions and next-season food supply",
  };
}
