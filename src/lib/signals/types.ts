export type Trend = "up" | "down" | "critical" | "stable";

/** Cascade layer — where this signal sits in the propagation path */
export type CascadeLayer = 1 | 2 | 3 | 4 | 5 | 6;

/** A single component within a composite signal */
export interface SignalComponent {
  label: string;
  value: string;
  change?: string; // e.g. "+1.2%"
  trend?: Trend;
}

/** A regional data point within a regional signal */
export interface RegionalValue {
  region: string;
  value: string;
  trend?: Trend;
}

export interface Signal {
  label: string;
  value: string; // headline value — always a readable summary
  trend: Trend;
  source: string;
  sourceUrl?: string;
  context: string;
  lastUpdated: string | null;
  automated: boolean;

  // Cascade metadata
  layer?: CascadeLayer;
  layerLabel?: string; // e.g. "Upstream Market Signal"
  propagatesTo?: string; // e.g. "Retail fuel prices, typically within 2-4 weeks"

  // Structured sub-values (at most one of these)
  components?: SignalComponent[]; // for composite multi-ticker signals
  regions?: RegionalValue[]; // for regional breakdown signals

  // Sparkline — recent historical values for inline trend visualisation
  sparkline?: { values: number[]; label?: string };

  // Secondary insight (e.g. futures curve shape)
  secondary?: {
    label: string; // citizen-facing: "Market outlook"
    value: string; // citizen-facing: "Markets expect prices to stay high"
    detail?: string; // technical: "Backwardation — near $3.42 above 6-month forward"
  };
}

export interface SignalSet {
  lastFetched: string;
  signals: Record<string, Signal>;
}
