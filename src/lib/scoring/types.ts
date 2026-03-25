/**
 * Shared types for CRI scoring engine — SPEC-001
 */

import type { SignalMeta } from './confidence';

/** Default signal metadata for tests/cases where meta is not provided. */
export const DEFAULT_SIGNAL_META: SignalMeta = {
  authority: 'estimated',
  freshness: 'census',
  coverage: 'partial',
};

/** A single indicator input to a capital/pillar scoring function. */
export interface IndicatorInput {
  /** Normalised value in [0, 1] (BRIC) or [0, 10] (INFORM). null if missing. */
  value: number | null;
  /** Signal metadata for confidence computation. Optional — defaults used if absent. */
  meta?: SignalMeta;
}

/** Breakdown of a single indicator's contribution to its capital/pillar score. */
export interface IndicatorBreakdown {
  /** Original normalised value (null if missing). */
  value: number | null;
  /** Weight used after renormalisation (0 if missing). */
  effectiveWeight: number;
  /** Signal confidence for this indicator. */
  confidence: number;
}

// ── BRIC (Layer 1) ─────────────────────────────────────────────────────────

/** Result of computing a single BRIC capital score. */
export interface CapitalResult {
  /** Weighted arithmetic mean of available indicators, in [0, 1]. 0 if unavailable. */
  score: number;
  /** Weighted average of contributing signal confidences, in [0, 1]. */
  confidence: number;
  /** false if >50% of indicators are missing (REQ-013 rule 5). */
  available: boolean;
  /** Per-indicator breakdown for decomposition (REQ-016). */
  breakdown: IndicatorBreakdown[];
}

/** Result of computing the BRIC composite score. */
export interface BricResult {
  /** Composite BRIC score in [0, 6]. */
  score: number;
  /** Average confidence across available capitals. */
  confidence: number;
  /** Number of capitals that contributed (available = true). */
  availableCount: number;
  /** Per-capital results for decomposition. */
  capitals: CapitalResult[];
}

// ── INFORM (Layer 2) ───────────────────────────────────────────────────────

/** Result of computing a single INFORM pillar score. */
export interface PillarResult {
  /** Weighted arithmetic mean, range [0, 10]. */
  score: number;
  /** Weighted average of contributing signal confidences. */
  confidence: number;
  /** Number of indicators that contributed to the score. */
  validCount: number;
  /** Total number of indicators (including missing). */
  totalCount: number;
  /** Per-indicator breakdown for decomposition (REQ-016). */
  breakdown: IndicatorBreakdown[];
}

/** Result of the composite INFORM score. */
export interface InformResult {
  /** Geometric mean of pillar scores, range [0, 10]. */
  score: number;
  /** Average confidence across pillars. */
  confidence: number;
  /** The individual pillar results that fed the composite. */
  pillars: PillarResult[];
}
