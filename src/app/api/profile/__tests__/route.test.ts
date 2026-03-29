/**
 * Tests for GET /api/profile — SPEC-003 Exposure Profile endpoint.
 *
 * Mocks the score route's cached data and scoring functions so we test
 * the profile API contract without touching the filesystem or real data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_CENSUS_2000 = {
  car_dependency: 0.45,
  housing_stress: 0.25,
  industry_counts: {
    'Professional, Scientific and Technical Services': 5000,
    'Financial and Insurance Services': 4000,
    'Health Care and Social Assistance': 3000,
    'Accommodation and Food Services': 2500,
    'Retail Trade': 2000,
    'Education and Training': 1500,
    'Agriculture, Forestry and Fishing': 50,
    'Construction': 1000,
  },
  education_pct: 0.72,
  internet_pct: 0.92,
  volunteering_pct: 0.18,
  commute_mode_counts: {
    Car: 8000,
    Train: 4000,
    Bus: 2000,
    Ferry: 200,
    Tram: 0,
    Bicycle: 500,
    Walk: 1500,
  },
  median_income: 2100,
  unemployment_rate: 0.04,
};

const MOCK_RAW_DATA: Record<string, Record<string, unknown>> = {
  '2000': {
    census: MOCK_CENSUS_2000,
    solar: { installations: 500, capacity_kw: 3200 },
    refinery: { nearest_refinery: 'Lytton', distance_km: 730, lat: -33.87, lng: 151.21 },
    seifa: { irsd_score: 1080 },
    remoteness: { remoteness_area: 'Major Cities of Australia', remoteness_index: 1 },
  },
};

// Build allValues from mock data so percentile calculations work
function buildMockAllValues(): Record<string, number[]> {
  // Simulate a national distribution with the single postcode's values
  // plus some spread so percentiles are meaningful
  return {
    car_dependency_rate: [0.2, 0.3, 0.45, 0.6, 0.7, 0.8, 0.9],
    distance_to_refinery: [50, 100, 200, 500, 730, 1000, 1500],
    industry_diversity: [1.0, 1.5, 2.0, 2.5, 3.0, 3.2, 3.5],
    agricultural_workforce_proportion: [0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3],
    remoteness: [1, 1, 2, 3, 4, 5, 7],
    housing_stress: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4],
    solar_battery_penetration: [100, 500, 1000, 2000, 3200, 5000, 10000],
    seifa_irsd: [800, 900, 950, 1000, 1050, 1080, 1100],
    median_household_income: [800, 1000, 1200, 1500, 1800, 2100, 2500],
    transport_mode_diversity: [0.5, 1.0, 1.5, 2.0, 2.3, 2.5, 3.0],
    internet_connectivity: [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.92],
  };
}

const MOCK_LOCALITIES: Record<string, string> = {
  '2000': 'Sydney',
  '2600': 'Canberra',
};

// Minimal scoring record stub
const MOCK_SCORE_RECORD = {
  postcode: '2000',
  locality: 'Sydney',
  state: 'NSW',
  bric: { score: 55, label: 'Moderate', confidence: 0.6, capitals: {} },
  inform: { score: 0.4, label: 'Low-Medium', pillars: {} },
  quadrant: { label: 'Moderate capacity, Low-Medium risk' },
  confidence: { overall: 0.6, label: 'Moderate' },
  dataCompleteness: { available: 10, total: 20 },
};

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../score/route', () => ({
  getCachedData: () => ({
    raw: MOCK_RAW_DATA,
    allValues: buildMockAllValues(),
    methods: {},
    localities: MOCK_LOCALITIES,
  }),
  isValidPostcode: (pc: string) => /^\d{3,4}$/.test(pc),
  scorePostcode: () => MOCK_SCORE_RECORD,
}));

// ── Import after mock ──────────────────────────────────────────────────────

import { GET } from '../route';
import type { ExposureProfile, ProfileError } from '../route';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(postcode?: string): Request {
  const url = new URL('http://localhost:3000/api/profile');
  if (postcode) url.searchParams.set('postcode', postcode);
  return new Request(url);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/profile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Validation ─────────────────────────────────────────────────────────

  it('returns 400 when no postcode provided', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);

    const body = (await res.json()) as ProfileError;
    expect(body.error).toMatch(/missing/i);
    expect(body.status).toBe(400);
  });

  it('returns 400 for invalid postcode format', async () => {
    const res = await GET(makeRequest('abc'));
    expect(res.status).toBe(400);

    const body = (await res.json()) as ProfileError;
    expect(body.error).toMatch(/invalid/i);
  });

  it('returns 400 for postcode with too many digits', async () => {
    const res = await GET(makeRequest('20001'));
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown postcode', async () => {
    const res = await GET(makeRequest('9999'));
    expect(res.status).toBe(404);

    const body = (await res.json()) as ProfileError;
    expect(body.error).toMatch(/not found/i);
  });

  // ── Successful profile ─────────────────────────────────────────────────

  describe('valid postcode (2000 — Sydney)', () => {
    let profile: ExposureProfile;

    beforeEach(async () => {
      const res = await GET(makeRequest('2000'));
      expect(res.status).toBe(200);
      profile = (await res.json()) as ExposureProfile;
    });

    it('returns required top-level fields', () => {
      expect(profile.postcode).toBe('2000');
      expect(profile.state).toBe('NSW');
      expect(profile.locality).toBe('Sydney');
      expect(profile).toHaveProperty('structural');
      expect(profile).toHaveProperty('exposures');
      expect(profile).toHaveProperty('actions');
      expect(profile).toHaveProperty('signals');
      expect(profile).toHaveProperty('diversity');
      expect(profile).toHaveProperty('cascade');
      expect(profile).toHaveProperty('dataCompleteness');
    });

    // ── Structural characteristics ─────────────────────────────────────

    it('returns structural characteristics as an array', () => {
      expect(Array.isArray(profile.structural)).toBe(true);
      expect(profile.structural.length).toBeGreaterThan(0);
    });

    it('structural characteristics have expected format', () => {
      for (const char of profile.structural) {
        expect(char).toHaveProperty('key');
        expect(char).toHaveProperty('label');
        expect(char).toHaveProperty('value');
        expect(char).toHaveProperty('formatted');
        expect(char).toHaveProperty('source');
        expect(char).toHaveProperty('vintage');
        expect(char).toHaveProperty('percentile');
        expect(typeof char.label).toBe('string');
        expect(typeof char.formatted).toBe('string');
        expect(typeof char.source).toBe('string');
        expect(typeof char.vintage).toBe('string');
      }
    });

    it('includes expected structural keys', () => {
      const keys = profile.structural.map((c) => c.key);
      expect(keys).toContain('car_dependency');
      expect(keys).toContain('refinery_distance');
      expect(keys).toContain('industry_diversity');
      expect(keys).toContain('remoteness');
      expect(keys).toContain('housing_stress');
      expect(keys).toContain('solar_penetration');
      expect(keys).toContain('seifa_irsd');
      expect(keys).toContain('median_income');
      expect(keys).toContain('internet');
    });

    it('percentiles are numbers between 0 and 1 when present', () => {
      for (const char of profile.structural) {
        if (char.percentile !== null) {
          expect(char.percentile).toBeGreaterThanOrEqual(0);
          expect(char.percentile).toBeLessThanOrEqual(1);
        }
      }
    });

    it('car dependency formatted string includes percentage', () => {
      const carDep = profile.structural.find((c) => c.key === 'car_dependency');
      expect(carDep).toBeDefined();
      expect(carDep!.formatted).toMatch(/45% of commuters drive/);
      expect(carDep!.value).toBe(0.45);
    });

    // ── Data completeness ──────────────────────────────────────────────

    it('dataCompleteness reflects structural data availability', () => {
      expect(profile.dataCompleteness.total).toBe(profile.structural.length);
      expect(profile.dataCompleteness.available).toBeGreaterThan(0);
      expect(profile.dataCompleteness.available).toBeLessThanOrEqual(
        profile.dataCompleteness.total,
      );
    });

    // ── Exposures ──────────────────────────────────────────────────────

    it('returns exposures across the six domains', () => {
      const domains = profile.exposures.map((e) => e.domain);
      expect(domains).toContain('fuel');
      expect(domains).toContain('food');
      expect(domains).toContain('electricity');
      expect(domains).toContain('economic');
      expect(domains).toContain('housing');
      expect(domains).toContain('emergency');
    });

    it('exposures are sorted by weight (highest first)', () => {
      for (let i = 1; i < profile.exposures.length; i++) {
        expect(profile.exposures[i - 1].weight).toBeGreaterThanOrEqual(
          profile.exposures[i].weight,
        );
      }
    });

    it('exposure weights are between 0 and 1', () => {
      for (const exposure of profile.exposures) {
        expect(exposure.weight).toBeGreaterThanOrEqual(0);
        expect(exposure.weight).toBeLessThanOrEqual(1);
      }
    });

    it('exposure entries have required fields', () => {
      for (const exposure of profile.exposures) {
        expect(typeof exposure.label).toBe('string');
        expect(typeof exposure.reason).toBe('string');
        expect(Array.isArray(exposure.signalKeys)).toBe(true);
        expect(exposure.signalKeys.length).toBeGreaterThan(0);
      }
    });

    // ── Signals ────────────────────────────────────────────────────────

    it('returns contextualised signals', () => {
      expect(Array.isArray(profile.signals)).toBe(true);
      expect(profile.signals.length).toBeGreaterThan(0);
    });

    it('signals have required fields', () => {
      for (const signal of profile.signals) {
        expect(typeof signal.key).toBe('string');
        expect(typeof signal.domain).toBe('string');
        expect(typeof signal.relevance).toBe('number');
        expect(typeof signal.context).toBe('string');
        expect(signal.context.length).toBeGreaterThan(0);
      }
    });

    it('signals are sorted by relevance (highest first)', () => {
      for (let i = 1; i < profile.signals.length; i++) {
        expect(profile.signals[i - 1].relevance).toBeGreaterThanOrEqual(
          profile.signals[i].relevance,
        );
      }
    });

    // ── Cascade ────────────────────────────────────────────────────────

    it('returns cascade timeline estimates', () => {
      expect(Array.isArray(profile.cascade)).toBe(true);
      expect(profile.cascade.length).toBeGreaterThan(0);

      for (const c of profile.cascade) {
        expect(typeof c.domain).toBe('string');
        expect(typeof c.label).toBe('string');
        expect(typeof c.estimate).toBe('string');
        expect(typeof c.description).toBe('string');
      }
    });

    it('cascade includes fuel and food domains', () => {
      const domains = profile.cascade.map((c) => c.domain);
      expect(domains).toContain('fuel');
      expect(domains).toContain('food');
    });

    // ── Diversity ──────────────────────────────────────────────────────

    it('returns diversity spectrum entries', () => {
      expect(Array.isArray(profile.diversity)).toBe(true);
      // Sydney has both industry and transport diversity data
      expect(profile.diversity.length).toBeGreaterThan(0);
    });

    it('diversity entries have spectrum positions', () => {
      for (const d of profile.diversity) {
        expect(typeof d.label).toBe('string');
        expect(typeof d.value).toBe('number');
        expect(typeof d.interpretation).toBe('string');
        expect(['entrained', 'mixed', 'coherent']).toContain(d.spectrumPosition);
      }
    });

    // ── Actions ────────────────────────────────────────────────────────

    it('returns profile-driven actions', () => {
      expect(Array.isArray(profile.actions)).toBe(true);
      expect(profile.actions.length).toBeGreaterThan(0);
    });

    it('actions have required fields', () => {
      for (const action of profile.actions) {
        expect(typeof action.title).toBe('string');
        expect(typeof action.description).toBe('string');
        expect(typeof action.driver).toBe('string');
        expect(typeof action.score).toBe('number');
        expect(typeof action.guideLink).toBe('string');
        expect(['household', 'community', 'advocacy']).toContain(action.category);
        expect(['now', 'this_month', 'ongoing']).toContain(action.urgency);
        expect([
          'fuel',
          'food',
          'electricity',
          'economic',
          'housing',
          'emergency',
        ]).toContain(action.domain);
      }
    });

    it('actions are sorted by score (highest first)', () => {
      for (let i = 1; i < profile.actions.length; i++) {
        expect(profile.actions[i - 1].score).toBeGreaterThanOrEqual(
          profile.actions[i].score,
        );
      }
    });

    it('actions are generated based on exposure profile', () => {
      // Sydney (postcode 2000) has moderate car dependency (0.45),
      // so fuel buffer action (>0.6 threshold) should NOT be present,
      // but carpool action (>0.5 threshold) should NOT be present either.
      // The universal actions (off-peak electricity, emergency kit) should be present.
      const titles = profile.actions.map((a) => a.title);
      expect(titles).toContain('Shift high-draw activities off peak');
      expect(titles).toContain('Maintain a household emergency kit');
      // Fuel buffer requires >0.6 car dependency, Sydney has 0.45
      expect(titles).not.toContain('Build a fuel buffer');
    });

    // ── Scoring (preserved, secondary) ─────────────────────────────────

    it('includes the full scoring record', () => {
      expect(profile.scoring).toBeDefined();
      expect(profile.scoring.postcode).toBe('2000');
    });
  });

  // ── State derivation ───────────────────────────────────────────────────

  it('derives correct state from postcode ranges', async () => {
    // Postcode 2000 is NSW
    const res = await GET(makeRequest('2000'));
    const profile = (await res.json()) as ExposureProfile;
    expect(profile.state).toBe('NSW');
  });
});
