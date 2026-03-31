/**
 * GET /api/score?postcode={3-4 digits}
 *
 * SPEC-001 CON-001 — Community Resilience Index scoring endpoint.
 *
 * Orchestration: validate postcode → load static data (module-level cache) →
 * extract indicators → normalise → score (BRIC capitals, INFORM pillars,
 * composites, quadrant, actions) → assemble PostcodeRecord (Section 6.1) →
 * return JSON.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadStaticData,
  computeAllValues,
  extractIndicators,
  type RawIndicatorData,
  type AllValuesMap,
} from '../../../lib/data/loader';
import {
  computeCapitalScore,
  computeBricScore,
  computePillarScore,
  computeInformScore,
  classifyQuadrant,
  selectActions,
  computeSignalConfidence,
  normalise,
  normaliseInverted,
  computeSkewness,
  getScoreLabel,
  socialCapital,
  economicCapital,
  communityCapital,
  institutionalCapital,
  housingInfraCapital,
  environmentalCapital,
  exposurePillar,
  sensitivityPillar,
  lackOfCopingCapacityPillar,
  quadrantThresholds,
  type SignalMeta,
  type CapitalResult,
  type PillarResult,
} from '../../../lib/scoring/index';
import type { NormalisationMethod } from '../../../lib/scoring/normalise';
import type { IndicatorInput } from '../../../lib/scoring/types';
import type { CapitalWeights, PillarWeights } from '../../../lib/scoring/weights';
import type { Action, QuadrantClassification } from '../../../lib/scoring/quadrant';

// ── Response types (SPEC-001 Section 6.1) ───────────────────────────────────

export interface ResponseSignalMeta {
  source: string;
  authority: string;
  freshness: string;
  coverage: string;
  last_updated: string;
  confidence: number;
}

export interface IndicatorValue {
  raw: number | null;
  normalised: number;
  weight: number;
  direction: 'higher_better' | 'lower_better';
  normalisation_method: NormalisationMethod;
  signal: ResponseSignalMeta;
}

export interface CapitalScore {
  score: number;
  confidence: number;
  available: boolean;
  indicators: Record<string, IndicatorValue>;
}

export interface PillarScore {
  score: number;
  confidence: number;
  indicators: Record<string, IndicatorValue>;
}

export interface PostcodeRecord {
  postcode: string;
  locality: string;
  state: string;
  bric: {
    score: number;
    label: string;
    confidence: number;
    capitals: {
      social: CapitalScore;
      economic: CapitalScore;
      community: CapitalScore;
      institutional: CapitalScore;
      housing_infrastructure: CapitalScore;
      environmental: CapitalScore;
    };
  };
  inform: {
    score: number;
    label: string;
    confidence: number;
    pillars: {
      exposure: PillarScore;
      sensitivity: PillarScore;
      lack_of_coping: PillarScore;
    };
  };
  quadrant: QuadrantClassification;
  quadrant_label: string;
  actions: Action[];
  data_confidence: number;
  signals: ResponseSignalMeta[];
  last_updated: string;
}

export interface ErrorResponse {
  error: string;
  status: number;
}

// ── Indicator metadata: direction and source ────────────────────────────────

type Direction = 'higher_better' | 'lower_better';

interface IndicatorMeta {
  direction: Direction;
  source: string;
}

// BRIC: higher score = more resilient = better for the community
const BRIC_INDICATOR_META: Record<string, IndicatorMeta> = {
  // Social
  seifa_irsd:                    { direction: 'higher_better', source: 'ABS SEIFA 2021' },
  educational_attainment:        { direction: 'higher_better', source: 'ABS Census 2021' },
  english_proficiency:           { direction: 'higher_better', source: 'ABS Census 2021' },
  health_service_access:         { direction: 'higher_better', source: 'ABS Census 2021' },
  // Economic
  median_household_income:       { direction: 'higher_better', source: 'ABS Census 2021' },
  unemployment_rate:             { direction: 'lower_better',  source: 'ABS Census 2021' },
  industry_diversity:            { direction: 'higher_better', source: 'ABS Census 2021' },
  housing_affordability:         { direction: 'higher_better', source: 'ABS Census 2021' },
  gini_coefficient:              { direction: 'lower_better',  source: 'ABS Census 2021' },
  // Community
  voluntary_work_participation:  { direction: 'higher_better', source: 'ABS Census 2021' },
  nonprofit_org_density:         { direction: 'higher_better', source: 'ABS Census 2021' },
  voter_turnout:                 { direction: 'higher_better', source: 'ABS Census 2021' },
  organisational_type_diversity: { direction: 'higher_better', source: 'ABS Census 2021' },
  // Institutional
  distance_to_hospital:          { direction: 'lower_better',  source: 'ABS Census 2021' },
  distance_to_fire_police:       { direction: 'lower_better',  source: 'ABS Census 2021' },
  govt_service_points_per_capita:{ direction: 'higher_better', source: 'ABS Census 2021' },
  emergency_management_plan:     { direction: 'higher_better', source: 'ABS Census 2021' },
  // Housing & Infrastructure
  internet_connectivity:         { direction: 'higher_better', source: 'ABS Census 2021' },
  dwelling_quality:              { direction: 'higher_better', source: 'ABS Census 2021' },
  transport_mode_diversity:      { direction: 'higher_better', source: 'ABS Census 2021' },
  public_transport_access:       { direction: 'higher_better', source: 'ABS Census 2021' },
  vacancy_rate:                  { direction: 'lower_better',  source: 'ABS Census 2021' },
  // Environmental
  agricultural_land:             { direction: 'higher_better', source: 'ABS Census 2021' },
  green_space_per_capita:        { direction: 'higher_better', source: 'ABS Census 2021' },
  land_use_diversity:            { direction: 'higher_better', source: 'ABS Census 2021' },
  water_security:                { direction: 'higher_better', source: 'ABS Census 2021' },
};

// INFORM: higher pillar score = higher crisis exposure = worse
// Direction here describes whether higher raw value is better for the community
const INFORM_INDICATOR_META: Record<string, IndicatorMeta & { invertForScoring: boolean }> = {
  // Exposure (higher score = more exposed)
  remoteness:                      { direction: 'lower_better',  source: 'ABS Remoteness 2021', invertForScoring: false },
  distance_to_refinery:            { direction: 'lower_better',  source: 'Derived — refinery distances', invertForScoring: false },
  local_fuel_price_relative:       { direction: 'lower_better',  source: 'Derived', invertForScoring: false },
  fuel_station_density:            { direction: 'higher_better', source: 'Derived', invertForScoring: true },
  local_fuel_availability:         { direction: 'higher_better', source: 'Derived', invertForScoring: true },
  // Sensitivity (higher score = more sensitive)
  seifa_irsd_inverted:             { direction: 'higher_better', source: 'ABS SEIFA 2021', invertForScoring: true },
  car_dependency_rate:             { direction: 'lower_better',  source: 'ABS Census 2021', invertForScoring: false },
  housing_stress:                  { direction: 'lower_better',  source: 'ABS Census 2021', invertForScoring: false },
  agricultural_workforce_proportion: { direction: 'lower_better', source: 'ABS Census 2021', invertForScoring: false },
  distance_to_supermarket:         { direction: 'lower_better',  source: 'Derived', invertForScoring: false },
  // Lack of Coping (higher score = less coping capacity)
  public_transport_accessibility:  { direction: 'higher_better', source: 'ABS Census 2021', invertForScoring: true },
  solar_battery_penetration:       { direction: 'higher_better', source: 'CER Solar Installations', invertForScoring: true },
  volunteer_density:               { direction: 'higher_better', source: 'ABS Census 2021', invertForScoring: true },
  internet_connectivity:           { direction: 'higher_better', source: 'ABS Census 2021', invertForScoring: true },
  community_infrastructure_density:{ direction: 'higher_better', source: 'ABS Census 2021', invertForScoring: true },
  local_food_production_potential: { direction: 'higher_better', source: 'Derived', invertForScoring: true },
};

// ── State lookup from postcode ──────────────────────────────────────────────

function postcodeToState(postcode: string): string {
  const num = parseInt(postcode, 10);
  if (num >= 2600 && num <= 2618) return 'ACT';
  if (num >= 2900 && num <= 2920) return 'ACT';
  if (num >= 800 && num <= 899) return 'NT';
  if (num >= 900 && num <= 999) return 'NT';
  if (num >= 2000 && num <= 2999) return 'NSW';
  if (num >= 1000 && num <= 1999) return 'NSW';
  if (num >= 3000 && num <= 3999) return 'VIC';
  if (num >= 8000 && num <= 8999) return 'VIC';
  if (num >= 4000 && num <= 4999) return 'QLD';
  if (num >= 9000 && num <= 9999) return 'QLD';
  if (num >= 5000 && num <= 5999) return 'SA';
  if (num >= 6000 && num <= 6999) return 'WA';
  if (num >= 7000 && num <= 7999) return 'TAS';
  return 'Unknown';
}

// ── Module-level cache ──────────────────────────────────────────────────────

interface CachedData {
  raw: RawIndicatorData;
  allValues: AllValuesMap;
  methods: Record<string, NormalisationMethod>;
  localities: Record<string, string>;
}

let cached: CachedData | null = null;

function loadLocalities(): Record<string, string> {
  try {
    const raw = readFileSync(join(process.cwd(), 'src', 'data', 'postcode-localities.json'), 'utf-8');
    const data = JSON.parse(raw) as Record<string, string | string[]>;
    // Normalise: new format is string[], old format was string
    const result: Record<string, string> = {};
    for (const [pc, val] of Object.entries(data)) {
      result[pc] = Array.isArray(val) ? val[0] ?? '' : val;
    }
    return result;
  } catch {
    return {};
  }
}

export function getCachedData(): CachedData {
  if (!cached) {
    const raw = loadStaticData();
    const allValues = computeAllValues(raw);

    // Choose normalisation method per indicator based on skewness
    const methods: Record<string, NormalisationMethod> = {};
    for (const [key, values] of Object.entries(allValues)) {
      const skew = computeSkewness(values);
      methods[key] = Math.abs(skew) > 2 ? 'percentile-rank' : 'min-max';
    }

    const localities = loadLocalities();
    cached = { raw, allValues, methods, localities };
  }
  return cached;
}

/** Clear cache — for testing only. */
export function clearCache(): void {
  cached = null;
}

