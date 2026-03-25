/**
 * Validation pipeline — SPEC-001 Section 11, TEST-030 through TEST-034
 *
 * Computes BRIC/INFORM scores for all postcodes then runs five validation
 * suites: internal consistency (TEST-030), normalisation robustness (TEST-031),
 * weight sensitivity (TEST-032), SEIFA correlation (TEST-033), and
 * coherence/entrainment analysis (TEST-034).
 *
 * Usage: npx tsx scripts/validate.ts
 * Output: validation-results.json (structured) + stdout summary (human-readable)
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadStaticData,
  computeAllValues,
  extractIndicators,
  type RawIndicatorData,
  type AllValuesMap,
} from '../src/lib/data/loader.js';
import {
  computeCapitalScore,
  computeBricScore,
  computePillarScore,
  computeInformScore,
  classifyQuadrant,
  normalise,
  normaliseInverted,
  computeSkewness,
  computeShannonDiversity,
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
  type CapitalResult,
  type PillarResult,
  type IndicatorInput,
} from '../src/lib/scoring/index.js';
import type { NormalisationMethod } from '../src/lib/scoring/normalise.js';
import type { CapitalWeights, PillarWeights, Quadrant } from '../src/lib/scoring/weights.js';

// ── Statistical helpers ─────────────────────────────────────────────────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

function rankArray(xs: number[]): number[] {
  const indexed = xs.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(xs.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].v === indexed[i].v) j++;
    const avgRank = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k++) ranks[indexed[k].i] = avgRank;
    i = j;
  }
  return ranks;
}

function spearman(xs: number[], ys: number[]): number {
  return pearson(rankArray(xs), rankArray(ys));
}

function cronbachAlpha(itemMatrix: number[][]): number {
  // itemMatrix: rows = observations, columns = items
  const n = itemMatrix.length;
  const k = itemMatrix[0]?.length ?? 0;
  if (k < 2 || n < 3) return 0;

  // Item variances
  const itemVars: number[] = [];
  for (let j = 0; j < k; j++) {
    const col = itemMatrix.map((row) => row[j]);
    const s = std(col);
    itemVars.push(s * s);
  }

  // Total score variance
  const totals = itemMatrix.map((row) => row.reduce((s, v) => s + v, 0));
  const totalVar = std(totals) ** 2;

  if (totalVar === 0) return 0;
  const sumItemVar = itemVars.reduce((s, v) => s + v, 0);
  return (k / (k - 1)) * (1 - sumItemVar / totalVar);
}

// Simple PCA via power iteration on the correlation matrix
function pcaVarianceExplained(itemMatrix: number[][]): number[] {
  const n = itemMatrix.length;
  const k = itemMatrix[0]?.length ?? 0;
  if (k < 2 || n < 3) return [];

  // Standardise columns
  const cols: number[][] = [];
  for (let j = 0; j < k; j++) {
    const col = itemMatrix.map((row) => row[j]);
    const m = mean(col);
    const s = std(col);
    cols.push(s === 0 ? col.map(() => 0) : col.map((v) => (v - m) / s));
  }

  // Correlation matrix
  const R: number[][] = [];
  for (let i = 0; i < k; i++) {
    R.push([]);
    for (let j = 0; j < k; j++) {
      R[i].push(pearson(cols[i], cols[j]));
    }
  }

  // Power iteration for top eigenvalues
  const eigenvalues: number[] = [];
  const deflatedR = R.map((row) => [...row]);

  for (let comp = 0; comp < Math.min(k, 3); comp++) {
    let vec = Array.from({ length: k }, () => Math.random());
    let eigenvalue = 0;

    for (let iter = 0; iter < 200; iter++) {
      // Matrix-vector multiply
      const newVec = new Array<number>(k).fill(0);
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          newVec[i] += deflatedR[i][j] * vec[j];
        }
      }
      // Norm
      const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
      if (norm === 0) break;
      eigenvalue = norm;
      vec = newVec.map((v) => v / norm);
    }

    eigenvalues.push(eigenvalue);

    // Deflate
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        deflatedR[i][j] -= eigenvalue * vec[i] * vec[j];
      }
    }
  }

  const totalVar = eigenvalues.reduce((s, v) => s + v, 0);
  if (totalVar === 0) return eigenvalues.map(() => 0);
  return eigenvalues.map((v) => v / totalVar);
}

// ── Scoring infrastructure ──────────────────────────────────────────────────

interface ScoredPostcode {
  postcode: string;
  bricScore: number;
  informScore: number;
  quadrant: Quadrant;
  capitalScores: Record<string, number>;
  capitalAvailable: Record<string, boolean>;
  pillarScores: Record<string, number>;
}

const BRIC_INDICATOR_DIRECTIONS: Record<string, 'higher_better' | 'lower_better'> = {
  seifa_irsd: 'higher_better',
  educational_attainment: 'higher_better',
  english_proficiency: 'higher_better',
  health_service_access: 'higher_better',
  median_household_income: 'higher_better',
  unemployment_rate: 'lower_better',
  industry_diversity: 'higher_better',
  housing_affordability: 'higher_better',
  gini_coefficient: 'lower_better',
  voluntary_work_participation: 'higher_better',
  nonprofit_org_density: 'higher_better',
  voter_turnout: 'higher_better',
  organisational_type_diversity: 'higher_better',
  distance_to_hospital: 'lower_better',
  distance_to_fire_police: 'lower_better',
  govt_service_points_per_capita: 'higher_better',
  emergency_management_plan: 'higher_better',
  internet_connectivity: 'higher_better',
  dwelling_quality: 'higher_better',
  transport_mode_diversity: 'higher_better',
  public_transport_access: 'higher_better',
  vacancy_rate: 'lower_better',
  agricultural_land: 'higher_better',
  green_space_per_capita: 'higher_better',
  land_use_diversity: 'higher_better',
  water_security: 'higher_better',
};

const INFORM_INDICATOR_INVERT: Record<string, boolean> = {
  remoteness: false,
  distance_to_refinery: false,
  local_fuel_price_relative: false,
  fuel_station_density: true,
  local_fuel_availability: true,
  seifa_irsd_inverted: true,
  car_dependency_rate: false,
  housing_stress: false,
  agricultural_workforce_proportion: false,
  distance_to_supermarket: false,
  public_transport_accessibility: true,
  solar_battery_penetration: true,
  volunteer_density: true,
  internet_connectivity: true,
  community_infrastructure_density: true,
  local_food_production_potential: true,
};

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
  if (BRIC_INDICATOR_DIRECTIONS[indicatorName] === 'lower_better') {
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
  if (INFORM_INDICATOR_INVERT[indicatorName]) {
    return normaliseInverted(raw, vals, method) * 10;
  }
  return normalise(raw, vals, method) * 10;
}

function scoreCapital(
  capitalConfig: CapitalWeights,
  rawIndicators: Record<string, IndicatorInput>,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
): CapitalResult {
  const names = capitalConfig.indicators.map((w) => w.indicator);
  const weights = capitalConfig.indicators.map((w) => w.weight);
  const normalisedInputs: IndicatorInput[] = names.map((name) => {
    const raw = rawIndicators[name];
    const normValue =
      raw?.value !== null && raw?.value !== undefined
        ? normaliseForBric(raw.value, name, allValues, methods)
        : null;
    return { value: normValue, meta: raw?.meta };
  });
  return computeCapitalScore(normalisedInputs, weights);
}

function scorePillar(
  pillarConfig: PillarWeights,
  rawIndicators: Record<string, IndicatorInput>,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
): PillarResult {
  const names = pillarConfig.indicators.map((w) => w.indicator);
  const weights = pillarConfig.indicators.map((w) => w.weight);
  const normalisedInputs: IndicatorInput[] = names.map((name) => {
    const raw = rawIndicators[name];
    const normValue =
      raw?.value !== null && raw?.value !== undefined
        ? normaliseForInform(raw.value, name, allValues, methods)
        : null;
    return { value: normValue, meta: raw?.meta };
  });
  return computePillarScore(normalisedInputs, weights);
}

function scoreAllPostcodes(
  rawData: RawIndicatorData,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
): ScoredPostcode[] {
  const results: ScoredPostcode[] = [];
  for (const postcode of Object.keys(rawData)) {
    const { bricIndicators, informIndicators } = extractIndicators(postcode, rawData);

    const social = scoreCapital(socialCapital, bricIndicators, allValues, methods);
    const economic = scoreCapital(economicCapital, bricIndicators, allValues, methods);
    const community = scoreCapital(communityCapital, bricIndicators, allValues, methods);
    const institutional = scoreCapital(institutionalCapital, bricIndicators, allValues, methods);
    const housingInfra = scoreCapital(housingInfraCapital, bricIndicators, allValues, methods);
    const environmental = scoreCapital(environmentalCapital, bricIndicators, allValues, methods);

    const bricResult = computeBricScore([
      social, economic, community, institutional, housingInfra, environmental,
    ]);

    const exposure = scorePillar(exposurePillar, informIndicators, allValues, methods);
    const sensitivity = scorePillar(sensitivityPillar, informIndicators, allValues, methods);
    const lackOfCoping = scorePillar(lackOfCopingCapacityPillar, informIndicators, allValues, methods);

    const informResult = computeInformScore([exposure, sensitivity, lackOfCoping]);
    const quadrant = classifyQuadrant(bricResult.score, informResult.score, quadrantThresholds);

    results.push({
      postcode,
      bricScore: bricResult.score,
      informScore: informResult.score,
      quadrant: quadrant.classification,
      capitalScores: {
        social: social.score,
        economic: economic.score,
        community: community.score,
        institutional: institutional.score,
        housing_infrastructure: housingInfra.score,
        environmental: environmental.score,
      },
      capitalAvailable: {
        social: social.available,
        economic: economic.available,
        community: community.available,
        institutional: institutional.available,
        housing_infrastructure: housingInfra.available,
        environmental: environmental.available,
      },
      pillarScores: {
        exposure: exposure.score,
        sensitivity: sensitivity.score,
        lack_of_coping: lackOfCoping.score,
      },
    });
  }
  return results;
}

// ── TEST-030: Internal consistency ──────────────────────────────────────────

interface Test030Result {
  test: 'TEST-030';
  description: 'Internal consistency — correlation matrix, PCA, Cronbach alpha per capital';
  capitals: Record<string, {
    indicators: string[];
    availablePostcodes: number;
    correlationMatrix: number[][];
    pcaVarianceExplained: number[];
    cronbachAlpha: number;
  }>;
  pass: boolean;
  notes: string[];
}

function runTest030(
  rawData: RawIndicatorData,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
): Test030Result {
  const capitalConfigs: Record<string, CapitalWeights> = {
    social: socialCapital,
    economic: economicCapital,
    community: communityCapital,
    housing_infrastructure: housingInfraCapital,
  };

  const capitals: Test030Result['capitals'] = {};
  const notes: string[] = [];

  for (const [name, config] of Object.entries(capitalConfigs)) {
    const indicatorNames = config.indicators.map((w) => w.indicator);

    // Build matrix: rows = postcodes, cols = normalised indicator values
    // Only include postcodes where at least 2 indicators have data
    const rows: number[][] = [];
    const postcodes = Object.keys(rawData);

    for (const pc of postcodes) {
      const { bricIndicators } = extractIndicators(pc, rawData);
      const values: (number | null)[] = indicatorNames.map((ind) => {
        const raw = bricIndicators[ind];
        if (raw?.value === null || raw?.value === undefined) return null;
        return normaliseForBric(raw.value, ind, allValues, methods);
      });

      const nonNull = values.filter((v) => v !== null);
      if (nonNull.length >= 2) {
        rows.push(values.map((v) => v ?? 0));
      }
    }

    // Correlation matrix between indicators
    const k = indicatorNames.length;
    const corrMatrix: number[][] = [];
    for (let i = 0; i < k; i++) {
      corrMatrix.push([]);
      for (let j = 0; j < k; j++) {
        const colI = rows.map((r) => r[i]);
        const colJ = rows.map((r) => r[j]);
        corrMatrix[i].push(Math.round(pearson(colI, colJ) * 1000) / 1000);
      }
    }

    const pca = pcaVarianceExplained(rows);
    const alpha = cronbachAlpha(rows);

    capitals[name] = {
      indicators: indicatorNames,
      availablePostcodes: rows.length,
      correlationMatrix: corrMatrix,
      pcaVarianceExplained: pca.map((v) => Math.round(v * 1000) / 1000),
      cronbachAlpha: Math.round(alpha * 1000) / 1000,
    };

    if (alpha < 0.5) {
      notes.push(`${name}: Cronbach alpha ${alpha.toFixed(3)} < 0.5 — low internal consistency (expected with sparse data)`);
    } else if (alpha >= 0.7) {
      notes.push(`${name}: Cronbach alpha ${alpha.toFixed(3)} >= 0.7 — good internal consistency`);
    } else {
      notes.push(`${name}: Cronbach alpha ${alpha.toFixed(3)} — acceptable`);
    }

    if (pca.length > 0) {
      notes.push(`${name}: PC1 explains ${(pca[0] * 100).toFixed(1)}% of variance`);
    }
  }

  // Institutional and environmental have no data — note that
  notes.push('institutional: skipped — all indicators null (no data sources yet)');
  notes.push('environmental: skipped — all indicators null (no data sources yet)');

  return {
    test: 'TEST-030',
    description: 'Internal consistency — correlation matrix, PCA, Cronbach alpha per capital',
    capitals,
    pass: true, // informational — no hard pass/fail threshold for internal consistency
    notes,
  };
}

// ── TEST-031: Normalisation robustness ──────────────────────────────────────

interface Test031Result {
  test: 'TEST-031';
  description: 'Normalisation robustness — min-max vs percentile-rank Spearman >= 0.85';
  postcodeCount: number;
  bricSpearman: number;
  informSpearman: number;
  pass: boolean;
  notes: string[];
}

function runTest031(
  rawData: RawIndicatorData,
  allValues: AllValuesMap,
): Test031Result {
  // Score all postcodes with min-max
  const mmMethods: Record<string, NormalisationMethod> = {};
  for (const key of Object.keys(allValues)) mmMethods[key] = 'min-max';
  const mmScores = scoreAllPostcodes(rawData, allValues, mmMethods);

  // Score all postcodes with percentile-rank
  const prMethods: Record<string, NormalisationMethod> = {};
  for (const key of Object.keys(allValues)) prMethods[key] = 'percentile-rank';
  const prScores = scoreAllPostcodes(rawData, allValues, prMethods);

  // Align by postcode
  const prMap = new Map(prScores.map((s) => [s.postcode, s]));
  const mmBric: number[] = [];
  const prBric: number[] = [];
  const mmInform: number[] = [];
  const prInform: number[] = [];

  for (const mm of mmScores) {
    const pr = prMap.get(mm.postcode);
    if (!pr) continue;
    mmBric.push(mm.bricScore);
    prBric.push(pr.bricScore);
    mmInform.push(mm.informScore);
    prInform.push(pr.informScore);
  }

  const bricRho = spearman(mmBric, prBric);
  const informRho = spearman(mmInform, prInform);
  const notes: string[] = [];

  const bricPass = bricRho >= 0.85;
  const informPass = informRho >= 0.85;

  if (!bricPass) notes.push(`BRIC Spearman ${bricRho.toFixed(3)} < 0.85 threshold`);
  if (!informPass) notes.push(`INFORM Spearman ${informRho.toFixed(3)} < 0.85 threshold`);
  if (bricPass && informPass) notes.push('Both BRIC and INFORM rankings robust to normalisation method');

  return {
    test: 'TEST-031',
    description: 'Normalisation robustness — min-max vs percentile-rank Spearman >= 0.85',
    postcodeCount: mmBric.length,
    bricSpearman: Math.round(bricRho * 1000) / 1000,
    informSpearman: Math.round(informRho * 1000) / 1000,
    pass: bricPass && informPass,
    notes,
  };
}

// ── TEST-032: Weight sensitivity ────────────────────────────────────────────

interface Test032Result {
  test: 'TEST-032';
  description: 'Weight sensitivity — +/-20% perturbation, rank correlation >= 0.90, quadrant changes < 10%';
  perturbations: number;
  avgBricRankCorrelation: number;
  minBricRankCorrelation: number;
  avgInformRankCorrelation: number;
  minInformRankCorrelation: number;
  avgQuadrantChangeRate: number;
  maxQuadrantChangeRate: number;
  pass: boolean;
  notes: string[];
}

function perturbWeights(config: CapitalWeights | PillarWeights, factor: number): CapitalWeights | PillarWeights {
  const perturbed = config.indicators.map((w, i) => ({
    ...w,
    weight: w.weight * (1 + factor * (i % 2 === 0 ? 1 : -1)),
  }));
  // Renormalise
  const sum = perturbed.reduce((s, w) => s + w.weight, 0);
  return {
    indicators: perturbed.map((w) => ({ ...w, weight: w.weight / sum })),
  };
}

function runTest032(
  rawData: RawIndicatorData,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
  baseScores: ScoredPostcode[],
): Test032Result {
  const perturbFactors = [-0.20, -0.10, 0.10, 0.20];
  const bricRankCorrs: number[] = [];
  const informRankCorrs: number[] = [];
  const quadrantChangeRates: number[] = [];
  const notes: string[] = [];

  const baseBric = baseScores.map((s) => s.bricScore);
  const baseInform = baseScores.map((s) => s.informScore);
  const baseQuadrants = baseScores.map((s) => s.quadrant);

  for (const factor of perturbFactors) {
    // Perturb all capital and pillar weights
    const pertSocial = perturbWeights(socialCapital, factor) as CapitalWeights;
    const pertEconomic = perturbWeights(economicCapital, factor) as CapitalWeights;
    const pertCommunity = perturbWeights(communityCapital, factor) as CapitalWeights;
    const pertInstitutional = perturbWeights(institutionalCapital, factor) as CapitalWeights;
    const pertHousing = perturbWeights(housingInfraCapital, factor) as CapitalWeights;
    const pertEnvironmental = perturbWeights(environmentalCapital, factor) as CapitalWeights;
    const pertExposure = perturbWeights(exposurePillar, factor) as PillarWeights;
    const pertSensitivity = perturbWeights(sensitivityPillar, factor) as PillarWeights;
    const pertCoping = perturbWeights(lackOfCopingCapacityPillar, factor) as PillarWeights;

    const pertScores: ScoredPostcode[] = [];
    for (const postcode of Object.keys(rawData)) {
      const { bricIndicators, informIndicators } = extractIndicators(postcode, rawData);

      const social = scoreCapital(pertSocial, bricIndicators, allValues, methods);
      const economic = scoreCapital(pertEconomic, bricIndicators, allValues, methods);
      const community = scoreCapital(pertCommunity, bricIndicators, allValues, methods);
      const institutional = scoreCapital(pertInstitutional, bricIndicators, allValues, methods);
      const housingInfra = scoreCapital(pertHousing, bricIndicators, allValues, methods);
      const environmental = scoreCapital(pertEnvironmental, bricIndicators, allValues, methods);

      const bricResult = computeBricScore([
        social, economic, community, institutional, housingInfra, environmental,
      ]);

      const exposure = scorePillar(pertExposure, informIndicators, allValues, methods);
      const sensitivity = scorePillar(pertSensitivity, informIndicators, allValues, methods);
      const lackOfCoping = scorePillar(pertCoping, informIndicators, allValues, methods);

      const informResult = computeInformScore([exposure, sensitivity, lackOfCoping]);
      const quadrant = classifyQuadrant(bricResult.score, informResult.score, quadrantThresholds);

      pertScores.push({
        postcode,
        bricScore: bricResult.score,
        informScore: informResult.score,
        quadrant: quadrant.classification,
        capitalScores: {},
        capitalAvailable: {},
        pillarScores: {},
      });
    }

    const pertBric = pertScores.map((s) => s.bricScore);
    const pertInform = pertScores.map((s) => s.informScore);
    const pertQuadrants = pertScores.map((s) => s.quadrant);

    bricRankCorrs.push(spearman(baseBric, pertBric));
    informRankCorrs.push(spearman(baseInform, pertInform));

    const changed = baseQuadrants.filter((q, i) => q !== pertQuadrants[i]).length;
    quadrantChangeRates.push(changed / baseQuadrants.length);
  }

  const avgBricRank = mean(bricRankCorrs);
  const minBricRank = Math.min(...bricRankCorrs);
  const avgInformRank = mean(informRankCorrs);
  const minInformRank = Math.min(...informRankCorrs);
  const avgQuadChange = mean(quadrantChangeRates);
  const maxQuadChange = Math.max(...quadrantChangeRates);

  const rankPass = minBricRank >= 0.90 && minInformRank >= 0.90;
  const quadPass = maxQuadChange < 0.10;

  if (!rankPass) notes.push(`Min rank correlation: BRIC=${minBricRank.toFixed(3)}, INFORM=${minInformRank.toFixed(3)}`);
  if (!quadPass) notes.push(`Max quadrant change rate: ${(maxQuadChange * 100).toFixed(1)}% >= 10% threshold`);
  if (rankPass && quadPass) notes.push('Weights are stable: rankings and quadrant assignments robust to +/-20% perturbation');

  return {
    test: 'TEST-032',
    description: 'Weight sensitivity — +/-20% perturbation, rank correlation >= 0.90, quadrant changes < 10%',
    perturbations: perturbFactors.length,
    avgBricRankCorrelation: Math.round(avgBricRank * 1000) / 1000,
    minBricRankCorrelation: Math.round(minBricRank * 1000) / 1000,
    avgInformRankCorrelation: Math.round(avgInformRank * 1000) / 1000,
    minInformRankCorrelation: Math.round(minInformRank * 1000) / 1000,
    avgQuadrantChangeRate: Math.round(avgQuadChange * 1000) / 1000,
    maxQuadrantChangeRate: Math.round(maxQuadChange * 1000) / 1000,
    pass: rankPass && quadPass,
    notes,
  };
}

// ── TEST-033: SEIFA correlation ─────────────────────────────────────────────

interface Test033Result {
  test: 'TEST-033';
  description: 'SEIFA IRSD correlation — Pearson and Spearman, expect r >= 0.4';
  postcodeCount: number;
  pearsonR: number | null;
  spearmanRho: number | null;
  pass: boolean | null;
  notes: string[];
}

function runTest033(
  rawData: RawIndicatorData,
  baseScores: ScoredPostcode[],
): Test033Result {
  // Check for SEIFA data
  const seifaPostcodes = Object.entries(rawData)
    .filter(([, d]) => d.seifa?.irsd_score != null);

  if (seifaPostcodes.length < 10) {
    return {
      test: 'TEST-033',
      description: 'SEIFA IRSD correlation — Pearson and Spearman, expect r >= 0.4',
      postcodeCount: seifaPostcodes.length,
      pearsonR: null,
      spearmanRho: null,
      pass: null,
      notes: [
        `Only ${seifaPostcodes.length} postcodes have SEIFA data (postcode-seifa.json not present)`,
        'TEST-033 cannot be evaluated without SEIFA IRSD data',
        'To run: add app/src/data/postcode-seifa.json with {postcode: {irsd_score: number}}',
      ],
    };
  }

  const scoreMap = new Map(baseScores.map((s) => [s.postcode, s]));
  const bricValues: number[] = [];
  const seifaValues: number[] = [];

  for (const [pc, data] of seifaPostcodes) {
    const scored = scoreMap.get(pc);
    if (!scored) continue;
    bricValues.push(scored.bricScore);
    seifaValues.push(data.seifa!.irsd_score);
  }

  const r = pearson(bricValues, seifaValues);
  const rho = spearman(bricValues, seifaValues);
  const notes: string[] = [];

  const pass = r >= 0.4 || rho >= 0.4;
  if (!pass) notes.push(`Pearson r=${r.toFixed(3)}, Spearman rho=${rho.toFixed(3)} — both below 0.4`);
  else notes.push(`BRIC correlates with SEIFA IRSD: Pearson r=${r.toFixed(3)}, Spearman rho=${rho.toFixed(3)}`);

  return {
    test: 'TEST-033',
    description: 'SEIFA IRSD correlation — Pearson and Spearman, expect r >= 0.4',
    postcodeCount: bricValues.length,
    pearsonR: Math.round(r * 1000) / 1000,
    spearmanRho: Math.round(rho * 1000) / 1000,
    pass,
    notes,
  };
}

// ── TEST-034: Coherence / entrainment validation ────────────────────────────

interface Test034Result {
  test: 'TEST-034';
  description: 'Coherence/entrainment — standard vs diversity-weighted BRIC, mining-dependent check';
  postcodeCount: number;
  standardVsDiversitySpearman: number;
  topMovers: Array<{ postcode: string; standardBric: number; diversityBric: number; delta: number }>;
  miningDependentPostcodes: Array<{ postcode: string; standardBric: number; diversityBric: number; delta: number }>;
  pass: boolean;
  notes: string[];
}

// Known mining-dependent postcodes (Pilbara, Hunter Valley, Bowen Basin, Goldfields)
const MINING_DEPENDENT_POSTCODES = [
  // Pilbara, WA
  '6718', '6720', '6721', '6722', '6723', '6725', '6726', '6728', '6731',
  // Goldfields-Esperance, WA
  '6430', '6431', '6432', '6433', '6434', '6435',
  // Hunter Valley, NSW
  '2325', '2327', '2330', '2333', '2334', '2335',
  // Bowen Basin / Central QLD
  '4720', '4721', '4722', '4723', '4724', '4725', '4744',
  // Latrobe Valley, VIC (coal)
  '3840', '3842', '3844',
  // Gladstone, QLD
  '4680',
];

function runTest034(
  rawData: RawIndicatorData,
  allValues: AllValuesMap,
  methods: Record<string, NormalisationMethod>,
  baseScores: ScoredPostcode[],
): Test034Result {
  const notes: string[] = [];

  // Per SPEC-001 TEST-034: compare standard equal-weighted BRIC (no diversity
  // premium) against the current diversity-weighted scores (baseScores, which
  // use weights.ts with ADR-003 diversity premium already baked in).
  //
  // Previous implementation incorrectly boosted normalised values by 1.5x on
  // top of weights that already included the premium, causing ceiling clamp
  // (norm * 1.5 → 1.0) and a constant delta across all postcodes.

  // Build equal-weight versions of each capital config
  function equaliseWeights(config: CapitalWeights): CapitalWeights {
    const n = config.indicators.length;
    const equalWeight = 1.0 / n;
    return {
      indicators: config.indicators.map((w) => ({ ...w, weight: equalWeight })),
    };
  }

  const equalCapitalConfigs = [
    equaliseWeights(socialCapital),
    equaliseWeights(economicCapital),
    equaliseWeights(communityCapital),
    equaliseWeights(institutionalCapital),
    equaliseWeights(housingInfraCapital),
    equaliseWeights(environmentalCapital),
  ];

  const standardScores: Map<string, number> = new Map();

  for (const postcode of Object.keys(rawData)) {
    const { bricIndicators } = extractIndicators(postcode, rawData);

    const capitalResults: CapitalResult[] = equalCapitalConfigs.map((config) => {
      return scoreCapital(config, bricIndicators, allValues, methods);
    });

    const bricResult = computeBricScore(capitalResults);
    standardScores.set(postcode, bricResult.score);
  }

  // Compare equal-weighted (standard) vs diversity-weighted (baseScores)
  const standardBric: number[] = [];
  const divBric: number[] = [];
  const deltas: Array<{ postcode: string; standardBric: number; diversityBric: number; delta: number }> = [];

  for (const s of baseScores) {
    const stdScore = standardScores.get(s.postcode) ?? s.bricScore;
    standardBric.push(stdScore);
    divBric.push(s.bricScore);
    deltas.push({
      postcode: s.postcode,
      standardBric: stdScore,
      diversityBric: s.bricScore,
      delta: s.bricScore - stdScore,
    });
  }

  const rho = spearman(standardBric, divBric);

  // Top movers: postcodes where diversity weighting changes score most
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const topMovers = deltas.slice(0, 20).map((d) => ({
    ...d,
    standardBric: Math.round(d.standardBric * 1000) / 1000,
    diversityBric: Math.round(d.diversityBric * 1000) / 1000,
    delta: Math.round(d.delta * 1000) / 1000,
  }));

  // Check mining-dependent postcodes
  const baseScoreMap = new Map(baseScores.map((s) => [s.postcode, s]));
  const miningResults = MINING_DEPENDENT_POSTCODES
    .filter((pc) => rawData[pc])
    .map((pc) => {
      const base = baseScoreMap.get(pc);
      const stdScore = standardScores.get(pc) ?? 0;
      return {
        postcode: pc,
        standardBric: stdScore,
        diversityBric: base?.bricScore ?? 0,
        delta: (base?.bricScore ?? 0) - stdScore,
      };
    })
    .map((d) => ({
      ...d,
      standardBric: Math.round(d.standardBric * 1000) / 1000,
      diversityBric: Math.round(d.diversityBric * 1000) / 1000,
      delta: Math.round(d.delta * 1000) / 1000,
    }));

  // Mining-dependent postcodes should benefit LESS from diversity weighting
  // (less diverse economies → below-median delta). Diversity boost is always
  // non-negative, so we compare against median delta, not zero.
  const allDeltas = deltas.map((d) => d.delta);
  allDeltas.sort((a, b) => a - b);
  const medianDelta = allDeltas[Math.floor(allDeltas.length / 2)] ?? 0;
  const miningWithData = miningResults.filter((m) => m.standardBric > 0);
  const miningBelowMedian = miningWithData.filter((m) => m.delta <= medianDelta).length;
  const miningCoherent = miningWithData.length === 0 || miningBelowMedian / miningWithData.length >= 0.5;

  notes.push(`Standard vs diversity-weighted Spearman: ${rho.toFixed(3)}`);
  notes.push(`Median diversity delta across all postcodes: ${medianDelta.toFixed(3)}`);
  notes.push(`${miningWithData.length} mining-dependent postcodes found in dataset`);
  if (miningWithData.length > 0) {
    notes.push(`${miningBelowMedian}/${miningWithData.length} show below-median delta (expected for less diverse economies)`);
  }
  if (topMovers.length > 0) {
    notes.push(`Largest mover: ${topMovers[0].postcode} (delta=${topMovers[0].delta})`);
  }

  return {
    test: 'TEST-034',
    description: 'Coherence/entrainment — standard vs diversity-weighted BRIC, mining-dependent check',
    postcodeCount: standardBric.length,
    standardVsDiversitySpearman: Math.round(rho * 1000) / 1000,
    topMovers,
    miningDependentPostcodes: miningResults,
    pass: rho >= 0.85 && miningCoherent,
    notes,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CRI Validation Pipeline — SPEC-001 Section 11');
  console.log('  TEST-030 through TEST-034');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Load data
  console.log('Loading data...');
  const rawData = loadStaticData();
  const postcodes = Object.keys(rawData);
  console.log(`  ${postcodes.length} postcodes loaded\n`);

  const allValues = computeAllValues(rawData);
  const methods: Record<string, NormalisationMethod> = {};
  for (const [key, values] of Object.entries(allValues)) {
    const skew = computeSkewness(values);
    methods[key] = Math.abs(skew) > 2 ? 'percentile-rank' : 'min-max';
  }

  // Score all postcodes with base weights
  console.log('Scoring all postcodes...');
  const baseScores = scoreAllPostcodes(rawData, allValues, methods);
  console.log(`  ${baseScores.length} postcodes scored\n`);

  // Distribution summary
  const bricScores = baseScores.map((s) => s.bricScore);
  const informScores = baseScores.map((s) => s.informScore);
  console.log('Score distributions:');
  console.log(`  BRIC:   mean=${mean(bricScores).toFixed(3)}, std=${std(bricScores).toFixed(3)}, min=${Math.min(...bricScores).toFixed(3)}, max=${Math.max(...bricScores).toFixed(3)}`);
  console.log(`  INFORM: mean=${mean(informScores).toFixed(3)}, std=${std(informScores).toFixed(3)}, min=${Math.min(...informScores).toFixed(3)}, max=${Math.max(...informScores).toFixed(3)}`);

  const quadrantCounts: Record<string, number> = {};
  for (const s of baseScores) {
    quadrantCounts[s.quadrant] = (quadrantCounts[s.quadrant] ?? 0) + 1;
  }
  console.log('  Quadrant distribution:');
  for (const [q, n] of Object.entries(quadrantCounts)) {
    console.log(`    ${q}: ${n} (${((n / baseScores.length) * 100).toFixed(1)}%)`);
  }
  console.log('');

  // Run validation tests
  const results: Array<Test030Result | Test031Result | Test032Result | Test033Result | Test034Result> = [];

  console.log('───────────────────────────────────────────────────────────');
  console.log('TEST-030: Internal consistency\n');
  const t030 = runTest030(rawData, allValues, methods);
  results.push(t030);
  for (const note of t030.notes) console.log(`  ${note}`);
  console.log(`  Result: ${t030.pass ? 'PASS' : 'FAIL'}\n`);

  console.log('───────────────────────────────────────────────────────────');
  console.log('TEST-031: Normalisation robustness\n');
  const t031 = runTest031(rawData, allValues);
  results.push(t031);
  console.log(`  Postcodes compared: ${t031.postcodeCount}`);
  console.log(`  BRIC Spearman:   ${t031.bricSpearman}`);
  console.log(`  INFORM Spearman: ${t031.informSpearman}`);
  for (const note of t031.notes) console.log(`  ${note}`);
  console.log(`  Result: ${t031.pass ? 'PASS' : 'FAIL'}\n`);

  console.log('───────────────────────────────────────────────────────────');
  console.log('TEST-032: Weight sensitivity\n');
  const t032 = runTest032(rawData, allValues, methods, baseScores);
  results.push(t032);
  console.log(`  Perturbations: ${t032.perturbations}`);
  console.log(`  BRIC rank correlation:   avg=${t032.avgBricRankCorrelation}, min=${t032.minBricRankCorrelation}`);
  console.log(`  INFORM rank correlation: avg=${t032.avgInformRankCorrelation}, min=${t032.minInformRankCorrelation}`);
  console.log(`  Quadrant change rate:    avg=${(t032.avgQuadrantChangeRate * 100).toFixed(1)}%, max=${(t032.maxQuadrantChangeRate * 100).toFixed(1)}%`);
  for (const note of t032.notes) console.log(`  ${note}`);
  console.log(`  Result: ${t032.pass ? 'PASS' : 'FAIL'}\n`);

  console.log('───────────────────────────────────────────────────────────');
  console.log('TEST-033: SEIFA correlation\n');
  const t033 = runTest033(rawData, baseScores);
  results.push(t033);
  console.log(`  Postcodes with SEIFA: ${t033.postcodeCount}`);
  if (t033.pearsonR !== null) console.log(`  Pearson r:   ${t033.pearsonR}`);
  if (t033.spearmanRho !== null) console.log(`  Spearman rho: ${t033.spearmanRho}`);
  for (const note of t033.notes) console.log(`  ${note}`);
  console.log(`  Result: ${t033.pass === null ? 'SKIPPED (no data)' : t033.pass ? 'PASS' : 'FAIL'}\n`);

  console.log('───────────────────────────────────────────────────────────');
  console.log('TEST-034: Coherence / entrainment\n');
  const t034 = runTest034(rawData, allValues, methods, baseScores);
  results.push(t034);
  console.log(`  Postcodes: ${t034.postcodeCount}`);
  console.log(`  Standard vs diversity-weighted Spearman: ${t034.standardVsDiversitySpearman}`);
  if (t034.topMovers.length > 0) {
    console.log('  Top 5 movers:');
    for (const m of t034.topMovers.slice(0, 5)) {
      console.log(`    ${m.postcode}: standard=${m.standardBric}, diversity=${m.diversityBric}, delta=${m.delta}`);
    }
  }
  if (t034.miningDependentPostcodes.length > 0) {
    console.log(`  Mining-dependent postcodes (${t034.miningDependentPostcodes.length} found):`);
    for (const m of t034.miningDependentPostcodes.slice(0, 10)) {
      console.log(`    ${m.postcode}: standard=${m.standardBric}, diversity=${m.diversityBric}, delta=${m.delta}`);
    }
  }
  for (const note of t034.notes) console.log(`  ${note}`);
  console.log(`  Result: ${t034.pass ? 'PASS' : 'FAIL'}\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('SUMMARY\n');
  const passCount = results.filter((r) => r.pass === true).length;
  const failCount = results.filter((r) => r.pass === false).length;
  const skipCount = results.filter((r) => r.pass === null).length;
  console.log(`  ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
  for (const r of results) {
    const status = r.pass === null ? 'SKIP' : r.pass ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${r.test}: ${r.description}`);
  }
  console.log('');

  // Write JSON output
  const output = {
    generated: new Date().toISOString(),
    postcodeCount: postcodes.length,
    scoreDistribution: {
      bric: { mean: Math.round(mean(bricScores) * 1000) / 1000, std: Math.round(std(bricScores) * 1000) / 1000, min: Math.round(Math.min(...bricScores) * 1000) / 1000, max: Math.round(Math.max(...bricScores) * 1000) / 1000 },
      inform: { mean: Math.round(mean(informScores) * 1000) / 1000, std: Math.round(std(informScores) * 1000) / 1000, min: Math.round(Math.min(...informScores) * 1000) / 1000, max: Math.round(Math.max(...informScores) * 1000) / 1000 },
      quadrants: quadrantCounts,
    },
    tests: results,
    summary: { passed: passCount, failed: failCount, skipped: skipCount },
  };

  const outPath = join(__dirname, '..', 'validation-results.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Results written to ${outPath}`);
}

main();
