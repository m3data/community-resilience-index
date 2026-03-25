export type Trend = "up" | "down" | "critical" | "stable";

export interface Signal {
  label: string;
  value: string;
  trend: Trend;
  source: string;
  context: string;
  lastUpdated: string | null; // ISO date or null if manual
  automated: boolean;
}

export interface SignalSet {
  lastFetched: string;
  signals: Record<string, Signal>;
}
