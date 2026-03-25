/**
 * Signal confidence computation — SPEC-001 ADR-006
 *
 * Computes a confidence score in [0, 1] for a data signal based on
 * its authority, freshness, and coverage metadata.
 */

export type Authority = 'official' | 'derived' | 'scraped' | 'estimated';
export type Freshness = 'real-time' | 'daily' | 'monthly' | 'annual' | 'census';
export type Coverage = 'national' | 'state' | 'partial';

export interface SignalMeta {
  authority: Authority;
  freshness: Freshness;
  coverage: Coverage;
}

const AUTHORITY_SCORES: Record<Authority, number> = {
  official: 1.0,
  derived: 0.7,
  scraped: 0.4,
  estimated: 0.2,
};

const FRESHNESS_SCORES: Record<Freshness, number> = {
  'real-time': 1.0,
  daily: 0.9,
  monthly: 0.7,
  annual: 0.4,
  census: 0.3,
};

const COVERAGE_SCORES: Record<Coverage, number> = {
  national: 1.0,
  state: 0.6,
  partial: 0.3,
};

const WEIGHTS = {
  authority: 0.35,
  freshness: 0.35,
  coverage: 0.30,
} as const;

export function computeSignalConfidence(meta: SignalMeta): number {
  const raw =
    WEIGHTS.authority * AUTHORITY_SCORES[meta.authority] +
    WEIGHTS.freshness * FRESHNESS_SCORES[meta.freshness] +
    WEIGHTS.coverage * COVERAGE_SCORES[meta.coverage];

  // Clamp to [0, 1] and round to avoid floating-point noise
  return Math.round(Math.min(1, Math.max(0, raw)) * 1000) / 1000;
}
