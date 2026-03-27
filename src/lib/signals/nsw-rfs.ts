/**
 * NSW RFS Major Incidents Signal — GeoJSON Feed
 *
 * No auth required. Feed refreshes roughly every 30 minutes.
 * Parses GeoJSON features for active bushfire/grassfire incidents.
 *
 * Emergency events compound supply chain disruption — a bushfire
 * or flood in a region already under fuel stress creates
 * multiplicative pressure on transport corridors and local services.
 */

import type { Signal, Trend } from "./types";

const RFS_FEED =
  "https://www.rfs.nsw.gov.au/feeds/majorIncidents.json";

interface RfsIncident {
  title: string;
  category: string; // "Emergency Warning", "Watch and Act", "Advice", "Not Applicable"
  status: string;
  type: string;
  size: string;
  councilArea: string;
  isFire: boolean;
}

/**
 * Parse the HTML description blob embedded in each feature's properties.
 * Fields are encoded as: <b>FIELD:</b>&nbsp;value<br />
 */
function parseDescription(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const regex = /<b>\s*([^<:]+)\s*:\s*<\/b>\s*&nbsp;([^<]*)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    fields[match[1].trim().toUpperCase()] = match[2].trim();
  }
  return fields;
}

function extractIncident(
  feature: Record<string, unknown>
): RfsIncident | null {
  const props = feature.properties as Record<string, unknown> | undefined;
  if (!props) return null;

  const description = parseDescription(
    (props.description as string) ?? ""
  );

  return {
    title: (props.title as string) ?? "Unknown",
    category: (props.category as string) ?? description["ALERT LEVEL"] ?? "Unknown",
    status: description["STATUS"] ?? "Unknown",
    type: description["TYPE"] ?? "Unknown",
    size: description["SIZE"] ?? "Unknown",
    councilArea: description["COUNCIL AREA"] ?? "Unknown",
    isFire: description["FIRE"] === "Yes",
  };
}

function classifyTrend(
  total: number,
  emergencyCount: number,
  watchActCount: number
): Trend {
  if (emergencyCount > 0) return "critical";
  if (watchActCount > 0 || total >= 10) return "up";
  if (total >= 3) return "stable";
  return "down";
}

export async function fetchNswRfs(): Promise<Signal | null> {
  try {
    const res = await fetch(RFS_FEED, {
      next: { revalidate: 1800 }, // cache 30min — matches feed refresh
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const geo = (await res.json()) as {
      type: string;
      features: Record<string, unknown>[];
    };
    if (!geo.features || !Array.isArray(geo.features)) return null;

    const incidents = geo.features
      .map(extractIncident)
      .filter((i): i is RfsIncident => i !== null);

    const fires = incidents.filter((i) => i.isFire);
    const emergencies = incidents.filter(
      (i) => i.category === "Emergency Warning"
    );
    const watchAct = incidents.filter(
      (i) => i.category === "Watch and Act"
    );

    const trend = classifyTrend(
      incidents.length,
      emergencies.length,
      watchAct.length
    );

    // Affected council areas (deduplicated)
    const areas = [
      ...new Set(
        incidents
          .map((i) => i.councilArea)
          .filter((a) => a !== "Unknown")
      ),
    ];

    // Build value string
    const value =
      incidents.length === 0
        ? "No major incidents"
        : `${incidents.length} incident${incidents.length !== 1 ? "s" : ""} (${fires.length} fire${fires.length !== 1 ? "s" : ""})`;

    // Build context
    const parts: string[] = [];

    if (emergencies.length > 0) {
      parts.push(
        `${emergencies.length} at Emergency Warning: ${emergencies.map((e) => e.title).join(", ")}.`
      );
    }
    if (watchAct.length > 0) {
      parts.push(
        `${watchAct.length} at Watch and Act.`
      );
    }
    if (areas.length > 0) {
      const shown = areas.slice(0, 5);
      const suffix = areas.length > 5 ? ` and ${areas.length - 5} more` : "";
      parts.push(`Affected areas: ${shown.join(", ")}${suffix}.`);
    }
    if (incidents.length === 0) {
      parts.push(
        "No major incidents currently listed. Conditions can change rapidly during fire season."
      );
    }
    if (fires.length > 0 && emergencies.length === 0) {
      parts.push(
        "Active fires present but none at emergency level. Monitor for escalation during high-risk weather."
      );
    }

    return {
      label: "NSW bushfire incidents",
      value,
      trend,
      source: "NSW Rural Fire Service",
      context: parts.join(" "),
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