// ── Validation ──────────────────────────────────────────────────────────────

const POSTCODE_RE = /^\d{3,4}$/;

export function isValidPostcode(postcode: string): boolean {
  return POSTCODE_RE.test(postcode);
}

// ── Normalisation helpers ───────────────────────────────────────────────────

function normaliseForBric(
  raw: number | null,
  indicatorName: string,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
): number {
  if (raw === null) return 0;
  const vals = allValues[indicatorName];
  if (!vals || vals.length === 0) return 0;
  const method = methods[indicatorName] ?? 'min-max';
  const meta = BRIC_INDICATOR_META[indicatorName];
  if (meta?.direction === 'lower_better') {
    return normaliseInverted(raw, vals, method);
  }
  return normalise(raw, vals, method);
}

function normaliseForInform(
  raw: number | null,
  indicatorName: string,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
): number {
  if (raw === null) return 0;
  const vals = allValues[indicatorName];
  if (!vals || vals.length === 0) return 0;
  const method = methods[indicatorName] ?? 'min-max';
  const meta = INFORM_INDICATOR_META[indicatorName];
  if (meta?.invertForScoring) {
    return normaliseInverted(raw, vals, method) * 10;
  }
  return normalise(raw, vals, method) * 10;
}

// ── Signal metadata for response ────────────────────────────────────────────

