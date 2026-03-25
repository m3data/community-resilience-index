/**
 * INFORM pillar and composite scoring — SPEC-001 REQ-008 to REQ-011
 *
 * - computePillarScore: weighted arithmetic mean of indicators, range [0, 10]
 * - computeInformScore: geometric mean of 3 pillars, range [0, 10]
 *
 * All functions are pure.
 */

import { computeSignalConfidence } from './confidence';
import { DEFAULT_SIGNAL_META } from './types';
import type { IndicatorInput, IndicatorBreakdown, PillarResult, InformResult } from './types';

/**
 * Compute a pillar score as the weighted arithmetic mean of its indicators.
 *
 * Missing indicators (value === null) are excluded and their weights
 * redistributed proportionally across valid indicators.
 *
 * @param indicators - Array of indicator inputs (values already on 0-10 scale)
 * @param weights - Corresponding weights (must be same length as indicators)
 * @returns PillarResult with score in [0, 10]
 */
export function computePillarScore(
  indicators: IndicatorInput[],
  weights: number[],
): PillarResult {
  if (indicators.length !== weights.length) {
    throw new Error(
      `indicators and weights must have the same length (got ${indicators.length} vs ${weights.length})`,
    );
  }

  const totalCount = indicators.length;
  const breakdown: IndicatorBreakdown[] = [];

  // Collect valid (non-missing) indicators and their weights
  let validWeightSum = 0;
  let weightedSum = 0;
  let validCount = 0;
  let confidenceSum = 0;

  for (let i = 0; i < indicators.length; i++) {
    const ind = indicators[i];
    if (ind.value === null) {
      breakdown.push({ value: null, effectiveWeight: 0, confidence: 0 });
      continue;
    }

    validCount++;
    validWeightSum += weights[i];
    weightedSum += weights[i] * ind.value;
    const conf = computeSignalConfidence(ind.meta ?? DEFAULT_SIGNAL_META);
    confidenceSum += conf * weights[i];
    breakdown.push({ value: ind.value, effectiveWeight: weights[i], confidence: conf });
  }

  // No valid indicators → score is 0
  if (validCount === 0 || validWeightSum === 0) {
    return { score: 0, confidence: 0, validCount: 0, totalCount, breakdown };
  }

  // Renormalise effective weights for breakdown
  for (const b of breakdown) {
    if (b.value !== null) {
      b.effectiveWeight = b.effectiveWeight / validWeightSum;
    }
  }

  // Normalise by the sum of valid weights (redistributes missing weight)
  const raw = weightedSum / validWeightSum;
  const confidence = confidenceSum / validWeightSum;

  // Clamp to [0, 10] and round to 3 decimal places
  const score =
    Math.round(Math.min(10, Math.max(0, raw)) * 1000) / 1000;

  return { score, confidence, validCount, totalCount, breakdown };
}

/**
 * Compute the composite INFORM score as the geometric mean of pillar scores.
 *
 * Key property: geometric mean <= arithmetic mean (AM-GM inequality).
 * If any pillar score is 0, the INFORM score is 0.
 *
 * @param pillars - Exactly 3 PillarResults (Hazard, Vulnerability, Coping Capacity)
 * @returns InformResult with score in [0, 10]
 */
export function computeInformScore(pillars: PillarResult[]): InformResult {
  if (pillars.length !== 3) {
    throw new Error(`Expected exactly 3 pillars, got ${pillars.length}`);
  }

  // If any pillar is 0, geometric mean is 0
  if (pillars.some((p) => p.score === 0)) {
    return { score: 0, confidence: 0, pillars };
  }

  // Geometric mean of 3 values: (a * b * c) ^ (1/3)
  const product = pillars.reduce((acc, p) => acc * p.score, 1);
  const raw = Math.pow(product, 1 / 3);

  // Average confidence across pillars
  const confidence = pillars.reduce((acc, p) => acc + p.confidence, 0) / pillars.length;

  // Clamp to [0, 10] and round to 3 decimal places
  const score =
    Math.round(Math.min(10, Math.max(0, raw)) * 1000) / 1000;

  return { score, confidence, pillars };
}
