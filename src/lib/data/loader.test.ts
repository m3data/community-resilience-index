import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RawIndicatorData, CensusRecord, SolarRecord, RefineryRecord } from './loader';
import { extractIndicators, computeAllValues } from './loader';

// ── Test fixtures ───────────────────────────────────────────────────────────

function makeCensus(overrides: Partial<CensusRecord> = {}): CensusRecord {
  return {
    car_dependency: 0.45,
    housing_stress: 0.30,
    industry_counts: {
      'Agriculture, Forestry and Fishing': 100,
      'Mining': 50,
      'Manufacturing': 200,
      'Construction': 150,
      'Retail Trade': 300,
      'Health Care and Social Assistance': 250,
    },
    education_pct: 0.65,
    internet_pct: null,
    volunteering_pct: 0.12,
    commute_mode_counts: {
      'Train': 400,
      'Bus': 200,
      'Ferry': 10,
      'Tram': 50,
      'Car (driver)': 800,
      'Car (passenger)': 100,
      'Bicycle': 40,
      'Walked': 150,
    },
    median_income: 750,
    unemployment_rate: 0.06,
    ...overrides,
  };
}

const FIXTURE_RAW: RawIndicatorData = {
  '2000': {
    census: makeCensus({ education_pct: 0.86, median_income: 941 }),
    solar: { installations: 100, capacity_kw: 500.5 },
    refinery: { nearest_refinery: 'Geelong VIC', distance_km: 700.2, lat: -33.87, lng: 151.21 },
  },
  '2600': {
    census: makeCensus({ education_pct: 0.72, median_income: 820, car_dependency: 0.55 }),
    solar: { installations: 200, capacity_kw: 1200.0 },
    refinery: { nearest_refinery: 'Geelong VIC', distance_km: 530.8, lat: -35.28, lng: 149.12 },
  },
  '4000': {
    census: makeCensus({ education_pct: 0.60, median_income: 680 }),
  },
};

// ── extractIndicators ───────────────────────────────────────────────────────

describe('extractIndicators', () => {
  it('returns empty objects for unknown postcode', () => {
    const { bricIndicators, informIndicators } = extractIndicators('9999', FIXTURE_RAW);
    expect(Object.keys(bricIndicators)).toHaveLength(0);
    expect(Object.keys(informIndicators)).toHaveLength(0);
  });

  it('extracts BRIC indicators for a postcode with full data', () => {
    const { bricIndicators } = extractIndicators('2000', FIXTURE_RAW);

    // Educational attainment from census
    expect(bricIndicators['educational_attainment']).toEqual({
      value: 0.86,
      meta: { authority: 'official', freshness: 'census', coverage: 'national' },
    });

    // Median income
    expect(bricIndicators['median_household_income']?.value).toBe(941);

    // Unemployment
    expect(bricIndicators['unemployment_rate']?.value).toBe(0.06);

    // Housing affordability = 1 - housing_stress
    expect(bricIndicators['housing_affordability']?.value).toBeCloseTo(0.70, 2);

    // Industry diversity (Shannon) — should be a positive number
    expect(bricIndicators['industry_diversity']?.value).toBeGreaterThan(0);

    // Volunteering
    expect(bricIndicators['voluntary_work_participation']?.value).toBe(0.12);

    // Transport mode diversity (Shannon) — should be positive
    expect(bricIndicators['transport_mode_diversity']?.value).toBeGreaterThan(0);

    // Public transport access — ratio of transit modes to total
    expect(bricIndicators['public_transport_access']?.value).toBeGreaterThan(0);
    expect(bricIndicators['public_transport_access']?.value).toBeLessThan(1);
  });

  it('returns null for indicators without data sources', () => {
    const { bricIndicators, informIndicators } = extractIndicators('2000', FIXTURE_RAW);

    // No SEIFA data in fixture
    expect(bricIndicators['seifa_irsd']?.value).toBeNull();

    // No remoteness data in fixture
    expect(informIndicators['remoteness']?.value).toBeNull();

    // Institutional capital has no data
    expect(bricIndicators['distance_to_hospital']?.value).toBeNull();

    // English proficiency not in census ETL
    expect(bricIndicators['english_proficiency']?.value).toBeNull();
  });

  it('attaches correct SignalMeta per data source', () => {
    const { bricIndicators, informIndicators } = extractIndicators('2000', FIXTURE_RAW);

    // Census-sourced
    expect(bricIndicators['educational_attainment']?.meta).toEqual({
      authority: 'official',
      freshness: 'census',
      coverage: 'national',
    });

    // Refinery-derived
    expect(informIndicators['distance_to_refinery']?.meta).toEqual({
      authority: 'derived',
      freshness: 'annual',
      coverage: 'national',
    });

    // Solar
    expect(informIndicators['solar_battery_penetration']?.meta).toEqual({
      authority: 'official',
      freshness: 'annual',
      coverage: 'national',
    });
  });

  it('extracts INFORM indicators correctly', () => {
    const { informIndicators } = extractIndicators('2000', FIXTURE_RAW);

    // Distance to refinery
    expect(informIndicators['distance_to_refinery']?.value).toBe(700.2);

    // Car dependency
    expect(informIndicators['car_dependency_rate']?.value).toBe(0.45);

    // Housing stress (direct, not inverted)
    expect(informIndicators['housing_stress']?.value).toBe(0.30);

    // Solar capacity
    expect(informIndicators['solar_battery_penetration']?.value).toBe(500.5);

    // Agricultural workforce proportion
    const agri = informIndicators['agricultural_workforce_proportion'];
    expect(agri?.value).toBeGreaterThan(0);
    expect(agri?.value).toBeLessThan(1);
  });

  it('computes agricultural workforce proportion correctly', () => {
    const { informIndicators } = extractIndicators('2000', FIXTURE_RAW);
    // Agriculture = 100, total = 100+50+200+150+300+250 = 1050
    expect(informIndicators['agricultural_workforce_proportion']?.value).toBeCloseTo(100 / 1050, 6);
  });

  it('computes public transport ratio correctly', () => {
    const { bricIndicators } = extractIndicators('2000', FIXTURE_RAW);
    // Transit = Train(400) + Bus(200) + Ferry(10) + Tram(50) = 660
    // Total = 400+200+10+50+800+100+40+150 = 1750
    expect(bricIndicators['public_transport_access']?.value).toBeCloseTo(660 / 1750, 6);
  });

  it('handles postcode with only census data', () => {
    const { bricIndicators, informIndicators } = extractIndicators('4000', FIXTURE_RAW);

    // Census fields present
    expect(bricIndicators['educational_attainment']?.value).toBe(0.60);
    expect(bricIndicators['median_household_income']?.value).toBe(680);

    // Solar/refinery absent → null
    expect(informIndicators['distance_to_refinery']?.value).toBeNull();
    expect(informIndicators['solar_battery_penetration']?.value).toBeNull();
  });
});

