/**
 * TEST-008 to TEST-011 — INFORM pillar and composite scoring (SPEC-001)
 */

import { describe, it, expect } from 'vitest';
import { computePillarScore, computeInformScore } from './inform';
import type { IndicatorInput, PillarResult } from './types';

describe('computePillarScore (TEST-008, TEST-009)', () => {
  it('TEST-008a: computes weighted arithmetic mean for equal weights', () => {
    const indicators: IndicatorInput[] = [
      { value: 4 },
      { value: 6 },
      { value: 8 },
    ];
    const weights = [1, 1, 1];
    const result = computePillarScore(indicators, weights);

    expect(result.score).toBe(6);
    expect(result.validCount).toBe(3);
    expect(result.totalCount).toBe(3);
  });

  it('TEST-008b: computes weighted arithmetic mean with unequal weights', () => {
    const indicators: IndicatorInput[] = [
      { value: 2 },
      { value: 8 },
    ];
    const weights = [0.3, 0.7];
    const result = computePillarScore(indicators, weights);

    // 0.3*2 + 0.7*8 = 0.6 + 5.6 = 6.2
    expect(result.score).toBe(6.2);
    expect(result.validCount).toBe(2);
  });

  it('TEST-008c: score is in range [0, 10] for boundary values', () => {
    const zeros: IndicatorInput[] = [{ value: 0 }, { value: 0 }];
    const tens: IndicatorInput[] = [{ value: 10 }, { value: 10 }];

    expect(computePillarScore(zeros, [1, 1]).score).toBe(0);
    expect(computePillarScore(tens, [1, 1]).score).toBe(10);
  });

  it('TEST-009a: missing indicators are excluded and weights redistributed', () => {
    const indicators: IndicatorInput[] = [
      { value: 4 },
      { value: null },
      { value: 8 },
    ];
    const weights = [1, 1, 1];
    const result = computePillarScore(indicators, weights);

    // Only indicators 0 and 2 contribute: (1*4 + 1*8) / (1+1) = 6
    expect(result.score).toBe(6);
    expect(result.validCount).toBe(2);
    expect(result.totalCount).toBe(3);
  });

  it('TEST-009b: indicator with null value is excluded', () => {
    const indicators: IndicatorInput[] = [
      { value: 5 },
      { value: null },
    ];
    const weights = [0.6, 0.4];
    const result = computePillarScore(indicators, weights);

    // Only first contributes: (0.6*5) / 0.6 = 5
    expect(result.score).toBe(5);
    expect(result.validCount).toBe(1);
  });

  it('TEST-009c: all indicators missing yields score 0', () => {
    const indicators: IndicatorInput[] = [
      { value: null },
      { value: null },
    ];
    const weights = [1, 1];
    const result = computePillarScore(indicators, weights);

    expect(result.score).toBe(0);
    expect(result.validCount).toBe(0);
  });

  it('throws when indicators and weights have different lengths', () => {
    expect(() =>
      computePillarScore([{ value: 1 }], [1, 2]),
    ).toThrow('same length');
  });
});

describe('computeInformScore (TEST-010, TEST-011)', () => {
  const makePillar = (score: number): PillarResult => ({
    score,
    validCount: 3,
    totalCount: 3,
  });

  it('TEST-010a: geometric mean of equal pillar scores equals that score', () => {
    const pillars = [makePillar(5), makePillar(5), makePillar(5)];
    const result = computeInformScore(pillars);

    expect(result.score).toBe(5);
  });

  it('TEST-010b: geometric mean of different scores', () => {
    const pillars = [makePillar(4), makePillar(6), makePillar(8)];
    const result = computeInformScore(pillars);

    // (4 * 6 * 8) ^ (1/3) = 192^(1/3) ≈ 5.769
    expect(result.score).toBeCloseTo(5.769, 2);
  });

  it('TEST-010c: score is in range [0, 10]', () => {
    const pillars = [makePillar(10), makePillar(10), makePillar(10)];
    const result = computeInformScore(pillars);

    expect(result.score).toBe(10);
  });

  it('TEST-011a: if any pillar is 0, INFORM score is 0', () => {
    const pillars = [makePillar(7), makePillar(0), makePillar(9)];
    const result = computeInformScore(pillars);

    expect(result.score).toBe(0);
  });

  it('TEST-011b: AM-GM inequality — geometric mean <= arithmetic mean', () => {
    const testCases = [
      [2, 5, 9],
      [1, 3, 7],
      [4, 6, 8],
      [0.5, 5, 9.5],
      [10, 10, 10],
    ];

    for (const [a, b, c] of testCases) {
      const pillars = [makePillar(a), makePillar(b), makePillar(c)];
      const result = computeInformScore(pillars);
      const arithmeticMean = (a + b + c) / 3;

      expect(result.score).toBeLessThanOrEqual(arithmeticMean + 0.001);
    }
  });

  it('TEST-011c: includes pillar results in output', () => {
    const pillars = [makePillar(3), makePillar(6), makePillar(9)];
    const result = computeInformScore(pillars);

    expect(result.pillars).toHaveLength(3);
    expect(result.pillars[0].score).toBe(3);
  });

  it('throws when not exactly 3 pillars', () => {
    expect(() => computeInformScore([makePillar(5), makePillar(5)])).toThrow(
      '3 pillars',
    );
  });
});
