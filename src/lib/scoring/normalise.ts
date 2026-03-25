/**
 * Score normalisation — SPEC-001 REQ-014 / ADR-004
 *
 * Pure functions for normalising raw signal values into a [0, 1] range.
 * Two methods: min-max (default) and percentile-rank (for skewed distributions).
 */

export type NormalisationMethod = 'min-max' | 'percentile-rank';

/**
 * Normalise a value into [0, 1] given all observed values.
 *
 * - min-max: (value - min) / (max - min)
 * - percentile-rank: rank / n
 *
 * Returns 0 when all values are identical (zero-range).
 */
export function normalise(
  value: number,
  allValues: number[],
  method: NormalisationMethod = 'min-max',
): number {
  if (allValues.length === 0) return 0;

  if (method === 'percentile-rank') {
    return percentileRank(value, allValues);
  }

  return minMax(value, allValues);
}

/**
 * Inverted normalisation: targetMax - normalise(value).
 *
 * Useful for signals where lower raw values indicate better outcomes
 * (e.g. cost of living, commute time).
 */
export function normaliseInverted(
  value: number,
  allValues: number[],
  method: NormalisationMethod = 'min-max',
  targetMax: number = 1,
): number {
  return targetMax - normalise(value, allValues, method);
}

/**
 * Compute the sample skewness (Fisher-Pearson) of a distribution.
 *
 * If skewness > 2, the caller should prefer 'percentile-rank' to avoid
 * compression of most values near zero.
 *
 * Returns 0 for arrays with fewer than 3 values.
 */
export function computeSkewness(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;

  const mean = values.reduce((s, v) => s + v, 0) / n;

  let m2 = 0;
  let m3 = 0;
  for (const v of values) {
    const d = v - mean;
    m2 += d * d;
    m3 += d * d * d;
  }
  m2 /= n;
  m3 /= n;

  const sd = Math.sqrt(m2);
  if (sd === 0) return 0;

  // Fisher-Pearson adjusted skewness
  const g1 = m3 / (sd * sd * sd);
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
}

// --- internal helpers ---

function minMax(value: number, allValues: number[]): number {
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;
  if (range === 0) return 0;
  return clamp((value - min) / range);
}

function percentileRank(value: number, allValues: number[]): number {
  const n = allValues.length;
  if (n === 0) return 0;
  const below = allValues.filter((v) => v < value).length;
  return clamp(below / n);
}

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.min(hi, Math.max(lo, v));
}
