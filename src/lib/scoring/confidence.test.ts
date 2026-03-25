/**
 * TEST-023 — Signal confidence computation (SPEC-001 ADR-006)
 *
 * Three worked examples covering the full range of confidence scores.
 */

import { describe, it, expect } from 'vitest';
import { computeSignalConfidence, type SignalMeta } from './confidence';

describe('computeSignalConfidence (TEST-023)', () => {
  it('returns 1.0 for highest-quality signal: official / real-time / national', () => {
    const meta: SignalMeta = {
      authority: 'official',
      freshness: 'real-time',
      coverage: 'national',
    };
    expect(computeSignalConfidence(meta)).toBe(1.0);
  });

  it('returns 0.67 for mid-range signal: derived / monthly / state', () => {
    const meta: SignalMeta = {
      authority: 'derived',
      freshness: 'monthly',
      coverage: 'state',
    };
    // 0.35*0.7 + 0.35*0.7 + 0.30*0.6 = 0.67
    expect(computeSignalConfidence(meta)).toBe(0.67);
  });

  it('returns 0.265 for lowest-quality signal: estimated / census / partial', () => {
    const meta: SignalMeta = {
      authority: 'estimated',
      freshness: 'census',
      coverage: 'partial',
    };
    // 0.35*0.2 + 0.35*0.3 + 0.30*0.3 = 0.265
    expect(computeSignalConfidence(meta)).toBe(0.265);
  });

  it('always returns a value in [0, 1]', () => {
    const allMeta: SignalMeta[] = [];
    for (const authority of ['official', 'derived', 'scraped', 'estimated'] as const) {
      for (const freshness of ['real-time', 'daily', 'monthly', 'annual', 'census'] as const) {
        for (const coverage of ['national', 'state', 'partial'] as const) {
          allMeta.push({ authority, freshness, coverage });
        }
      }
    }

    for (const meta of allMeta) {
      const score = computeSignalConfidence(meta);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});
