/**
 * Data loading layer — SPEC-001 Purity Boundary Map
 *
 * Effectful shell: reads static JSON data files and maps raw fields
 * to the IndicatorInput structure expected by the pure scoring core.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SignalMeta } from '../scoring/confidence';
import type { IndicatorInput } from '../scoring/types';
import { computeShannonDiversity } from '../scoring/diversity';

// ── Raw JSON schemas ────────────────────────────────────────────────────────

export interface CensusRecord {
  car_dependency: number | null;
  housing_stress: number | null;
  industry_counts: Record<string, number>;
  education_pct: number | null;
  internet_pct: number | null;
  volunteering_pct: number | null;
  commute_mode_counts: Record<string, number>;
  median_income: number | null;
  unemployment_rate: number | null;
  // Vulnerability concentration (SPEC-004)
  age_65_plus_pct?: number | null;
  age_80_plus_pct?: number | null;
  need_assistance_pct?: number | null;
  lone_person_pct?: number | null;
}

export interface SolarRecord {
  installations: number;
  capacity_kw: number;
}

export interface RefineryRecord {
  nearest_refinery: string;
  distance_km: number;
  lat: number;
  lng: number;
}

export interface SeifaRecord {
  irsd_score: number;
}

export interface RemotenessRecord {
  remoteness_area: string;
  remoteness_index: number;
}

// ── Unified raw data ────────────────────────────────────────────────────────

export interface PostcodeData {
  census?: CensusRecord;
  solar?: SolarRecord;
  refinery?: RefineryRecord;
  seifa?: SeifaRecord;
  remoteness?: RemotenessRecord;
}

export type RawIndicatorData = Record<string, PostcodeData>;

// ── Signal metadata for each data source ────────────────────────────────────

const CENSUS_META: SignalMeta = {
  authority: 'official',
  freshness: 'census',
  coverage: 'national',
};

const SOLAR_META: SignalMeta = {
  authority: 'official',
  freshness: 'annual',
  coverage: 'national',
};

const REFINERY_META: SignalMeta = {
  authority: 'derived',
  freshness: 'annual',
  coverage: 'national',
};

const SEIFA_META: SignalMeta = {
  authority: 'official',
  freshness: 'census',
  coverage: 'national',
};

const REMOTENESS_META: SignalMeta = {
  authority: 'official',
  freshness: 'census',
  coverage: 'national',
};

// ── Data loading ────────────────────────────────────────────────────────────

const DATA_DIR = join(process.cwd(), 'src', 'data');

function loadJson<T>(filename: string): Record<string, T> {
  try {
    const raw = readFileSync(join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(raw) as Record<string, T>;
  } catch {
    return {};
  }
}

/**
 * Read all JSON data files from app/src/data/ and return a unified
 * RawIndicatorData structure keyed by postcode.
 */
export function loadStaticData(): RawIndicatorData {
  const census = loadJson<CensusRecord>('postcode-census.json');
  const solar = loadJson<SolarRecord>('postcode-solar.json');
  const refinery = loadJson<RefineryRecord>('refinery-distances.json');
  const rawSeifa = loadJson<SeifaRecord | number>('postcode-seifa.json');
  const rawRemoteness = loadJson<RemotenessRecord | number>('postcode-remoteness.json');

  // Normalise flat formats from ETL: {postcode: number} → {postcode: {field: number}}
  const seifa: Record<string, SeifaRecord> = {};
  for (const [pc, val] of Object.entries(rawSeifa)) {
    seifa[pc] = typeof val === 'number' ? { irsd_score: val } : val;
  }
  const remoteness: Record<string, RemotenessRecord> = {};
  for (const [pc, val] of Object.entries(rawRemoteness)) {
    remoteness[pc] = typeof val === 'number'
      ? { remoteness_area: '', remoteness_index: val }
      : val;
  }

  // Collect all postcodes across all data sources
  const postcodes = new Set<string>([
    ...Object.keys(census),
    ...Object.keys(solar),
    ...Object.keys(refinery),
    ...Object.keys(seifa),
    ...Object.keys(remoteness),
  ]);

  const result: RawIndicatorData = {};
  for (const pc of postcodes) {
    result[pc] = {
      ...(census[pc] && { census: census[pc] }),
      ...(solar[pc] && { solar: solar[pc] }),
      ...(refinery[pc] && { refinery: refinery[pc] }),
      ...(seifa[pc] && { seifa: seifa[pc] }),
      ...(remoteness[pc] && { remoteness: remoteness[pc] }),
    };
  }
  return result;
}