function buildResponseSignal(meta: SignalMeta | undefined, source: string): ResponseSignalMeta {
  const m = meta ?? { authority: 'estimated' as const, freshness: 'census' as const, coverage: 'partial' as const };
  return {
    source,
    authority: m.authority,
    freshness: m.freshness,
    coverage: m.coverage,
    last_updated: '2021-06-01',
    confidence: computeSignalConfidence(m),
  };
}

// ── Capital scoring with full breakdown ─────────────────────────────────────

function scoreCapital(
  capitalConfig: CapitalWeights,
  rawIndicators: Record<string, IndicatorInput>,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
): { result: CapitalResult; indicators: Record<string, IndicatorValue> } {
  const names = capitalConfig.indicators.map((w) => w.indicator);
  const weights = capitalConfig.indicators.map((w) => w.weight);

  // Build normalised inputs for scoring
  const normalisedInputs: IndicatorInput[] = names.map((name) => {
    const raw = rawIndicators[name];
    const normValue = raw?.value !== null && raw?.value !== undefined
      ? normaliseForBric(raw.value, name, allValues, methods)
      : null;
    return { value: normValue, meta: raw?.meta };
  });

  const result = computeCapitalScore(normalisedInputs, weights);

  // Build indicator breakdown for response
  const indicators: Record<string, IndicatorValue> = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const raw = rawIndicators[name];
    const meta = BRIC_INDICATOR_META[name];
    const method = methods[name] ?? 'min-max';
    indicators[name] = {
      raw: raw?.value ?? null,
      normalised: normalisedInputs[i].value ?? 0,
      weight: result.breakdown[i]?.effectiveWeight ?? 0,
      direction: meta?.direction ?? 'higher_better',
      normalisation_method: method,
      signal: buildResponseSignal(raw?.meta, meta?.source ?? 'Unknown'),
    };
  }

  return { result, indicators };
}

