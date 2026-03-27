/**
 * Victoria Emergency Management Incidents — VIC EMV GeoJSON Feed
 *
 * No auth required. Fetches the public OSOM GeoJSON feed from
 * emergency.vic.gov.au. Filters for active incidents and warnings
 * (excludes planned burns). Counts by category and warning level.
 *
 * Same compounding logic as NSW RFS: active emergency events multiply
 * supply chain stress — road closures disrupt freight, evacuations
 * strain local services, and large fires threaten energy/water infra.
 *
 * Warning levels (CAP severity):
 *   - Emergency Warning (Extreme/Severe) → critical
 *   - Watch and Act (Moderate) → elevated
 *   - Advice (Minor) → monitoring
 *
 * Source: https://emergency.vic.gov.au/public/osom-geojson.json
 */

import type { Signal, Trend } from "./types";

const EMV_GEOJSON_URL =
  "https://emergency.vic.gov.au/public/osom-geojson.json";

/** Severity weights for compounding score */
const WARNING_WEIGHT: Record<string, number> = {
  "Emergency Warning": 10,
  "Watch and Act": 5,
  Advice: 2,
};

const STATUS_ACTIVE = new Set([
  "Responding",
  "On Scene",
  "Under Control",
  "Going",
  "Request For Assistance",
  "Warning",
]);

interface EmvFeature {
  type: "Feature";
  properties: {
    id: string;
    feedType: "incident" | "warning" | "burn-area";
    category1: string;
    category2: string;
    status: string;
    location: string;
    size?: number;
    sizeFmt?: string;
    sourceOrg?: string;
    sourceTitle?: string;
    created: string;
    updated: string;
    /** Warning-specific fields */
    action?: string; // "Emergency Warning" | "Watch and Act" | "Advice" | "Stay Informed"
    cap?: {
      severity?: string;
    };
  };
}

interface EmvGeoJson {
  type: "FeatureCollection";
  features: EmvFeature[];
}

export interface IncidentSummary {
  total: number;
  warnings: number;
  emergencyWarnings: number;
  watchAndAct: number;
  advice: number;
  byCategory: Record<string, number>;
  compoundingScore: number;
}

/**
 * Parse the GeoJSON feed and summarise active incidents.
 */
export function summariseIncidents(features: EmvFeature[]): IncidentSummary {
  const byCategory: Record<string, number> = {};
  let warnings = 0;
  let emergencyWarnings = 0;
  let watchAndAct = 0;
  let advice = 0;
  let compoundingScore = 0;
  let total = 0;

  for (const f of features) {
    const p = f.properties;

    // Skip planned burns — they're controlled, not emergencies
    if (p.feedType === "burn-area") continue;

    // For incidents, only count active ones
    if (p.feedType === "incident" && !STATUS_ACTIVE.has(p.status)) continue;

    total++;

    // Count by category1
    const cat = p.category1 || "Unknown";
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    // Each active incident adds base compounding weight
    compoundingScore += 1;

    // Warnings carry extra weight
    if (p.feedType === "warning" || p.action) {
      warnings++;
      const action = p.action || "";

      if (action === "Emergency Warning") {
        emergencyWarnings++;
        compoundingScore += WARNING_WEIGHT["Emergency Warning"];
      } else if (action === "Watch and Act") {
        watchAndAct++;
        compoundingScore += WARNING_WEIGHT["Watch and Act"];
      } else if (action === "Advice") {
        advice++;
        compoundingScore += WARNING_WEIGHT["Advice"];
      }
    }
  }

  return {
    total,
    warnings,
    emergencyWarnings,
    watchAndAct,
    advice,
    byCategory,
    compoundingScore,
  };
}

/**
 * Derive trend from compounding score.
 *   0        → stable (no active incidents)
 *   1–9      → stable (routine level)
 *   10–29    → up (elevated activity)
 *   30+      → critical (major emergency load)
 */
function classifyTrend(summary: IncidentSummary): Trend {
  if (summary.emergencyWarnings > 0) return "critical";
  if (summary.compoundingScore >= 30) return "critical";
  if (summary.compoundingScore >= 10) return "up";
  return "stable";
}

function formatValue(summary: IncidentSummary): string {
  const parts: string[] = [`${summary.total} active`];

  if (summary.emergencyWarnings > 0) {
    parts.push(`${summary.emergencyWarnings} emergency warning${summary.emergencyWarnings > 1 ? "s" : ""}`);
  }
  if (summary.watchAndAct > 0) {
    parts.push(`${summary.watchAndAct} watch & act`);
  }

  return parts.join(", ");
}

function buildContext(summary: IncidentSummary): string {
  if (summary.total === 0) {
    return "No active emergency incidents in Victoria. Baseline conditions for supply chain and community services.";
  }

  const parts: string[] = [];

  // Top categories
  const sorted = Object.entries(summary.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (sorted.length > 0) {
    const catStr = sorted
      .map(([cat, n]) => `${cat} (${n})`)
      .join(", ");
    parts.push(`Active by type: ${catStr}.`);
  }

  // Compounding explanation
  if (summary.emergencyWarnings > 0) {
    parts.push(
      "Emergency warnings active — expect road closures, evacuations, and disruption to freight and local services."
    );
  } else if (summary.watchAndAct > 0) {
    parts.push(
      "Watch and Act warnings indicate developing situations that may escalate. Monitor for supply chain impacts."
    );
  } else if (summary.total >= 10) {
    parts.push(
      "Elevated incident volume increases cumulative strain on emergency services and transport routes."
    );
  } else {
    parts.push(
      "Incident volume within routine range. No significant supply chain disruption expected."
    );
  }

  return parts.join(" ");
}

export async function fetchVicEmv(): Promise<Signal | null> {
  try {
    const res = await fetch(EMV_GEOJSON_URL, {
      next: { revalidate: 300 }, // cache 5min — emergency data
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "CRI-Signals/1.0",
        "Accept-Encoding": "gzip",
      },
    });

    if (!res.ok) return null;

    const data: EmvGeoJson = await res.json();
    if (!data.features || !Array.isArray(data.features)) return null;

    const summary = summariseIncidents(data.features);

    return {
      label: "VIC emergency incidents",
      value: formatValue(summary),
      trend: classifyTrend(summary),
      source: "VIC Emergency (emergency.vic.gov.au)",
      context: buildContext(summary),
      lastUpdated: new Date().toISOString(),
      automated: true,
      layer: 6,
      layerLabel: "Emergency",
      propagatesTo: "Road closures, evacuation strain, and freight disruption",
    };
  } catch {
    return null;
  }
}