// ── Indicator extraction ────────────────────────────────────────────────────

/** All values across postcodes for a given indicator, used for normalisation. */
export type AllValuesMap = Record<string, number[]>;

function ind(value: number | null, meta: SignalMeta): IndicatorInput {
  return { value, meta };
}

/**
 * Compute allValues arrays across all postcodes for every indicator
 * that has data. Used for min-max / percentile-rank normalisation.
 */
export function computeAllValues(rawData: RawIndicatorData): AllValuesMap {
  const acc: Record<string, number[]> = {};

  function push(key: string, val: number | null | undefined) {
    if (val == null) return;
    if (!acc[key]) acc[key] = [];
    acc[key].push(val);
  }

  for (const pc of Object.keys(rawData)) {
    const d = rawData[pc];

    // Census-derived
    if (d.census) {
      push('educational_attainment', d.census.education_pct);
      push('median_household_income', d.census.median_income);
      push('unemployment_rate', d.census.unemployment_rate);
      push('housing_affordability', d.census.housing_stress != null ? 1 - d.census.housing_stress : null);
      push('voluntary_work_participation', d.census.volunteering_pct);
      push('volunteer_density', d.census.volunteering_pct);
      push('internet_connectivity', d.census.internet_pct);
      push('car_dependency_rate', d.census.car_dependency);
      push('housing_stress', d.census.housing_stress);

      // Diversity indices from counts
      if (d.census.industry_counts && Object.keys(d.census.industry_counts).length > 0) {
        push('industry_diversity', computeShannonDiversity(d.census.industry_counts));
      }
      if (d.census.commute_mode_counts && Object.keys(d.census.commute_mode_counts).length > 0) {
        push('transport_mode_diversity', computeShannonDiversity(d.census.commute_mode_counts));
        // Public transport = sum of transit modes / total commuters
        const transit = (d.census.commute_mode_counts['Train'] ?? 0)
          + (d.census.commute_mode_counts['Bus'] ?? 0)
          + (d.census.commute_mode_counts['Ferry'] ?? 0)
          + (d.census.commute_mode_counts['Tram'] ?? 0);
        const totalCommute = Object.values(d.census.commute_mode_counts).reduce((s, v) => s + v, 0);
        if (totalCommute > 0) {
          push('public_transport_access', transit / totalCommute);
          push('public_transport_accessibility', transit / totalCommute);
        }
      }

      // Vulnerability concentration (SPEC-004)
      push('age_65_plus', d.census.age_65_plus_pct);
      push('age_80_plus', d.census.age_80_plus_pct);
      push('need_assistance', d.census.need_assistance_pct);
      push('lone_person', d.census.lone_person_pct);

      // Agricultural workforce from industry counts
      if (d.census.industry_counts) {
        const agri = d.census.industry_counts['Agriculture, Forestry and Fishing'] ?? 0;
        const totalEmployed = Object.values(d.census.industry_counts).reduce((s, v) => s + v, 0);
        if (totalEmployed > 0) {
          push('agricultural_workforce_proportion', agri / totalEmployed);
        }
      }
    }

    // Solar
    if (d.solar) {
      push('solar_battery_penetration', d.solar.capacity_kw);
    }

    // Refinery distances
    if (d.refinery) {
      push('distance_to_refinery', d.refinery.distance_km);
    }

    // SEIFA
    if (d.seifa) {
      push('seifa_irsd', d.seifa.irsd_score);
      push('seifa_irsd_inverted', d.seifa.irsd_score);
    }

    // Remoteness
    if (d.remoteness) {
      push('remoteness', d.remoteness.remoteness_index);
    }
  }

  return acc;
}

