/**
 * ABS Food Basket CPI — Layer 4: Retail food price pressure
 *
 * Quarterly YoY% change for food sub-groups via ABS SDMX API.
 * Shows which food categories are inflating fastest — more actionable
 * than a single "food CPI" number.
 *
 * Sub-groups:
 *   20001: Food & non-alcoholic beverages (total)
 *   20002: Bread & cereals
 *   20003: Meat & seafood
 *   20004: Dairy & related
 *   20005: Fruit & vegetables
 *   20006: Food products n.e.c. (oils, condiments, prepared meals)
 *
 * MEASURE=3 (YoY % change), TSEST=10 (Original), REGION=50 (Australia), FREQ=Q
 */

import type { Signal, SignalComponent } from "./types";

const ABS_BASE = "https://data.api.abs.gov.au/rest/data";
const DATAFLOW = "ABS,CPI,1.1.0";

const FOOD_CODES = ["20001", "20002", "20003", "20004", "20005", "20006"];
const FOOD_LABELS: Record<string, string> = {
  "20001": "Food & beverages (total)",
  "20002": "Bread & cereals",
  "20003": "Meat & seafood",
  "20004": "Dairy",
  "20005": "Fruit & vegetables",
  "20006": "Other food (oils, prepared meals)",
};

interface FoodObservation {
  index: string;
  period: string;
  value: number;
}

function parseQuarter(period: string): { year: number; quarter: number } {
  const [y, q] = period.split("-Q");
  return { year: parseInt(y), quarter: parseInt(q) };
}

function formatQuarter(period: string): string {
  const { year, quarter } = parseQuarter(period);
  const months = ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"];
  return `${months[quarter - 1]} ${year}`;
}

function getQueryRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  // ABS publishes ~6 weeks after quarter end, so request last 5 quarters
  const startYear = year - 1;
  return {
    start: `${startYear}-Q1`,
    end: `${year}-Q${quarter}`,
  };
}

export async function fetchFoodBasket(): Promise<Signal | null> {
  try {
    const range = getQueryRange();
    const indexParam = FOOD_CODES.join("+");
    const url = `${ABS_BASE}/${DATAFLOW}/3.${indexParam}.10.50.Q?startPeriod=${range.start}&endPeriod=${range.end}&format=csv`;

    const res = await fetch(url, {
      next: { revalidate: 86400 }, // cache 24h — quarterly data
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const csv = await res.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return null;

    // Parse CSV rows
    const observations: FoodObservation[] = [];
    for (const line of lines.slice(1)) {
      const cols = line.split(",");
      // DATAFLOW,MEASURE,INDEX,TSEST,REGION,FREQ,TIME_PERIOD,OBS_VALUE,...
      const index = cols[2];
      const period = cols[6];
      const value = parseFloat(cols[7]);
      if (index && period && !isNaN(value)) {
        observations.push({ index, period, value });
      }
    }

    if (observations.length === 0) return null;

    // Get the latest period
    const periods = [...new Set(observations.map((o) => o.period))].sort();
    const latestPeriod = periods[periods.length - 1];
    const prevPeriod = periods.length > 1 ? periods[periods.length - 2] : null;

    // Get latest values per sub-group
    const latest = observations.filter((o) => o.period === latestPeriod);
    const previous = prevPeriod
      ? observations.filter((o) => o.period === prevPeriod)
      : [];

    // Total food CPI
    const totalFood = latest.find((o) => o.index === "20001");
    if (!totalFood) return null;

    // Build sub-group components
    const subGroups = latest
      .filter((o) => o.index !== "20001")
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // highest movement first

    const components: SignalComponent[] = subGroups.map((sg) => {
      const prev = previous.find((p) => p.index === sg.index);
      const direction = sg.value > 0 ? "+" : "";
      let trend: SignalComponent["trend"];
      if (Math.abs(sg.value) > 5) trend = "critical";
      else if (sg.value > 2) trend = "up";
      else if (sg.value < -1) trend = "down";
      else trend = "stable";

      return {
        label: FOOD_LABELS[sg.index] ?? sg.index,
        value: `${direction}${sg.value.toFixed(1)}%`,
        change: prev
          ? `was ${prev.value > 0 ? "+" : ""}${prev.value.toFixed(1)}%`
          : undefined,
        trend,
      };
    });

    // Determine overall trend
    let trend: Signal["trend"] = "stable";
    if (totalFood.value > 5) trend = "critical";
    else if (totalFood.value > 2) trend = "up";
    else if (totalFood.value < -1) trend = "down";

    // Find the fastest-moving category
    const fastest = subGroups[0];
    const fastestName = FOOD_LABELS[fastest?.index] ?? "food";
    const fastestDir = fastest?.value > 0 ? "up" : "down";

    // Build context
    const prevTotal = previous.find((p) => p.index === "20001");
    let context =
      `Food prices ${totalFood.value > 0 ? "rose" : "fell"} ${Math.abs(totalFood.value).toFixed(1)}% year-on-year in ${formatQuarter(latestPeriod)}.`;

    if (prevTotal) {
      const change = totalFood.value - prevTotal.value;
      context += ` ${Math.abs(change) < 0.3 ? "Broadly steady" : change > 0 ? "Accelerating" : "Easing"} from ${prevTotal.value > 0 ? "+" : ""}${prevTotal.value.toFixed(1)}% the previous quarter.`;
    }

    context += ` Fastest-moving category: ${fastestName} (${fastest.value > 0 ? "+" : ""}${fastest.value.toFixed(1)}%).`;

    // Add interpretation
    const highItems = subGroups.filter((s) => s.value > 3);
    if (highItems.length > 0) {
      const names = highItems
        .map((s) => FOOD_LABELS[s.index]?.toLowerCase() ?? s.index)
        .join(" and ");
      context += ` ${names.charAt(0).toUpperCase() + names.slice(1)} ${highItems.length > 1 ? "are" : "is"} rising faster than overall food inflation — households spending more in ${highItems.length > 1 ? "these categories" : "this category"} feel it first.`;
    }

    return {
      label: "Food basket price pressure",
      value: `${totalFood.value > 0 ? "+" : ""}${totalFood.value.toFixed(1)}% YoY`,
      trend,
      source: "ABS Consumer Price Index",
      sourceUrl:
        "https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia",
      context,
      lastUpdated: null, // quarterly, no specific date
      automated: true,
      layer: 4,
      layerLabel: "Retail impact",
      propagatesTo:
        "Household budgets, food bank demand, community stress",
      components,
    };
  } catch {
    return null;
  }
}