// ── Pillar scoring with full breakdown ──────────────────────────────────────

function scorePillar(
  pillarConfig: PillarWeights,
  rawIndicators: Record<string, IndicatorInput>,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
): { result: PillarResult; indicators: Record<string, IndicatorValue> } {
  const names = pillarConfig.indicators.map((w) => w.indicator);
  const weights = pillarConfig.indicators.map((w) => w.weight);

  const normalisedInputs: IndicatorInput[] = names.map((name) => {
    const raw = rawIndicators[name];
    const normValue = raw?.value !== null && raw?.value !== undefined
      ? normaliseForInform(raw.value, name, allValues, methods)
      : null;
    return { value: normValue, meta: raw?.meta };
  });

  const result = computePillarScore(normalisedInputs, weights);

  const indicators: Record<string, IndicatorValue> = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const raw = rawIndicators[name];
    const meta = INFORM_INDICATOR_META[name];
    const method = methods[name] ?? 'min-max';
    indicators[name] = {
      raw: raw?.value ?? null,
      normalised: normalisedInputs[i].value ?? 0,
      weight: result.breakdown[i]?.effectiveWeight ?? 0,
      direction: meta?.direction ?? 'lower_better',
      normalisation_method: method,
      signal: buildResponseSignal(raw?.meta, meta?.source ?? 'Unknown'),
    };
  }

  return { result, indicators };
}

// ── INFORM label ────────────────────────────────────────────────────────────

function getInformLabel(score: number): string {
  if (score <= 2.0) return 'Low';
  if (score <= 4.0) return 'Moderate';
  if (score <= 6.0) return 'High';
  if (score <= 8.0) return 'Very High';
  return 'Severe';
}

// ── Weak area detection ─────────────────────────────────────────────────────

const CAPITAL_NAMES = ['social', 'economic', 'community', 'institutional', 'housing_infrastructure', 'environmental'] as const;

function findWeakCapitals(
  capitalsMap: Record<string, CapitalScore>,
): string[] {
  return CAPITAL_NAMES.filter((name) => {
    const cap = capitalsMap[name];
    return cap && cap.available && cap.score < 0.4;
  });
}

const PILLAR_NAMES = ['exposure', 'sensitivity', 'lack_of_coping'] as const;

function findWeakPillars(
  pillarsMap: Record<string, PillarScore>,
): string[] {
  return PILLAR_NAMES.filter((name) => {
    const pil = pillarsMap[name];
    return pil && pil.score > 6.0;
  });
}

// ── Main scoring orchestration ──────────────────────────────────────────────

