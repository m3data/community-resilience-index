/**
 * BRIC capital and composite scoring — SPEC-001 REQ-001 through REQ-007
 *
 * Pure functions. No I/O, no shared state, deterministic.
 */

import { computeSignalConfidence } from './confidence';
import type { IndicatorInput, IndicatorBreakdown, CapitalResult, BricResult } from './types';

/**
 * Compute a single BRIC capital score (REQ-001–006).
 *
 * Weighted arithmetic mean with missing data handling per REQ-013:
 * - NULL indicators excluded, remaining weights renormalised to sum to 1.0
 * - If >50% missing, capital is flagged unavailable
 * - Confidence is the weighted average of contributing signal confidences
 */
export function computeCapitalScore(
  indicators: IndicatorInput[],
  weights: number[],
): CapitalResult {
  if (indicators.length !== weights.length) {
    throw new Error(
      `indicators length (${indicators.length}) must match weights length (${weights.length})`,
    );
  }

  if (indicators.length === 0) {
    return { score: 0, confidence: 0, available: false, breakdown: [] };
  }

  // Identify which indicators have data
  const presentIndices: number[] = [];
  const missingCount = indicators.reduce((count, ind, i) => {
    if (ind.value !== null) {
      presentIndices.push(i);
      return count;
    }
    return count + 1;
  }, 0);

  const totalCount = indicators.length;
  const available = missingCount / totalCount <= 0.5;

  // Build breakdown for all indicators (including missing)
  const breakdown: IndicatorBreakdown[] = indicators.map((ind) => ({
    value: ind.value,
    effectiveWeight: 0,
    confidence: ind.meta ? computeSignalConfidence(ind.meta) : 0,
  }));

  // If unavailable, return early with zero score
  if (!available) {
    return { score: 0, confidence: 0, available: false, breakdown };
  }

  // Renormalise weights for present indicators (REQ-013 rule 3)
  const presentWeightSum = presentIndices.reduce((sum, i) => sum + weights[i], 0);

  if (presentWeightSum === 0) {
    return { score: 0, confidence: 0, available, breakdown };
  }

  // Compute weighted mean and weighted confidence
  let score = 0;
  let confidence = 0;

  for (const i of presentIndices) {
    const normWeight = weights[i] / presentWeightSum;
    breakdown[i].effectiveWeight = normWeight;
    score += normWeight * (indicators[i].value as number);
    confidence += normWeight * breakdown[i].confidence;
  }

  // Clamp and round to avoid floating-point noise
  score = Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;
  confidence = Math.round(Math.min(1, Math.max(0, confidence)) * 1000) / 1000;

  return { score, confidence, available, breakdown };
}

/**
 * Compute the BRIC composite score (REQ-007).
 *
 * Sum of available capital scores, scaled to 0-6 if fewer than 6 available.
 * BRIC = (sum / n_available) * 6
 */
export function computeBricScore(capitals: CapitalResult[]): BricResult {
  const available = capitals.filter((c) => c.available);
  const availableCount = available.length;

  if (availableCount === 0) {
    return { score: 0, confidence: 0, availableCount: 0, capitals };
  }

  const sum = available.reduce((s, c) => s + c.score, 0);
  const score =
    availableCount === 6
      ? Math.round(sum * 1000) / 1000
      : Math.round(((sum / availableCount) * 6) * 1000) / 1000;

  const confidence =
    Math.round(
      (available.reduce((s, c) => s + c.confidence, 0) / availableCount) * 1000,
    ) / 1000;

  return { score, confidence, availableCount, capitals };
}
