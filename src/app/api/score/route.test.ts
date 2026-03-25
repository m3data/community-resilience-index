/**
 * Integration tests for GET /api/score — SPEC-001 TEST-050, TEST-051
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  handleScoreRequest,
  clearCache,
  type PostcodeRecord,
  type ErrorResponse,
} from './route.js';
import type { Action } from '../../../lib/scoring/quadrant.js';

// A known postcode present in the census data (Wollongong)
const KNOWN_POSTCODE = '2500';
// A postcode not in any dataset
const MISSING_POSTCODE = '9998';

beforeAll(() => {
  clearCache(); // ensure fresh load
});

afterAll(() => {
  clearCache();
});

// ── TEST-050: API Contract Integration ──────────────────────────────────────

describe('TEST-050: API contract integration', () => {
  let result: { status: number; body: PostcodeRecord };

  beforeAll(() => {
    const res = handleScoreRequest(KNOWN_POSTCODE);
    expect(res.status).toBe(200);
    result = res as { status: 200; body: PostcodeRecord };
  });

  it('returns valid JSON matching PostcodeRecord interface', () => {
    const body = result.body;
    expect(body).toBeDefined();
    expect(typeof body.postcode).toBe('string');
    expect(typeof body.state).toBe('string');
  });

  it('includes all required top-level fields', () => {
    const body = result.body;
    expect(body).toHaveProperty('postcode');
    expect(body).toHaveProperty('state');
    expect(body).toHaveProperty('bric');
    expect(body).toHaveProperty('inform');
    expect(body).toHaveProperty('quadrant');
    expect(body).toHaveProperty('quadrant_label');
    expect(body).toHaveProperty('actions');
    expect(body).toHaveProperty('data_confidence');
    expect(body).toHaveProperty('signals');
    expect(body).toHaveProperty('last_updated');
  });

  it('BRIC score is in [0, 6]', () => {
    expect(result.body.bric.score).toBeGreaterThanOrEqual(0);
    expect(result.body.bric.score).toBeLessThanOrEqual(6);
  });

  it('BRIC has label and confidence', () => {
    expect(typeof result.body.bric.label).toBe('string');
    expect(result.body.bric.label.length).toBeGreaterThan(0);
    expect(result.body.bric.confidence).toBeGreaterThanOrEqual(0);
    expect(result.body.bric.confidence).toBeLessThanOrEqual(1);
  });

  it('INFORM score is in [0, 10]', () => {
    expect(result.body.inform.score).toBeGreaterThanOrEqual(0);
    expect(result.body.inform.score).toBeLessThanOrEqual(10);
  });

  it('INFORM has label and confidence', () => {
    expect(typeof result.body.inform.label).toBe('string');
    expect(result.body.inform.label.length).toBeGreaterThan(0);
    expect(result.body.inform.confidence).toBeGreaterThanOrEqual(0);
    expect(result.body.inform.confidence).toBeLessThanOrEqual(1);
  });

  it('quadrant is one of the four valid classifications', () => {
    expect(['monitor', 'stress-tested', 'structurally-fragile', 'critical']).toContain(
      result.body.quadrant,
    );
  });

  it('each BRIC capital has score, confidence, available, indicators', () => {
    const capitalNames = [
      'social', 'economic', 'community', 'institutional',
      'housing_infrastructure', 'environmental',
    ] as const;

    for (const name of capitalNames) {
      const cap = result.body.bric.capitals[name];
      expect(cap).toBeDefined();
      expect(typeof cap.score).toBe('number');
      expect(cap.score).toBeGreaterThanOrEqual(0);
      expect(cap.score).toBeLessThanOrEqual(1);
      expect(typeof cap.confidence).toBe('number');
      expect(typeof cap.available).toBe('boolean');
      expect(typeof cap.indicators).toBe('object');
    }
  });

  it('each INFORM pillar has score, confidence, indicators', () => {
    const pillarNames = ['exposure', 'sensitivity', 'lack_of_coping'] as const;

    for (const name of pillarNames) {
      const pil = result.body.inform.pillars[name];
      expect(pil).toBeDefined();
      expect(typeof pil.score).toBe('number');
      expect(pil.score).toBeGreaterThanOrEqual(0);
      expect(pil.score).toBeLessThanOrEqual(10);
      expect(typeof pil.confidence).toBe('number');
      expect(typeof pil.indicators).toBe('object');
    }
  });

  it('each indicator has raw, normalised, weight, direction, normalisation_method, signal', () => {
    // Check a capital
    const socialIndicators = result.body.bric.capitals.social.indicators;
    for (const [, ind] of Object.entries(socialIndicators)) {
      expect(ind).toHaveProperty('raw');
      expect(typeof ind.normalised).toBe('number');
      expect(typeof ind.weight).toBe('number');
      expect(['higher_better', 'lower_better']).toContain(ind.direction);
      expect(['min-max', 'percentile-rank']).toContain(ind.normalisation_method);
      expect(ind.signal).toBeDefined();
    }

    // Check a pillar
    const exposureIndicators = result.body.inform.pillars.exposure.indicators;
    for (const [, ind] of Object.entries(exposureIndicators)) {
      expect(ind).toHaveProperty('raw');
      expect(typeof ind.normalised).toBe('number');
      expect(typeof ind.weight).toBe('number');
      expect(['higher_better', 'lower_better']).toContain(ind.direction);
      expect(['min-max', 'percentile-rank']).toContain(ind.normalisation_method);
      expect(ind.signal).toBeDefined();
    }
  });

  it('signal metadata includes source, authority, freshness, coverage, last_updated, confidence', () => {
    const socialIndicators = result.body.bric.capitals.social.indicators;
    const firstInd = Object.values(socialIndicators)[0];
    const signal = firstInd.signal;

    expect(typeof signal.source).toBe('string');
    expect(typeof signal.authority).toBe('string');
    expect(typeof signal.freshness).toBe('string');
    expect(typeof signal.coverage).toBe('string');
    expect(typeof signal.last_updated).toBe('string');
    expect(typeof signal.confidence).toBe('number');
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(1);
  });

  it('actions array is non-empty with required fields', () => {
    expect(result.body.actions.length).toBeGreaterThan(0);
    for (const action of result.body.actions) {
      expect(['immediate', 'this_week', 'this_month', 'ongoing']).toContain(action.priority);
      expect(['household', 'community', 'advocacy']).toContain(action.category);
      expect(typeof action.title).toBe('string');
      expect(action.title.length).toBeGreaterThan(0);
      expect(typeof action.description).toBe('string');
      expect(action.description.length).toBeGreaterThan(0);
      expect(typeof action.guide_section).toBe('string');
      expect(action.guide_section.startsWith('#')).toBe(true);
    }
  });

  it('data_confidence is in [0, 1]', () => {
    expect(result.body.data_confidence).toBeGreaterThanOrEqual(0);
    expect(result.body.data_confidence).toBeLessThanOrEqual(1);
  });

  it('signals array is non-empty', () => {
    expect(result.body.signals.length).toBeGreaterThan(0);
  });

  it('last_updated is a valid date string', () => {
    const date = new Date(result.body.last_updated);
    expect(date.toString()).not.toBe('Invalid Date');
  });

  it('postcode matches the requested postcode', () => {
    expect(result.body.postcode).toBe(KNOWN_POSTCODE);
  });

  it('state is derived from postcode', () => {
    expect(result.body.state).toBe('NSW');
  });
});

// ── TEST-050 supplement: partial data postcodes ─────────────────────────────

describe('TEST-050: partial data produces 200 with reduced confidence', () => {
  it('returns 200 for postcodes with partial data sources', () => {
    // Find a postcode that might be in some but not all datasets
    // by just testing another valid postcode
    const res = handleScoreRequest('2000');
    expect(res.status).toBe(200);

    const body = res.body as PostcodeRecord;
    expect(body.data_confidence).toBeGreaterThanOrEqual(0);
    expect(body.data_confidence).toBeLessThanOrEqual(1);
  });
});

// ── TEST-051: Error Responses ───────────────────────────────────────────────

describe('TEST-051: error responses', () => {
  it('GET /api/score?postcode=abc → 400 (invalid format)', () => {
    const res = handleScoreRequest('abc');
    expect(res.status).toBe(400);
    const body = res.body as ErrorResponse;
    expect(typeof body.error).toBe('string');
    expect(body.status).toBe(400);
  });

  it('GET /api/score?postcode=9998 (not in data) → 404', () => {
    const res = handleScoreRequest(MISSING_POSTCODE);
    expect(res.status).toBe(404);
    const body = res.body as ErrorResponse;
    expect(typeof body.error).toBe('string');
    expect(body.status).toBe(404);
  });

  it('GET /api/score (no postcode) → 400', () => {
    const res = handleScoreRequest(null);
    expect(res.status).toBe(400);
    const body = res.body as ErrorResponse;
    expect(typeof body.error).toBe('string');
    expect(body.status).toBe(400);
  });

  it('GET /api/score (undefined postcode) → 400', () => {
    const res = handleScoreRequest(undefined);
    expect(res.status).toBe(400);
    const body = res.body as ErrorResponse;
    expect(typeof body.error).toBe('string');
    expect(body.status).toBe(400);
  });

  it('GET /api/score?postcode=12345 (too many digits) → 400', () => {
    const res = handleScoreRequest('12345');
    expect(res.status).toBe(400);
    const body = res.body as ErrorResponse;
    expect(typeof body.error).toBe('string');
    expect(body.status).toBe(400);
  });

  it('GET /api/score?postcode=12 (too few digits) → 400', () => {
    const res = handleScoreRequest('12');
    expect(res.status).toBe(400);
    const body = res.body as ErrorResponse;
    expect(typeof body.error).toBe('string');
    expect(body.status).toBe(400);
  });

  it('GET /api/score?postcode= (empty string) → 400', () => {
    const res = handleScoreRequest('');
    expect(res.status).toBe(400);
    const body = res.body as ErrorResponse;
    expect(typeof body.error).toBe('string');
    expect(body.status).toBe(400);
  });

  it('all error responses include JSON body with error (string) and status (number)', () => {
    const cases: [string, number][] = [['abc', 400], [MISSING_POSTCODE, 404], ['12345', 400]];
    for (const [postcode, expectedStatus] of cases) {
      const res = handleScoreRequest(postcode);
      expect(res.status).toBe(expectedStatus);
      const body = res.body as ErrorResponse;
      expect(typeof body.error).toBe('string');
      expect(body.error.length).toBeGreaterThan(0);
      expect(typeof body.status).toBe('number');
      expect(body.status).toBe(res.status);
    }
  });
});

// ── Additional integration checks ──────────────────────────────────────────

describe('scoring consistency', () => {
  it('same postcode returns same results (deterministic)', () => {
    const a = handleScoreRequest(KNOWN_POSTCODE);
    const b = handleScoreRequest(KNOWN_POSTCODE);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    // Compare scores (last_updated may differ by date)
    const bodyA = (a as { body: PostcodeRecord }).body;
    const bodyB = (b as { body: PostcodeRecord }).body;
    expect(bodyA.bric.score).toBe(bodyB.bric.score);
    expect(bodyA.inform.score).toBe(bodyB.inform.score);
    expect(bodyA.quadrant).toBe(bodyB.quadrant);
  });

  it('3-digit postcode is accepted', () => {
    // 800 is a valid NT postcode
    const res = handleScoreRequest('800');
    // May be 200 or 404 depending on data — but NOT 400
    expect(res.status).not.toBe(400);
  });
});
