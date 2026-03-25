/**
 * TEST-015 — Weight configuration verification (SPEC-001 REQ-015)
 *
 * Checks that indicator weights within each BRIC capital and INFORM
 * pillar sum to 1.0, and that the ADR-003 diversity premium indicators
 * are correctly marked.
 */

import { describe, it, expect } from 'vitest';
import {
  bricCapitals,
  informPillars,
  quadrantThresholds,
  scoreLabels,
  getScoreLabel,
  type CapitalWeights,
  type PillarWeights,
} from './weights';

function sumWeights(group: CapitalWeights | PillarWeights): number {
  const sum = group.indicators.reduce((acc, i) => acc + i.weight, 0);
  return Math.round(sum * 100) / 100;
}

describe('BRIC capital weights (TEST-015)', () => {
  it.each([
    ['social', bricCapitals.social],
    ['economic', bricCapitals.economic],
    ['community', bricCapitals.community],
    ['institutional', bricCapitals.institutional],
    ['housingInfra', bricCapitals.housingInfra],
    ['environmental', bricCapitals.environmental],
  ] as const)('%s capital weights sum to 1.0', (_name, capital) => {
    expect(sumWeights(capital)).toBe(1.0);
  });
});

describe('INFORM pillar weights (TEST-015)', () => {
  it.each([
    ['exposure', informPillars.exposure],
    ['sensitivity', informPillars.sensitivity],
    ['lackOfCopingCapacity', informPillars.lackOfCopingCapacity],
  ] as const)('%s pillar weights sum to 1.0', (_name, pillar) => {
    expect(sumWeights(pillar)).toBe(1.0);
  });
});

describe('ADR-003 diversity premium indicators', () => {
  it('economic capital: industry_diversity is marked as diversity', () => {
    const ind = bricCapitals.economic.indicators.find(
      (i) => i.indicator === 'industry_diversity',
    );
    expect(ind?.diversity).toBe(true);
    expect(ind?.weight).toBe(0.30);
  });

  it('community capital: organisational_type_diversity is marked as diversity', () => {
    const ind = bricCapitals.community.indicators.find(
      (i) => i.indicator === 'organisational_type_diversity',
    );
    expect(ind?.diversity).toBe(true);
    expect(ind?.weight).toBe(0.20);
  });

  it('housing/infra capital: transport_mode_diversity is marked as diversity', () => {
    const ind = bricCapitals.housingInfra.indicators.find(
      (i) => i.indicator === 'transport_mode_diversity',
    );
    expect(ind?.diversity).toBe(true);
    expect(ind?.weight).toBe(0.30);
  });

  it('environmental capital: land_use_diversity is marked as diversity', () => {
    const ind = bricCapitals.environmental.indicators.find(
      (i) => i.indicator === 'land_use_diversity',
    );
    expect(ind?.diversity).toBe(true);
    expect(ind?.weight).toBe(0.25);
  });

  it('exactly 4 diversity indicators exist across all capitals', () => {
    const allIndicators = Object.values(bricCapitals).flatMap(
      (c) => c.indicators,
    );
    const diversityCount = allIndicators.filter((i) => i.diversity).length;
    expect(diversityCount).toBe(4);
  });
});

describe('quadrant thresholds (REQ-012)', () => {
  it('has correct default thresholds', () => {
    expect(quadrantThresholds.resilience).toBe(3.0);
    expect(quadrantThresholds.crisis).toBe(5.0);
  });
});

describe('score labels (REQ-018)', () => {
  it('covers the full BRIC range 0-6 with 6 bands', () => {
    expect(scoreLabels).toHaveLength(6);
    expect(scoreLabels[0].min).toBe(0.0);
    expect(scoreLabels[scoreLabels.length - 1].max).toBe(6.0);
  });

  it('getScoreLabel returns correct labels', () => {
    expect(getScoreLabel(0.5)).toBe('Very Low');
    expect(getScoreLabel(1.5)).toBe('Low');
    expect(getScoreLabel(2.5)).toBe('Below Average');
    expect(getScoreLabel(3.5)).toBe('Average');
    expect(getScoreLabel(4.5)).toBe('Above Average');
    expect(getScoreLabel(5.5)).toBe('High');
  });

  it('getScoreLabel returns Unknown for out-of-range', () => {
    expect(getScoreLabel(-1)).toBe('Unknown');
    expect(getScoreLabel(7)).toBe('Unknown');
  });
});
