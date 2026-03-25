/**
 * TEST-021 / TEST-022 — Diversity index functions (SPEC-001 ADR-003)
 *
 * Property-based tests for computeHerfindahl and computeShannonDiversity.
 */

import { describe, it, expect } from 'vitest';
import { computeHerfindahl, computeShannonDiversity } from './diversity';

describe('computeHerfindahl (TEST-021)', () => {
  it('returns 0 for empty input', () => {
    expect(computeHerfindahl({})).toBe(0);
  });

  it('returns 1 for a single category (maximum concentration)', () => {
    expect(computeHerfindahl({ a: 100 })).toBe(1);
  });

  it('returns 1/n for perfectly even distribution', () => {
    const even3 = { a: 10, b: 10, c: 10 };
    expect(computeHerfindahl(even3)).toBeCloseTo(1 / 3, 5);

    const even4 = { a: 5, b: 5, c: 5, d: 5 };
    expect(computeHerfindahl(even4)).toBeCloseTo(1 / 4, 5);
  });

  it('result is always in [0, 1]', () => {
    const cases: Record<string, number>[] = [
      {},
      { a: 1 },
      { a: 1, b: 1 },
      { a: 99, b: 1 },
      { a: 1, b: 2, c: 3, d: 4, e: 5 },
      { a: 1000, b: 1, c: 1, d: 1 },
    ];
    for (const counts of cases) {
      const hhi = computeHerfindahl(counts);
      expect(hhi).toBeGreaterThanOrEqual(0);
      expect(hhi).toBeLessThanOrEqual(1);
    }
  });

  it('is scale-invariant: multiplying all counts by a constant does not change HHI', () => {
    const base = { a: 3, b: 7, c: 5 };
    const scaled = { a: 300, b: 700, c: 500 };
    expect(computeHerfindahl(base)).toBeCloseTo(computeHerfindahl(scaled), 5);
  });

  it('increases as distribution becomes more concentrated', () => {
    const even = { a: 25, b: 25, c: 25, d: 25 };
    const skewed = { a: 70, b: 10, c: 10, d: 10 };
    const monopoly = { a: 100, b: 0, c: 0, d: 0 };

    expect(computeHerfindahl(even)).toBeLessThan(computeHerfindahl(skewed));
    expect(computeHerfindahl(skewed)).toBeLessThan(computeHerfindahl(monopoly));
  });

  it('ignores zero-count categories for concentration (they are still categories)', () => {
    // With zero counts, shares are 0 so they contribute 0 to HHI
    const withZeros = { a: 50, b: 50, c: 0 };
    const withoutZeros = { a: 50, b: 50 };
    expect(computeHerfindahl(withZeros)).toBeCloseTo(computeHerfindahl(withoutZeros), 5);
  });
});

describe('computeShannonDiversity (TEST-022)', () => {
  it('returns 0 for empty input', () => {
    expect(computeShannonDiversity({})).toBe(0);
  });

  it('returns 0 for a single category (no diversity)', () => {
    expect(computeShannonDiversity({ a: 100 })).toBe(0);
  });

  it('returns ln(n) for perfectly even distribution across n categories', () => {
    const even3 = { a: 10, b: 10, c: 10 };
    expect(computeShannonDiversity(even3)).toBeCloseTo(Math.log(3), 5);

    const even5 = { a: 1, b: 1, c: 1, d: 1, e: 1 };
    expect(computeShannonDiversity(even5)).toBeCloseTo(Math.log(5), 5);
  });

  it('result is always in [0, ln(n)]', () => {
    const cases: Record<string, number>[] = [
      { a: 1 },
      { a: 1, b: 1 },
      { a: 99, b: 1 },
      { a: 1, b: 2, c: 3, d: 4, e: 5 },
      { a: 1000, b: 1, c: 1, d: 1 },
    ];
    for (const counts of cases) {
      const h = computeShannonDiversity(counts);
      const n = Object.keys(counts).length;
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(Math.log(n) + 1e-9);
    }
  });

  it('is scale-invariant: multiplying all counts by a constant does not change H', () => {
    const base = { a: 3, b: 7, c: 5 };
    const scaled = { a: 300, b: 700, c: 500 };
    expect(computeShannonDiversity(base)).toBeCloseTo(computeShannonDiversity(scaled), 5);
  });

  it('increases as distribution becomes more even', () => {
    const monopoly = { a: 100, b: 0, c: 0, d: 0 };
    const skewed = { a: 70, b: 10, c: 10, d: 10 };
    const even = { a: 25, b: 25, c: 25, d: 25 };

    expect(computeShannonDiversity(monopoly)).toBeLessThan(computeShannonDiversity(skewed));
    expect(computeShannonDiversity(skewed)).toBeLessThan(computeShannonDiversity(even));
  });

  it('handles zero-count categories gracefully (0 * ln(0) = 0)', () => {
    const withZeros = { a: 50, b: 50, c: 0 };
    const withoutZeros = { a: 50, b: 50 };
    expect(computeShannonDiversity(withZeros)).toBeCloseTo(
      computeShannonDiversity(withoutZeros),
      5,
    );
  });

  it('is non-negative for any input', () => {
    expect(computeShannonDiversity({ a: 1 })).toBeGreaterThanOrEqual(0);
    expect(computeShannonDiversity({ a: 0 })).toBeGreaterThanOrEqual(0);
    expect(computeShannonDiversity({})).toBeGreaterThanOrEqual(0);
  });
});