/**
 * Extract indicator values for a single postcode from the unified raw data.
 *
 * Returns indicators grouped by layer (BRIC capitals and INFORM pillars),
 * each keyed by indicator name with an IndicatorInput array (single element
 * per indicator for static data).
 */
export function extractIndicators(
  postcode: string,
  rawData: RawIndicatorData,
): {
  bricIndicators: Record<string, IndicatorInput>;
  informIndicators: Record<string, IndicatorInput>;
} {
  const d = rawData[postcode];
  if (!d) {
    return { bricIndicators: {}, informIndicators: {} };
  }

  const census = d.census;
  const solar = d.solar;
  const refinery = d.refinery;
  const seifa = d.seifa;
  const remoteness = d.remoteness;

  // ── BRIC indicators ───────────────────────────────────────────────────

  const bricIndicators: Record<string, IndicatorInput> = {};

  // Social Capital
  bricIndicators['seifa_irsd'] = ind(seifa?.irsd_score ?? null, SEIFA_META);
  bricIndicators['educational_attainment'] = ind(census?.education_pct ?? null, CENSUS_META);
  bricIndicators['english_proficiency'] = ind(null, CENSUS_META); // not in current data
  bricIndicators['health_service_access'] = ind(null, CENSUS_META); // not in current data

  // Economic Capital
  bricIndicators['median_household_income'] = ind(census?.median_income ?? null, CENSUS_META);
  bricIndicators['unemployment_rate'] = ind(census?.unemployment_rate ?? null, CENSUS_META);
  if (census?.industry_counts && Object.keys(census.industry_counts).length > 0) {
    bricIndicators['industry_diversity'] = ind(
      computeShannonDiversity(census.industry_counts),
      CENSUS_META,
    );
  } else {
    bricIndicators['industry_diversity'] = ind(null, CENSUS_META);
  }
  // Housing affordability = inverse of housing stress (higher = more affordable)
  bricIndicators['housing_affordability'] = ind(
    census?.housing_stress != null ? 1 - census.housing_stress : null,
    CENSUS_META,
  );
  bricIndicators['gini_coefficient'] = ind(null, CENSUS_META); // not in current data

  // Community Capital
  bricIndicators['voluntary_work_participation'] = ind(census?.volunteering_pct ?? null, CENSUS_META);
  bricIndicators['nonprofit_org_density'] = ind(null, CENSUS_META); // not in current data
  bricIndicators['voter_turnout'] = ind(null, CENSUS_META); // not in current data
  bricIndicators['organisational_type_diversity'] = ind(null, CENSUS_META); // not in current data

  // Institutional Capital (no data sources yet)
  bricIndicators['distance_to_hospital'] = ind(null, CENSUS_META);
  bricIndicators['distance_to_fire_police'] = ind(null, CENSUS_META);
  bricIndicators['govt_service_points_per_capita'] = ind(null, CENSUS_META);
  bricIndicators['emergency_management_plan'] = ind(null, CENSUS_META);

  // Housing & Infrastructure Capital
  bricIndicators['internet_connectivity'] = ind(census?.internet_pct ?? null, CENSUS_META);
  bricIndicators['dwelling_quality'] = ind(null, CENSUS_META); // not in current data
  if (census?.commute_mode_counts && Object.keys(census.commute_mode_counts).length > 0) {
    bricIndicators['transport_mode_diversity'] = ind(
      computeShannonDiversity(census.commute_mode_counts),
      CENSUS_META,
    );
    const transit = (census.commute_mode_counts['Train'] ?? 0)
      + (census.commute_mode_counts['Bus'] ?? 0)
      + (census.commute_mode_counts['Ferry'] ?? 0)
      + (census.commute_mode_counts['Tram'] ?? 0);
    const totalCommute = Object.values(census.commute_mode_counts).reduce((s, v) => s + v, 0);
    bricIndicators['public_transport_access'] = ind(
      totalCommute > 0 ? transit / totalCommute : null,
      CENSUS_META,
    );
  } else {
    bricIndicators['transport_mode_diversity'] = ind(null, CENSUS_META);
    bricIndicators['public_transport_access'] = ind(null, CENSUS_META);
  }
  bricIndicators['vacancy_rate'] = ind(null, CENSUS_META); // not in current data

  // Environmental Capital (no data sources yet)
  bricIndicators['agricultural_land'] = ind(null, CENSUS_META);
  bricIndicators['green_space_per_capita'] = ind(null, CENSUS_META);
  bricIndicators['land_use_diversity'] = ind(null, CENSUS_META);
  bricIndicators['water_security'] = ind(null, CENSUS_META);

  // ── INFORM indicators ─────────────────────────────────────────────────

  const informIndicators: Record<string, IndicatorInput> = {};

  // Exposure
  informIndicators['remoteness'] = ind(remoteness?.remoteness_index ?? null, REMOTENESS_META);
  informIndicators['distance_to_refinery'] = ind(refinery?.distance_km ?? null, REFINERY_META);
  informIndicators['local_fuel_price_relative'] = ind(null, REFINERY_META); // not in current data
  informIndicators['fuel_station_density'] = ind(null, REFINERY_META); // not in current data
  informIndicators['local_fuel_availability'] = ind(null, REFINERY_META); // not in current data

  // Sensitivity
  informIndicators['seifa_irsd_inverted'] = ind(seifa?.irsd_score ?? null, SEIFA_META);
  informIndicators['car_dependency_rate'] = ind(census?.car_dependency ?? null, CENSUS_META);
  informIndicators['housing_stress'] = ind(census?.housing_stress ?? null, CENSUS_META);
  if (census?.industry_counts) {
    const agri = census.industry_counts['Agriculture, Forestry and Fishing'] ?? 0;
    const totalEmployed = Object.values(census.industry_counts).reduce((s, v) => s + v, 0);
    informIndicators['agricultural_workforce_proportion'] = ind(
      totalEmployed > 0 ? agri / totalEmployed : null,
      CENSUS_META,
    );
  } else {
    informIndicators['agricultural_workforce_proportion'] = ind(null, CENSUS_META);
  }
  informIndicators['distance_to_supermarket'] = ind(null, CENSUS_META); // not in current data

  // Lack of Coping Capacity
  if (census?.commute_mode_counts && Object.keys(census.commute_mode_counts).length > 0) {
    const transit = (census.commute_mode_counts['Train'] ?? 0)
      + (census.commute_mode_counts['Bus'] ?? 0)
      + (census.commute_mode_counts['Ferry'] ?? 0)
      + (census.commute_mode_counts['Tram'] ?? 0);
    const totalCommute = Object.values(census.commute_mode_counts).reduce((s, v) => s + v, 0);
    informIndicators['public_transport_accessibility'] = ind(
      totalCommute > 0 ? transit / totalCommute : null,
      CENSUS_META,
    );
  } else {
    informIndicators['public_transport_accessibility'] = ind(null, CENSUS_META);
  }
  informIndicators['solar_battery_penetration'] = ind(solar?.capacity_kw ?? null, SOLAR_META);
  informIndicators['volunteer_density'] = ind(census?.volunteering_pct ?? null, CENSUS_META);
  informIndicators['internet_connectivity'] = ind(census?.internet_pct ?? null, CENSUS_META);
  informIndicators['community_infrastructure_density'] = ind(null, CENSUS_META); // not in current data
  informIndicators['local_food_production_potential'] = ind(null, CENSUS_META); // not in current data

  return { bricIndicators, informIndicators };
}