export function scorePostcode(postcode: string): PostcodeRecord {
  const { raw, allValues, methods, localities } = getCachedData();
  const { bricIndicators, informIndicators } = extractIndicators(postcode, raw);

  // Score BRIC capitals
  const social = scoreCapital(socialCapital, bricIndicators, allValues, methods);
  const economic = scoreCapital(economicCapital, bricIndicators, allValues, methods);
  const community = scoreCapital(communityCapital, bricIndicators, allValues, methods);
  const institutional = scoreCapital(institutionalCapital, bricIndicators, allValues, methods);
  const housingInfra = scoreCapital(housingInfraCapital, bricIndicators, allValues, methods);
  const environmental = scoreCapital(environmentalCapital, bricIndicators, allValues, methods);

  const bricResult = computeBricScore([
    social.result,
    economic.result,
    community.result,
    institutional.result,
    housingInfra.result,
    environmental.result,
  ]);

  // Score INFORM pillars
  const exposure = scorePillar(exposurePillar, informIndicators, allValues, methods);
  const sensitivity = scorePillar(sensitivityPillar, informIndicators, allValues, methods);
  const lackOfCoping = scorePillar(lackOfCopingCapacityPillar, informIndicators, allValues, methods);

  const informResult = computeInformScore([
    exposure.result,
    sensitivity.result,
    lackOfCoping.result,
  ]);

  // Quadrant classification
  const quadrant = classifyQuadrant(bricResult.score, informResult.score, quadrantThresholds);

  // Build capital and pillar maps for weak area detection
  const capitalsMap: Record<string, CapitalScore> = {
    social: { score: social.result.score, confidence: social.result.confidence, available: social.result.available, indicators: social.indicators },
    economic: { score: economic.result.score, confidence: economic.result.confidence, available: economic.result.available, indicators: economic.indicators },
    community: { score: community.result.score, confidence: community.result.confidence, available: community.result.available, indicators: community.indicators },
    institutional: { score: institutional.result.score, confidence: institutional.result.confidence, available: institutional.result.available, indicators: institutional.indicators },
    housing_infrastructure: { score: housingInfra.result.score, confidence: housingInfra.result.confidence, available: housingInfra.result.available, indicators: housingInfra.indicators },
    environmental: { score: environmental.result.score, confidence: environmental.result.confidence, available: environmental.result.available, indicators: environmental.indicators },
  };

  const pillarsMap: Record<string, PillarScore> = {
    exposure: { score: exposure.result.score, confidence: exposure.result.confidence, indicators: exposure.indicators },
    sensitivity: { score: sensitivity.result.score, confidence: sensitivity.result.confidence, indicators: sensitivity.indicators },
    lack_of_coping: { score: lackOfCoping.result.score, confidence: lackOfCoping.result.confidence, indicators: lackOfCoping.indicators },
  };

  // Action selection
  const weakCapitals = findWeakCapitals(capitalsMap);
  const weakPillars = findWeakPillars(pillarsMap);
  const actions = selectActions(quadrant.classification, weakCapitals, weakPillars);

  // Overall data confidence: weighted average of BRIC and INFORM confidence
  const dataConfidence = Math.round(
    ((bricResult.confidence * 0.5) + (informResult.confidence * 0.5)) * 1000,
  ) / 1000;

  // Collect unique signals from all indicators
  const allSignals: ResponseSignalMeta[] = [];
  const seenSources = new Set<string>();
  for (const cap of Object.values(capitalsMap)) {
    for (const ind of Object.values(cap.indicators)) {
      if (!seenSources.has(ind.signal.source)) {
        seenSources.add(ind.signal.source);
        allSignals.push(ind.signal);
      }
    }
  }
  for (const pil of Object.values(pillarsMap)) {
    for (const ind of Object.values(pil.indicators)) {
      if (!seenSources.has(ind.signal.source)) {
        seenSources.add(ind.signal.source);
        allSignals.push(ind.signal);
      }
    }
  }

  return {
    postcode,
    locality: localities[postcode] ?? '',
    state: postcodeToState(postcode),
    bric: {
      score: bricResult.score,
      label: getScoreLabel(bricResult.score),
      confidence: bricResult.confidence,
      capitals: capitalsMap as PostcodeRecord['bric']['capitals'],
    },
    inform: {
      score: informResult.score,
      label: getInformLabel(informResult.score),
      confidence: informResult.confidence,
      pillars: pillarsMap as PostcodeRecord['inform']['pillars'],
    },
    quadrant: quadrant.classification,
    quadrant_label: quadrant.label,
    actions,
    data_confidence: dataConfidence,
    signals: allSignals,
    last_updated: new Date().toISOString().split('T')[0],
  };
}

// ── HTTP handler ────────────────────────────────────────────────────────────

export type ScoreResult =
  | { status: 200; body: PostcodeRecord }
  | { status: 400; body: ErrorResponse }
  | { status: 404; body: ErrorResponse };

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const postcode = url.searchParams.get('postcode');
  const result = handleScoreRequest(postcode);
  return Response.json(result.body, { status: result.status });
}

export function handleScoreRequest(queryPostcode: string | null | undefined): ScoreResult {
  // Validate presence
  if (!queryPostcode) {
    return {
      status: 400,
      body: { error: 'Missing required query parameter: postcode', status: 400 },
    };
  }

  // Validate format (3-4 digits)
  if (!isValidPostcode(queryPostcode)) {
    return {
      status: 400,
      body: { error: `Invalid postcode format: "${queryPostcode}". Must be 3-4 digits.`, status: 400 },
    };
  }

  // Check if postcode exists in any dataset
  const { raw } = getCachedData();
  if (!raw[queryPostcode]) {
    return {
      status: 404,
      body: { error: `Postcode not found: ${queryPostcode}`, status: 404 },
    };
  }

  // Score and return
  const record = scorePostcode(queryPostcode);
  return { status: 200, body: record };
}
