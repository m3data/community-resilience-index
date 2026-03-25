/**
 * Indicator weight configuration — SPEC-001 REQ-015
 *
 * All indicator weights for BRIC capitals (REQ-001–REQ-006) and
 * INFORM pillars (REQ-008–REQ-010). Diversity indicators carry a
 * 1.2x–1.5x premium per ADR-003 (marked with `diversity: true`).
 *
 * Quadrant thresholds per REQ-012, score labels per REQ-018.
 *
 * Plain configuration object — no env reads, no file I/O.
 */

// --- Types ---

export interface IndicatorWeight {
  readonly indicator: string;
  readonly weight: number;
  /** ADR-003 diversity premium indicator */
  readonly diversity?: true;
}

export interface CapitalWeights {
  readonly indicators: readonly IndicatorWeight[];
}

export interface PillarWeights {
  readonly indicators: readonly IndicatorWeight[];
}

export type Quadrant = 'monitor' | 'stress-tested' | 'structurally-fragile' | 'critical-priority';

export interface QuadrantThresholds {
  readonly resilience: number;
  readonly crisis: number;
}

export interface ScoreLabel {
  readonly min: number;
  readonly max: number;
  readonly label: string;
}

// --- BRIC Capital Weights (REQ-001 through REQ-006) ---

export const socialCapital: CapitalWeights = {
  indicators: [
    { indicator: 'seifa_irsd', weight: 0.30 },
    { indicator: 'educational_attainment', weight: 0.25 },
    { indicator: 'english_proficiency', weight: 0.20 },
    { indicator: 'health_service_access', weight: 0.25 },
  ],
} as const;

export const economicCapital: CapitalWeights = {
  indicators: [
    { indicator: 'median_household_income', weight: 0.20 },
    { indicator: 'unemployment_rate', weight: 0.20 },
    { indicator: 'industry_diversity', weight: 0.30, diversity: true },
    { indicator: 'housing_affordability', weight: 0.15 },
    { indicator: 'gini_coefficient', weight: 0.15 },
  ],
} as const;

export const communityCapital: CapitalWeights = {
  indicators: [
    { indicator: 'voluntary_work_participation', weight: 0.35 },
    { indicator: 'nonprofit_org_density', weight: 0.30 },
    { indicator: 'voter_turnout', weight: 0.15 },
    { indicator: 'organisational_type_diversity', weight: 0.20, diversity: true },
  ],
} as const;

export const institutionalCapital: CapitalWeights = {
  indicators: [
    { indicator: 'distance_to_hospital', weight: 0.30 },
    { indicator: 'distance_to_fire_police', weight: 0.25 },
    { indicator: 'govt_service_points_per_capita', weight: 0.25 },
    { indicator: 'emergency_management_plan', weight: 0.20 },
  ],
} as const;

export const housingInfraCapital: CapitalWeights = {
  indicators: [
    { indicator: 'internet_connectivity', weight: 0.20 },
    { indicator: 'dwelling_quality', weight: 0.15 },
    { indicator: 'transport_mode_diversity', weight: 0.30, diversity: true },
    { indicator: 'public_transport_access', weight: 0.20 },
    { indicator: 'vacancy_rate', weight: 0.15 },
  ],
} as const;

export const environmentalCapital: CapitalWeights = {
  indicators: [
    { indicator: 'agricultural_land', weight: 0.35 },
    { indicator: 'green_space_per_capita', weight: 0.25 },
    { indicator: 'land_use_diversity', weight: 0.25, diversity: true },
    { indicator: 'water_security', weight: 0.15 },
  ],
} as const;

export const bricCapitals = {
  social: socialCapital,
  economic: economicCapital,
  community: communityCapital,
  institutional: institutionalCapital,
  housingInfra: housingInfraCapital,
  environmental: environmentalCapital,
} as const;

// --- INFORM Pillar Weights (REQ-008 through REQ-010) ---

export const exposurePillar: PillarWeights = {
  indicators: [
    { indicator: 'remoteness', weight: 0.30 },
    { indicator: 'distance_to_refinery', weight: 0.25 },
    { indicator: 'local_fuel_price_relative', weight: 0.25 },
    { indicator: 'fuel_station_density', weight: 0.10 },
    { indicator: 'local_fuel_availability', weight: 0.10 },
  ],
} as const;

export const sensitivityPillar: PillarWeights = {
  indicators: [
    { indicator: 'seifa_irsd_inverted', weight: 0.30 },
    { indicator: 'car_dependency_rate', weight: 0.25 },
    { indicator: 'housing_stress', weight: 0.20 },
    { indicator: 'agricultural_workforce_proportion', weight: 0.15 },
    { indicator: 'distance_to_supermarket', weight: 0.10 },
  ],
} as const;

export const lackOfCopingCapacityPillar: PillarWeights = {
  indicators: [
    { indicator: 'public_transport_accessibility', weight: 0.20 },
    { indicator: 'solar_battery_penetration', weight: 0.20 },
    { indicator: 'volunteer_density', weight: 0.20 },
    { indicator: 'internet_connectivity', weight: 0.15 },
    { indicator: 'community_infrastructure_density', weight: 0.15 },
    { indicator: 'local_food_production_potential', weight: 0.10 },
  ],
} as const;

export const informPillars = {
  exposure: exposurePillar,
  sensitivity: sensitivityPillar,
  lackOfCopingCapacity: lackOfCopingCapacityPillar,
} as const;

// --- Quadrant Thresholds (REQ-012) ---

export const quadrantThresholds: QuadrantThresholds = {
  resilience: 3.0,
  crisis: 5.0,
} as const;

// --- Score Labels (REQ-018) ---

export const scoreLabels: readonly ScoreLabel[] = [
  { min: 0.0, max: 1.0, label: 'Very Low' },
  { min: 1.1, max: 2.0, label: 'Low' },
  { min: 2.1, max: 3.0, label: 'Below Average' },
  { min: 3.1, max: 4.0, label: 'Average' },
  { min: 4.1, max: 5.0, label: 'Above Average' },
  { min: 5.1, max: 6.0, label: 'High' },
] as const;

export function getScoreLabel(score: number): string {
  for (const band of scoreLabels) {
    if (score >= band.min && score <= band.max) return band.label;
  }
  return 'Unknown';
}

// --- Full Configuration ---

export const weightsConfig = {
  bric: bricCapitals,
  inform: informPillars,
  quadrantThresholds,
  scoreLabels,
} as const;