// ── computeAllValues ────────────────────────────────────────────────────────

describe('computeAllValues', () => {
  it('collects values across all postcodes', () => {
    const allValues = computeAllValues(FIXTURE_RAW);

    // 3 postcodes with census → 3 education values
    expect(allValues['educational_attainment']).toHaveLength(3);
    expect(allValues['educational_attainment']).toContain(0.86);
    expect(allValues['educational_attainment']).toContain(0.72);
    expect(allValues['educational_attainment']).toContain(0.60);
  });

  it('only includes postcodes that have the data source', () => {
    const allValues = computeAllValues(FIXTURE_RAW);

    // Only 2 postcodes have refinery data
    expect(allValues['distance_to_refinery']).toHaveLength(2);

    // Only 2 postcodes have solar data
    expect(allValues['solar_battery_penetration']).toHaveLength(2);
  });

  it('excludes null values', () => {
    const allValues = computeAllValues(FIXTURE_RAW);

    // internet_pct is null for all fixtures → key should not exist
    expect(allValues['internet_connectivity']).toBeUndefined();
  });

  it('computes diversity indices for allValues', () => {
    const allValues = computeAllValues(FIXTURE_RAW);

    expect(allValues['industry_diversity']).toHaveLength(3);
    expect(allValues['transport_mode_diversity']).toHaveLength(3);

    // All Shannon diversity values should be positive
    for (const v of allValues['industry_diversity']) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it('returns empty map for empty input', () => {
    const allValues = computeAllValues({});
    expect(Object.keys(allValues)).toHaveLength(0);
  });
});

// ── loadStaticData (integration, reads real files) ──────────────────────────

describe('loadStaticData', () => {
  // This is an integration test that reads real data files.
  // Only run it if the data files exist (they should in this repo).
  it('loads and merges real data files', async () => {
    const { loadStaticData } = await import('./loader');
    const data = loadStaticData();

    // Should have postcodes
    const postcodes = Object.keys(data);
    expect(postcodes.length).toBeGreaterThan(100);

    // Sydney CBD should have census data
    expect(data['2000']?.census).toBeDefined();
    expect(data['2000']?.census?.median_income).toBe(941);

    // Should have refinery distances
    const withRefinery = postcodes.filter((pc) => data[pc].refinery);
    expect(withRefinery.length).toBeGreaterThan(100);

    // Should have solar data
    const withSolar = postcodes.filter((pc) => data[pc].solar);
    expect(withSolar.length).toBeGreaterThan(100);
  });
});
