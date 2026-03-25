/**
 * TEST-014 — Score normalisation (SPEC-001 REQ-014 / ADR-004)
 *
 * Property-based and worked-example tests for normalise, normaliseInverted,
 * and computeSkewness.
 */

import { describe, it, expect } from 'vitest';
import {
  normalise,
  normaliseInverted,
  computeSkewness,
  type NormalisationMethod,
} from '../normalise';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate an array of n random numbers in [lo, hi). */
function randomValues(n: number, lo = 0, hi = 100, seed = 42): number[] {
  // Simple seeded PRNG (mulberry32)
  let s = seed;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: n }, () => lo + rand() * (hi - lo));
}

// ---------------------------------------------------------------------------
// normalise — min-max
// ---------------------------------------------------------------------------

describe('normalise (min-max)', () => {
  const method: NormalisationMethod = 'min-max';

  it('maps the minimum value to 0', () => {
    const vals = [10, 20, 30, 40, 50];
    expect(normalise(10, vals, method)).toBe(0);
  });

  it('maps the maximum value to 1', () => {
    const vals = [10, 20, 30, 40, 50];
    expect(normalise(50, vals, method)).toBe(1);
  });

  it('maps a midpoint correctly', () => {
    const vals = [0, 100];
    expect(normalise(50, vals, method)).toBe(0.5);
  });

  it('returns 0 when all values are identical', () => {
    const vals = [7, 7, 7, 7];
    expect(normalise(7, vals, method)).toBe(0);
  });

  it('returns 0 for empty allValues', () => {
    expect(normalise(5, [], method)).toBe(0);
  });

  it('works with a single value', () => {
    expect(normalise(42, [42], method)).toBe(0);
  });

  it('clamps values outside the observed range', () => {
    const vals = [10, 20, 30];
    expect(normalise(0, vals, method)).toBe(0);
    expect(normalise(40, vals, method)).toBe(1);
  });

  // Property: all normalised outputs in [0, 1]
  it('always returns values in [0, 1] for random inputs', () => {
    const vals = randomValues(200);
    for (const v of vals) {
      const norm = normalise(v, vals, method);
      expect(norm).toBeGreaterThanOrEqual(0);
      expect(norm).toBeLessThanOrEqual(1);
    }
  });

  // Property: monotonicity — if a > b then normalise(a) >= normalise(b)
  it('preserves ordering (monotonicity)', () => {
    const vals = randomValues(100);
    const sorted = [...vals].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect(normalise(sorted[i], vals, method)).toBeGreaterThanOrEqual(
        normalise(sorted[i - 1], vals, method),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// normalise — percentile-rank
// ---------------------------------------------------------------------------

describe('normalise (percentile-rank)', () => {
  const method: NormalisationMethod = 'percentile-rank';

  it('maps the minimum value to 0 (nothing below it)', () => {
    const vals = [10, 20, 30, 40, 50];
    expect(normalise(10, vals, method)).toBe(0);
  });

  it('maps the maximum value to (n-1)/n', () => {
    const vals = [10, 20, 30, 40, 50];
    // 4 values below 50, rank = 4/5 = 0.8
    expect(normalise(50, vals, method)).toBe(0.8);
  });

  it('returns 0 for empty allValues', () => {
    expect(normalise(5, [], method)).toBe(0);
  });

  it('returns 0 when all values are identical', () => {
    const vals = [5, 5, 5, 5];
    expect(normalise(5, vals, method)).toBe(0);
  });

  // Property: all outputs in [0, 1]
  it('always returns values in [0, 1] for random inputs', () => {
    const vals = randomValues(200);
    for (const v of vals) {
      const norm = normalise(v, vals, method);
      expect(norm).toBeGreaterThanOrEqual(0);
      expect(norm).toBeLessThanOrEqual(1);
    }
  });

  // Property: monotonicity
  it('preserves ordering (monotonicity)', () => {
    const vals = randomValues(100);
    const sorted = [...vals].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect(normalise(sorted[i], vals, method)).toBeGreaterThanOrEqual(
        normalise(sorted[i - 1], vals, method),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// normaliseInverted
// ---------------------------------------------------------------------------

describe('normaliseInverted', () => {
  it('is the complement of normalise (min-max)', () => {
    const vals = [10, 20, 30, 40, 50];
    expect(normaliseInverted(10, vals)).toBe(1); // best = lowest
    expect(normaliseInverted(50, vals)).toBe(0); // worst = highest
  });

  it('is the complement of normalise (percentile-rank)', () => {
    const vals = [10, 20, 30, 40, 50];
    expect(normaliseInverted(10, vals, 'percentile-rank')).toBe(1);
    expect(normaliseInverted(50, vals, 'percentile-rank')).toBeCloseTo(0.2);
  });

  // Property: normalise(v) + normaliseInverted(v) = targetMax
  it('normalise + normaliseInverted = targetMax for all values', () => {
    const vals = randomValues(100);
    for (const v of vals) {
      const sum = normalise(v, vals) + normaliseInverted(v, vals);
      expect(sum).toBeCloseTo(1);
    }
  });
});

// ---------------------------------------------------------------------------
// computeSkewness
// ---------------------------------------------------------------------------

describe('computeSkewness', () => {
  it('returns 0 for fewer than 3 values', () => {
    expect(computeSkewness([])).toBe(0);
    expect(computeSkewness([1])).toBe(0);
    expect(computeSkewness([1, 2])).toBe(0);
  });

  it('returns 0 for a symmetric distribution', () => {
    // Perfectly symmetric around 5
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(computeSkewness(vals)).toBeCloseTo(0, 5);
  });

  it('returns 0 for constant values', () => {
    expect(computeSkewness([3, 3, 3, 3, 3])).toBe(0);
  });

  it('returns positive skewness for right-skewed data', () => {
    // Exponential-like: mostly small, one big outlier
    const vals = [1, 1, 1, 1, 1, 1, 1, 1, 1, 100];
    expect(computeSkewness(vals)).toBeGreaterThan(0);
  });

  it('returns negative skewness for left-skewed data', () => {
    const vals = [100, 99, 99, 99, 99, 99, 99, 99, 99, 1];
    expect(computeSkewness(vals)).toBeLessThan(0);
  });

  it('detects high skewness (> 2) for heavily skewed data', () => {
    // Simulate city population distribution: many small, few large
    const vals = [
      1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5, 6, 7, 8, 10, 15, 50, 500,
    ];
    expect(computeSkewness(vals)).toBeGreaterThan(2);
  });
});

// ---------------------------------------------------------------------------
// Default method
// ---------------------------------------------------------------------------

describe('default method', () => {
  it('uses min-max when no method is specified', () => {
    const vals = [0, 50, 100];
    expect(normalise(50, vals)).toBe(0.5);
    expect(normaliseInverted(50, vals)).toBe(0.5);
  });
});
