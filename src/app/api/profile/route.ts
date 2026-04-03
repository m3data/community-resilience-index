/**
 * GET /api/profile?postcode={3-4 digits}
 *
 * SPEC-003 — Exposure Profile endpoint.
 *
 * Returns structural shape + exposure weights + ranked signals + contextualisation.
 * Replaces score-first framing with profile-first framing.
 * Scoring engine preserved but secondary — profile is primary.
 */

import { getCachedData, isValidPostcode, scorePostcode } from '../score/route';
import type { PostcodeRecord } from '../score/route';
import { computeShannonDiversity } from '../../../lib/scoring/diversity';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StructuralCharacteristic {
  key: string;
  label: string;
  value: number | null;
  formatted: string;
  source: string;
  vintage: string;
  /** Where this sits on the national distribution (0-1, null if no data) */
  percentile: number | null;
}

export type ExposureDomain =
  | 'fuel'
  | 'food'
  | 'electricity'
  | 'economic'
  | 'housing'
  | 'emergency';

export interface ExposureWeight {
  domain: ExposureDomain;
  label: string;
  weight: number; // 0-1, how exposed this postcode is
  reason: string;
  signalKeys: string[]; // which live signals to show
}

export interface ContextualisedSignal {
  key: string;
  domain: ExposureDomain;
  relevance: number; // 0-1
  context: string; // per-postcode contextualisation
}

export interface CascadeEstimate {
  domain: ExposureDomain;
  label: string;
  estimate: string; // e.g. "2-4 weeks"
  description: string;
}

export interface DiversitySpectrum {
  label: string;
  value: number;
  percentile: number | null;
  interpretation: string;
  /** Where this sits on the coherence/entrainment spectrum */
  spectrumPosition: 'entrained' | 'mixed' | 'coherent';
}

export type ActionCategory = 'household' | 'community' | 'advocacy';
export type ActionUrgency = 'now' | 'this_month' | 'ongoing';

export interface ProfileAction {
  title: string;
  description: string;
  category: ActionCategory;
  urgency: ActionUrgency;
  domain: ExposureDomain;
  /** Structural driver that triggered this action */
  driver: string;
  /** Score used for ranking (higher = more urgent) */
  score: number;
  /** Link to guide section */
  guideLink: string;
}

export interface ExposureProfile {
  postcode: string;
  locality: string;
  state: string;
  /** Structural shape — the characteristics that define this community */
  structural: StructuralCharacteristic[];
  /** Data completeness — how many characteristics have data */
  dataCompleteness: { available: number; total: number };
  /** Exposure weights — how exposed this community is in each domain */
  exposures: ExposureWeight[];
  /** Contextualised signal recommendations */
  signals: ContextualisedSignal[];
  /** Cascade timeline estimates */
  cascade: CascadeEstimate[];
  /** Coherence/entrainment spectrum indicators */
  diversity: DiversitySpectrum[];
  /** Top actions — profile-driven, ranked by urgency */
  actions: ProfileAction[];
  /** The full scoring record (preserved, secondary) */
  scoring: PostcodeRecord;
}

export interface ProfileError {
  error: string;
  status: number;
}

// ── Structural characteristic extraction ─────────────────────────────────────

function extractStructural(postcode: string): StructuralCharacteristic[] {
  const { raw, allValues } = getCachedData();
  const d = raw[postcode];
  if (!d) return [];

  const chars: StructuralCharacteristic[] = [];

  function percentileOf(key: string, value: number | null): number | null {
    if (value === null) return null;
    const vals = allValues[key];
    if (!vals || vals.length === 0) return null;
    const below = vals.filter((v) => v < value).length;
    return Math.round((below / vals.length) * 100) / 100;
  }

  // Car dependency
  const carDep = d.census?.car_dependency ?? null;
  chars.push({
    key: 'car_dependency',
    label: 'Car dependency',
    value: carDep,
    formatted: carDep !== null ? `${Math.round(carDep * 100)}% of commuters drive` : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('car_dependency_rate', carDep),
  });

  // Refinery distance — removed from profile display (2026-04-01).
  // Australia imports ~90% of refined fuel; distance to one of two domestic
  // refineries is misleading. Distribution terminal proximity is what matters
  // but that data isn't publicly available at postcode level.
  // Data and scoring engine indicator retained for future use.

  // Industry diversity (Shannon) — uses computeShannonDiversity to match
  // the reference population in the data loader (both use natural log).
  // Previously computed inline with Math.log2, producing values ~44% larger
  // than the reference population and inflating percentiles. (SPEC-005 R1)
  const industryDiv = (d.census?.industry_counts && Object.keys(d.census.industry_counts).length > 0)
    ? computeShannonDiversity(d.census.industry_counts)
    : null;
  chars.push({
    key: 'industry_diversity',
    label: 'Industry spread',
    value: industryDiv,
    formatted: industryDiv !== null
      ? `${industryDiv > 2.1 ? 'Diversified across many industries' : industryDiv > 1.4 ? 'Moderate spread across industries' : 'Concentrated in few industries'}`
      : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('industry_diversity', industryDiv),
  });

  // Agricultural workforce
  let agPct: number | null = null;
  if (d.census?.industry_counts) {
    const agri = d.census.industry_counts['Agriculture, Forestry and Fishing'] ?? 0;
    const total = Object.values(d.census.industry_counts).reduce((s, v) => s + v, 0);
    if (total > 0) agPct = agri / total;
  }
  chars.push({
    key: 'agricultural_workforce',
    label: 'Agricultural workforce',
    value: agPct,
    formatted: agPct !== null ? `${Math.round(agPct * 100)}% of workers` : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('agricultural_workforce_proportion', agPct),
  });

  // Remoteness
  const remoteness = d.remoteness?.remoteness_index ?? null;
  const remoteArea = d.remoteness?.remoteness_area ?? '';
  chars.push({
    key: 'remoteness',
    label: 'Remoteness',
    value: remoteness,
    formatted: remoteness !== null
      ? `${remoteArea || (remoteness <= 1 ? 'Major city' : remoteness <= 2 ? 'Regional centre' : remoteness <= 3 ? 'Large rural town' : remoteness <= 4 ? 'Medium rural town' : remoteness <= 5 ? 'Small rural town' : remoteness <= 6 ? 'Remote community' : 'Very remote')}`
      : 'No data',
    source: 'ABS Modified Monash Model 2023',
    vintage: '2023',
    percentile: percentileOf('remoteness', remoteness),
  });

  // Housing stress
  const housingStress = d.census?.housing_stress ?? null;
  chars.push({
    key: 'housing_stress',
    label: 'Housing stress',
    value: housingStress,
    formatted: housingStress !== null ? `${Math.round(housingStress * 100)}% of households` : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('housing_stress', housingStress),
  });

  // Solar penetration — require minimum installations to be meaningful
  const solarInstallations = d.solar?.installations ?? 0;
  const solarKw = (solarInstallations >= 10 && d.solar?.capacity_kw != null)
    ? d.solar.capacity_kw
    : null;
  chars.push({
    key: 'solar_penetration',
    label: 'Solar capacity',
    value: solarKw,
    formatted: solarKw !== null
      ? `${Math.round(solarKw).toLocaleString()} kW installed`
      : (solarInstallations > 0 && solarInstallations < 10)
        ? `Insufficient data (${solarInstallations} installations)`
        : 'No data',
    source: 'Clean Energy Regulator',
    vintage: '2024',
    percentile: percentileOf('solar_battery_penetration', solarKw),
  });

  // SEIFA
  const seifa = d.seifa?.irsd_score ?? null;
  chars.push({
    key: 'seifa_irsd',
    label: 'Economic disadvantage',
    value: seifa,
    formatted: seifa !== null
      ? `${seifa >= 8 ? 'Least disadvantaged areas nationally' : seifa >= 6 ? 'Above average' : seifa >= 4 ? 'Below average' : 'Among most disadvantaged areas nationally'}`
      : 'No data',
    source: 'ABS SEIFA 2021',
    vintage: '2021',
    percentile: percentileOf('seifa_irsd', seifa),
  });

  // Median income
  const income = d.census?.median_income ?? null;
  chars.push({
    key: 'median_income',
    label: 'Median household income',
    value: income,
    formatted: income !== null ? `$${Math.round(income).toLocaleString()}/week` : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('median_household_income', income),
  });

  // Transport diversity (Shannon) — same fix as industry diversity.
  // Uses computeShannonDiversity to match reference population. (SPEC-005 R1)
  const transportDiv = (d.census?.commute_mode_counts && Object.keys(d.census.commute_mode_counts).length > 0)
    ? computeShannonDiversity(d.census.commute_mode_counts)
    : null;
  chars.push({
    key: 'transport_diversity',
    label: 'Transport options',
    value: transportDiv,
    formatted: transportDiv !== null
      ? `${transportDiv > 1.7 ? 'Commuters use a mix of transport modes' : transportDiv > 1.0 ? 'Some commuters use alternatives to driving' : 'Most commuters rely on private car'}`
      : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('transport_mode_diversity', transportDiv),
  });

  // Internet connectivity
  const internet = d.census?.internet_pct ?? null;
  chars.push({
    key: 'internet',
    label: 'Internet access',
    value: internet,
    formatted: internet !== null ? `${Math.round(internet * 100)}% of dwellings` : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('internet_connectivity', internet),
  });

  // ── Vulnerability concentration (SPEC-004) ──────────────────────────────

  const age65 = d.census?.age_65_plus_pct ?? null;
  chars.push({
    key: 'age_65_plus',
    label: 'Residents aged 65+',
    value: age65,
    formatted: age65 !== null ? `${Math.round(age65 * 100)}% of population` : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('age_65_plus', age65),
  });

  const age80 = d.census?.age_80_plus_pct ?? null;
  chars.push({
    key: 'age_80_plus',
    label: 'Residents aged 80+',
    value: age80,
    formatted: age80 !== null ? `${Math.round(age80 * 100)}% of population` : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('age_80_plus', age80),
  });

  const needAssist = d.census?.need_assistance_pct ?? null;
  chars.push({
    key: 'need_assistance',
    label: 'Need assistance with daily activities',
    value: needAssist,
    formatted: needAssist !== null ? `${Math.round(needAssist * 100)}% of population` : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('need_assistance', needAssist),
  });

  const lonePerson = d.census?.lone_person_pct ?? null;
  chars.push({
    key: 'lone_person',
    label: 'People living alone',
    value: lonePerson,
    formatted: lonePerson !== null ? `${Math.round(lonePerson * 100)}% of households` : 'No data',
    source: 'ABS Census 2021',
    vintage: '2021',
    percentile: percentileOf('lone_person', lonePerson),
  });

  return chars;
}

// ── Exposure weight computation (SPEC-003 ADR-012: algorithmic, not LLM) ─────

function computeExposures(chars: StructuralCharacteristic[]): ExposureWeight[] {
  const get = (key: string): number | null =>
    chars.find((c) => c.key === key)?.value ?? null;

  const exposures: ExposureWeight[] = [];

  // Shared structural values used across multiple domains
  const remoteness = get('remoteness');
  const seifaIrsd = get('seifa_irsd');

  // Fuel exposure
  const carDep = get('car_dependency');
  let fuelWeight = 0.3; // baseline — everyone uses fuel
  let fuelReasons: string[] = [];
  if (carDep !== null && carDep > 0.6) {
    fuelWeight += 0.3;
    fuelReasons.push(`${Math.round(carDep * 100)}% car dependency`);
  } else if (carDep !== null && carDep > 0.4) {
    fuelWeight += 0.15;
    fuelReasons.push(`${Math.round(carDep * 100)}% car dependency`);
  }
  if (remoteness !== null && remoteness >= 5) {
    fuelWeight += 0.3;
    fuelReasons.push('remote location — longer fuel supply chains');
  } else if (remoteness !== null && remoteness >= 3) {
    fuelWeight += 0.15;
    fuelReasons.push('regional location — supply chain distance');
  }
  exposures.push({
    domain: 'fuel',
    label: 'Fuel & transport',
    weight: Math.min(1, fuelWeight),
    reason: fuelReasons.length > 0
      ? `High exposure: ${fuelReasons.join(', ')}`
      : 'Baseline fuel dependency',
    signalKeys: ['brentCrude', 'crackSpread', 'dieselTgp', 'waFuel', 'nswFuel', 'reserves', 'stationAvailability'],
  });

  // Food & grocery costs — consumption-first framing
  // Primary question: "how much does it hurt when food prices move?"
  const foodIncome = get('median_income');
  const agPct = get('agricultural_workforce');
  let foodWeight = 0.25; // higher baseline — everyone eats
  let foodReasons: string[] = [];

  // Income is the primary driver — lower income = larger budget share on food
  if (foodIncome !== null) {
    if (foodIncome < 600) {
      foodWeight += 0.3;
      foodReasons.push('low income — food takes a larger share of household budget');
    } else if (foodIncome < 1000) {
      // Gradient: $600 → +0.3, $1000 → +0.05
      const contrib = 0.3 - (foodIncome - 600) * (0.25 / 400);
      foodWeight += contrib;
      foodReasons.push('moderate income — food costs are a meaningful budget share');
    }
  }

  // Remoteness — supply chain distance, fewer retailers, higher shelf prices
  if (remoteness !== null) {
    if (remoteness >= 5) {
      foodWeight += 0.25;
      foodReasons.push('remote — longer supply chains, fewer retailers, higher prices');
    } else if (remoteness >= 3) {
      // Gradient: 3 → +0.08, 5 → +0.25
      foodWeight += 0.08 + (remoteness - 3) * (0.17 / 2);
      foodReasons.push('regional — some supply chain distance');
    }
  }

  // SEIFA — compounding disadvantage reduces household buffer
  if (seifaIrsd !== null && seifaIrsd <= 3) {
    foodWeight += 0.1;
    foodReasons.push('higher socioeconomic disadvantage — less buffer for price rises');
  }

  // Agricultural workforce — local economy exposure to food system disruption
  if (agPct !== null && agPct > 0.1) {
    foodWeight += 0.15;
    foodReasons.push(`${Math.round(agPct * 100)}% agricultural workforce — local economy tied to food system`);
  } else if (agPct !== null && agPct > 0.05) {
    foodWeight += 0.08;
    foodReasons.push(`${Math.round(agPct * 100)}% agricultural workforce`);
  }

  exposures.push({
    domain: 'food',
    label: 'Food & grocery costs',
    weight: Math.min(1, foodWeight),
    reason: foodReasons.length > 0
      ? foodReasons.join('. ') + '.'
      : 'Standard food cost exposure',
    signalKeys: ['asxFood', 'farmInputs', 'abaresFertiliser', 'foodBasket', 'supermarketPrices'],
  });

  // Electricity exposure — gradient based on solar capacity
  // Missing data defaults to vulnerability, not resilience. (SPEC-005 R3.4)
  const solar = get('solar_penetration');
  let elecWeight = 0.2;
  let elecReasons: string[] = [];
  if (solar === null) {
    elecWeight += 0.35;
    elecReasons.push('no solar data — assumed grid dependent');
  } else if (solar < 200) {
    elecWeight += 0.35;
    elecReasons.push('very low solar capacity — heavily grid dependent');
  } else if (solar < 1000) {
    // Linear gradient: 200kW → +0.3, 1000kW → +0.05
    elecWeight += 0.3 - (solar - 200) * (0.25 / 800);
    elecReasons.push('limited solar capacity — mostly grid dependent');
  } else if (solar > 5000) {
    elecWeight -= 0.1;
    elecReasons.push('strong solar capacity');
  }
  exposures.push({
    domain: 'electricity',
    label: 'Electricity & grid',
    weight: Math.max(0, Math.min(1, elecWeight)),
    reason: elecReasons.length > 0
      ? elecReasons.join(', ')
      : 'Standard grid dependency',
    signalKeys: ['aemoElectricity'],
  });

  // Economic pressure — gradient on housing stress + income
  const housingStress = get('housing_stress');
  const income = get('median_income');
  let econWeight = 0.2;
  let econReasons: string[] = [];
  if (housingStress !== null) {
    if (housingStress > 0.35) {
      econWeight += 0.3;
      econReasons.push(`${Math.round(housingStress * 100)}% housing stress`);
    } else if (housingStress > 0.2) {
      // Gradient: 20% → +0.05, 35% → +0.3
      const contrib = 0.05 + (housingStress - 0.2) * (0.25 / 0.15);
      econWeight += contrib;
      econReasons.push(`${Math.round(housingStress * 100)}% housing stress`);
    }
  }
  if (income !== null) {
    if (income < 800) {
      econWeight += 0.25;
      econReasons.push('low median income');
    } else if (income < 1200) {
      // Gradient: $800 → +0.25, $1200 → +0.05
      const contrib = 0.25 - (income - 800) * (0.2 / 400);
      econWeight += contrib;
      econReasons.push('lower median income');
    }
  }
  exposures.push({
    domain: 'economic',
    label: 'Economic pressure',
    weight: Math.min(1, econWeight),
    reason: econReasons.length > 0
      ? `Elevated: ${econReasons.join(', ')}`
      : 'Standard economic exposure',
    signalKeys: ['rbaCashRate', 'audUsd', 'asxEnergy'],
  });

  // Housing — gradient on housing stress + SEIFA as secondary driver
  let housingWeight = 0.1;
  let housingReasons: string[] = [];
  if (housingStress !== null) {
    if (housingStress > 0.35) {
      housingWeight += 0.4;
      housingReasons.push(`${Math.round(housingStress * 100)}% of households in housing stress`);
    } else if (housingStress > 0.2) {
      // Gradient: 20% → +0.05, 35% → +0.4
      const contrib = 0.05 + (housingStress - 0.2) * (0.35 / 0.15);
      housingWeight += contrib;
      housingReasons.push(`${Math.round(housingStress * 100)}% housing cost-to-income ratio`);
    }
  }
  if (seifaIrsd !== null && seifaIrsd <= 3) {
    housingWeight += 0.1;
    housingReasons.push('higher socioeconomic disadvantage');
  }
  exposures.push({
    domain: 'housing',
    label: 'Housing affordability',
    weight: Math.min(1, housingWeight),
    reason: housingReasons.length > 0
      ? `Pressure: ${housingReasons.join(', ')}`
      : 'Manageable housing costs',
    signalKeys: ['rbaCashRate'],
  });

  // Emergency — gradient on remoteness + elderly population as secondary
  let emerWeight = 0.1;
  let emerReasons: string[] = [];
  if (remoteness !== null) {
    if (remoteness >= 5) {
      emerWeight += 0.3;
      emerReasons.push('remote — fewer emergency options');
    } else if (remoteness >= 3) {
      // Gradient: 3 → +0.1, 5 → +0.3
      emerWeight += 0.1 + (remoteness - 3) * (0.2 / 2);
      emerReasons.push('regional — some distance from major services');
    }
  }
  const lonePersonPct = get('lone_person');
  if (lonePersonPct !== null && lonePersonPct > 0.3) {
    emerWeight += 0.1;
    emerReasons.push(`${Math.round(lonePersonPct * 100)}% living alone — fewer household resources in emergencies`);
  }
  exposures.push({
    domain: 'emergency',
    label: 'Emergency preparedness',
    weight: Math.min(1, emerWeight),
    reason: emerReasons.length > 0
      ? emerReasons.join(', ')
      : 'Standard emergency access',
    signalKeys: ['nswRfs', 'vicEmv'],
  });

  // ── Vulnerability amplification (SPEC-004) ──────────────────────────────
  // High elderly proportion intensifies existing exposures — fixed incomes
  // have less buffer, mobility constraints compound fuel/food access issues.
  const age65 = get('age_65_plus');
  const needAssist = get('need_assistance');
  if (age65 !== null && age65 > 0.20) {
    const amplifier = Math.min(1.5, 1 + (age65 - 0.16) * 2);
    for (const exp of exposures) {
      if (['fuel', 'food', 'emergency'].includes(exp.domain)) {
        exp.weight = Math.min(1, exp.weight * amplifier);
        exp.reason += ` (amplified: ${Math.round(age65 * 100)}% over-65 on fixed incomes)`;
      }
    }
  }
  if (needAssist !== null && needAssist > 0.06) {
    for (const exp of exposures) {
      if (exp.domain === 'emergency') {
        exp.weight = Math.min(1, exp.weight * 1.3);
        exp.reason += ` (${Math.round(needAssist * 100)}% need daily assistance)`;
      }
    }
  }

  return exposures.sort((a, b) => b.weight - a.weight);
}

// ── Contextualised signal generation (SPEC-003 ADR-013: templates) ───────────

function contextualiseSignals(
  chars: StructuralCharacteristic[],
  exposures: ExposureWeight[],
): ContextualisedSignal[] {
  const get = (key: string): number | null =>
    chars.find((c) => c.key === key)?.value ?? null;
  const fmt = (key: string): string =>
    chars.find((c) => c.key === key)?.formatted ?? '';

  const signals: ContextualisedSignal[] = [];

  const carDep = get('car_dependency');
  const agPct = get('agricultural_workforce');
  const housingStress = get('housing_stress');
  const solar = get('solar_penetration');
  const remoteness = get('remoteness');

  // Brent crude
  const fuelExposure = exposures.find((e) => e.domain === 'fuel')?.weight ?? 0.3;
  if (fuelExposure > 0.4) {
    signals.push({
      key: 'brentCrude',
      domain: 'fuel',
      relevance: fuelExposure,
      context: `Your community has ${carDep !== null ? `${Math.round(carDep * 100)}%` : 'significant'} car dependency. Crude oil price movements flow through to your fuel costs, typically within 2-4 weeks.`,
    });
  }

  // Crack spread
  if (fuelExposure > 0.5) {
    signals.push({
      key: 'crackSpread',
      domain: 'fuel',
      relevance: fuelExposure * 0.9,
      context: `The gap between crude oil costs and refined fuel prices affects how much of a crude price change reaches the bowser. When refining margins widen, pump prices rise faster than crude.`,
    });
  }

  // Diesel wholesale TGP — Layer 3, always relevant for fuel-exposed communities
  if (fuelExposure > 0.3) {
    signals.push({
      key: 'dieselTgp',
      domain: 'fuel',
      relevance: fuelExposure * 0.95,
      context: `The wholesale price retailers pay before adding their margin. When wholesale prices rise, pump prices follow within days.`,
    });
  }

  // Fuel reserves
  signals.push({
    key: 'reserves',
    domain: 'fuel',
    relevance: fuelExposure * 0.8,
    context: `Australia holds less than the IEA-recommended 90 days of fuel reserves. These are headline MSO figures — actual onshore controllable reserves are materially lower.`,
  });

  // ASX food
  const foodExposure = exposures.find((e) => e.domain === 'food')?.weight ?? 0.2;
  if (foodExposure > 0.3) {
    signals.push({
      key: 'asxFood',
      domain: 'food',
      relevance: foodExposure,
      context: agPct !== null && agPct > 0.1
        ? `With ${Math.round(agPct * 100)}% of workers in agriculture, your community's economy is directly tied to food and agriculture markets. These equities reflect investor sentiment about the sector's health.`
        : `Food supply chain pressures flow through to retail prices. Remote and regional communities typically feel price increases earlier and harder.`,
    });
  }

  // Food basket — relevant for all communities, weighted by food exposure
  signals.push({
    key: 'foodBasket',
    domain: 'food',
    relevance: foodExposure * 0.85,
    context: remoteness !== null && remoteness >= 5
      ? `Remote communities face higher food prices due to transport costs. When food CPI rises nationally, the impact is amplified in areas with longer supply chains and fewer retail options.`
      : `Food price changes by category — bread, meat, dairy, fruit and vegetables — show where household budgets are under most pressure. Sub-group breakdowns reveal which items are driving overall inflation.`,
  });

  // Supermarket shelf prices — scraped retailer prices vs baseline
  if (foodExposure > 0.25) {
    signals.push({
      key: 'supermarketPrices',
      domain: 'food',
      relevance: foodExposure * 0.9,
      context: remoteness !== null && remoteness >= 3
        ? `Shelf prices at major supermarkets compared to a Dec 2025 baseline. Regional communities often see price rises earlier and with less retailer competition to moderate them.`
        : `Real shelf prices at Coles and Woolworths compared to a Dec 2025 baseline. Shows which product categories are moving and by how much — the closest thing to what you actually see at the checkout.`,
    });
  }

  // Farm inputs
  if (agPct !== null && agPct > 0.05) {
    signals.push({
      key: 'farmInputs',
      domain: 'food',
      relevance: foodExposure * 0.9,
      context: `Farm input costs (fertiliser, fuel, chemicals) directly affect your community's agricultural sector. Rising input costs squeeze farm margins and flow through to local employment and spending.`,
    });
  }

  // AEMO electricity
  const elecExposure = exposures.find((e) => e.domain === 'electricity')?.weight ?? 0.2;
  signals.push({
    key: 'aemoElectricity',
    domain: 'electricity',
    relevance: elecExposure,
    context: solar !== null && solar < 500
      ? `With limited local solar capacity (${Math.round(solar)} kW installed), your community is more dependent on the grid. Wholesale electricity price spikes flow through to bills.`
      : solar !== null && solar > 5000
        ? `Your community has strong solar capacity (${Math.round(solar).toLocaleString()} kW), providing some buffer against grid price spikes. But grid dependency remains for evening peaks.`
        : `Wholesale electricity prices affect household and business costs, with spikes during extreme weather or supply shortages.`,
  });

  // RBA cash rate
  const econExposure = exposures.find((e) => e.domain === 'economic')?.weight ?? 0.2;
  if (housingStress !== null && housingStress > 0.2) {
    signals.push({
      key: 'rbaCashRate',
      domain: 'economic',
      relevance: econExposure,
      context: `With ${Math.round(housingStress * 100)}% of households in housing stress, rate changes compound existing pressure. Each 0.25% rate rise adds roughly $75-100/month on a typical mortgage.`,
    });
  }

  // AUD/USD
  if (fuelExposure > 0.4 || foodExposure > 0.3) {
    signals.push({
      key: 'audUsd',
      domain: 'economic',
      relevance: 0.3,
      context: `A falling Australian dollar makes imported fuel and fertiliser more expensive. This amplifies upstream price pressures before they reach your community.`,
    });
  }

  // Emergency feeds — state-specific
  if (remoteness !== null && remoteness >= 3) {
    signals.push({
      key: 'nswRfs',
      domain: 'emergency',
      relevance: 0.3,
      context: `Active emergency incidents in your region can disrupt supply routes and increase demand for fuel and essential goods.`,
    });
    signals.push({
      key: 'vicEmv',
      domain: 'emergency',
      relevance: 0.3,
      context: `Emergency incidents affect road access and supply logistics. Regional communities have fewer alternative routes.`,
    });
  }

  return signals.sort((a, b) => b.relevance - a.relevance);
}

// ── Cascade timeline estimates ───────────────────────────────────────────────

function computeCascade(chars: StructuralCharacteristic[]): CascadeEstimate[] {
  const remoteness = chars.find((c) => c.key === 'remoteness')?.value ?? null;
  const isRemote = remoteness !== null && remoteness >= 5;
  const isRegional = remoteness !== null && remoteness >= 3;

  return [
    {
      domain: 'fuel',
      label: 'Crude oil to bowser',
      estimate: isRemote ? '3-6 weeks' : isRegional ? '2-4 weeks' : '1-3 weeks',
      description: `Global crude price changes flow through refining, distribution, and retail margins before reaching the pump${isRemote ? '. Remote communities face additional transport lag and fewer competitive pressures to pass on decreases' : ''}.`,
    },
    {
      domain: 'food',
      label: 'Farm inputs to food prices',
      estimate: isRemote ? '2-4 months' : '1-3 months',
      description: `Rising fertiliser, fuel, and chemical costs increase production costs. These flow through to wholesale, then retail food prices${isRegional ? '. Regional supply chains have fewer intermediaries, so impacts can be faster but also more direct' : ''}.`,
    },
    {
      domain: 'electricity',
      label: 'Wholesale to retail electricity',
      estimate: '1-3 months',
      description: 'Wholesale price spikes are smoothed by contract structures, but sustained increases flow through to quarterly bills. Demand charges can spike immediately during extreme events.',
    },
    {
      domain: 'economic',
      label: 'Rate changes to household budgets',
      estimate: '1-2 months',
      description: 'Variable rate mortgages adjust within weeks. Fixed rates roll over at renewal. Flow-on effects to spending, employment, and local business take longer to materialise.',
    },
  ];
}

// ── Diversity spectrum (coherence/entrainment) ───────────────────────────────

function computeDiversitySpectrum(chars: StructuralCharacteristic[]): DiversitySpectrum[] {
  const spectra: DiversitySpectrum[] = [];

  // Spectrum position uses absolute thresholds, but percentile can upgrade:
  // if a community is in the top 20% nationally, theoretical maximums shouldn't
  // hold it at "moderate" when it's among the most diversified in reality.
  function resolvePosition(
    absolutePos: 'entrained' | 'mixed' | 'coherent',
    percentile: number | null,
  ): 'entrained' | 'mixed' | 'coherent' {
    if (percentile === null) return absolutePos;
    if (percentile >= 0.8 && absolutePos !== 'coherent') return 'coherent';
    if (percentile >= 0.5 && absolutePos === 'entrained') return 'mixed';
    return absolutePos;
  }

  const industryDiv = chars.find((c) => c.key === 'industry_diversity');
  if (industryDiv?.value !== null && industryDiv?.value !== undefined) {
    const v = industryDiv.value;
    const pctl = industryDiv.percentile;
    // Thresholds calibrated for natural log (ln). ln(19 ANZSIC) ≈ 2.94 max.
    const absPos = v > 2.1 ? 'coherent' as const : v > 1.4 ? 'mixed' as const : 'entrained' as const;
    const pos = resolvePosition(absPos, pctl);
    spectra.push({
      label: 'Industry diversity',
      value: v,
      percentile: pctl,
      interpretation: pos === 'coherent'
        ? 'Diversified economy — multiple sectors can absorb shocks independently'
        : pos === 'mixed'
          ? 'Moderate diversity — some capacity to absorb sector-specific shocks'
          : 'Concentrated economy — a downturn in the dominant industry affects everything',
      spectrumPosition: pos,
    });
  }

  const transportDiv = chars.find((c) => c.key === 'transport_diversity');
  if (transportDiv?.value !== null && transportDiv?.value !== undefined) {
    const v = transportDiv.value;
    const pctl = transportDiv.percentile;
    // Thresholds calibrated for natural log (ln). ln(8 modes) ≈ 2.08 max.
    const absPos = v > 1.7 ? 'coherent' as const : v > 1.0 ? 'mixed' as const : 'entrained' as const;
    const pos = resolvePosition(absPos, pctl);
    spectra.push({
      label: 'Transport diversity',
      value: v,
      percentile: pctl,
      interpretation: pos === 'coherent'
        ? 'Multiple transport options — community can adapt if one mode is disrupted'
        : pos === 'mixed'
          ? 'Some transport alternatives, but most commuters rely on one mode'
          : 'Limited transport options — high dependency on a single mode (likely private car)',
      spectrumPosition: pos,
    });
  }

  return spectra;
}

// ── Profile-driven action engine ─────────────────────────────────────────────

/** Action templates keyed by domain + structural driver */
const ACTION_TEMPLATES: Array<{
  domain: ExposureDomain;
  condition: (chars: StructuralCharacteristic[]) => boolean;
  driver: (chars: StructuralCharacteristic[]) => string;
  category: ActionCategory;
  urgency: ActionUrgency;
  title: string;
  description: (chars: StructuralCharacteristic[]) => string;
  baseScore: number;
  guideLink: string;
}> = [
  // ── Fuel ──
  {
    domain: 'fuel',
    condition: (c) => (val(c, 'car_dependency') ?? 0) > 0.6,
    driver: (c) => `${Math.round((val(c, 'car_dependency') ?? 0) * 100)}% car dependency`,
    category: 'household',
    urgency: 'now',
    title: 'Build a fuel buffer',
    description: (c) => `With ${Math.round((val(c, 'car_dependency') ?? 0) * 100)}% of commuters driving, your community is directly exposed to fuel price spikes. Keep your tank above half. Know where the nearest three fuel stations are and their typical price difference.`,
    baseScore: 0.8,
    guideLink: '/guide#gather',
  },
  {
    domain: 'fuel',
    condition: (c) => (val(c, 'car_dependency') ?? 0) > 0.5,
    driver: (c) => `high car dependency + limited transport options`,
    category: 'community',
    urgency: 'this_month',
    title: 'Start a carpool or transport roster',
    description: () => `Talk to neighbours about shared school runs, shopping trips, or work commutes. A simple roster on a shared group chat can cut fuel costs 30-40% for participants. Start with one route.`,
    baseScore: 0.65,
    guideLink: '/guide#resource-map',
  },
  {
    domain: 'fuel',
    condition: (c) => (val(c, 'remoteness') ?? 0) >= 4,
    driver: (c) => 'regional/remote location — longer fuel supply chains',
    category: 'community',
    urgency: 'this_month',
    title: 'Coordinate bulk fuel purchasing',
    description: () => `Regional and remote communities pay a premium for every litre due to longer supply chains. Coordinated bulk orders or community fuel days can reduce per-litre costs and build local relationships.`,
    baseScore: 0.7,
    guideLink: '/guide#shared-resources',
  },
  // ── Food ──
  // SPEC-005 v0.2.0 design decision: consumption-first for urban (remoteness <= 2),
  // production-focused actions can lead for regional/remote (remoteness >= 3).
  // Urban consumers have retailer choice and community food programs nearby;
  // regional/remote communities benefit more from local production and direct channels.
  {
    domain: 'food',
    condition: (c) => (val(c, 'remoteness') ?? 1) <= 2,
    driver: () => 'urban location — consumption exposure',
    category: 'household',
    urgency: 'now',
    title: 'Review your grocery budget and compare retailers',
    description: () => `Track what you spend on groceries for two weeks. Compare prices across Coles, Woolworths, Aldi, and local independent grocers — price gaps on staples can be 15-25%. Check community food programs, food rescue organisations, and bulk-buy co-ops in your area. Small shifts in where and how you shop compound over months.`,
    baseScore: 0.75,
    guideLink: '/guide#gather',
  },
  {
    domain: 'food',
    condition: (c) => (val(c, 'agricultural_workforce') ?? 0) > 0.1,
    driver: (c) => `${Math.round((val(c, 'agricultural_workforce') ?? 0) * 100)}% agricultural workforce`,
    category: 'community',
    urgency: 'this_month',
    title: 'Build farmer-to-community channels',
    description: () => `Your community has significant agricultural capacity. Direct farm-to-table relationships reduce supply chain exposure and keep money local. Explore a community-supported agriculture (CSA) arrangement or regular farm gate sales.`,
    // Lower base score for urban postcodes; computeActions multiplies by exposure weight,
    // so this naturally ranks below the consumption action in cities but can lead in
    // regional/remote areas where food exposure weight is amplified.
    baseScore: 0.6,
    guideLink: '/guide#food-network',
  },
  {
    domain: 'food',
    condition: (c) => (val(c, 'remoteness') ?? 0) >= 5,
    driver: () => 'remote location — long supply chains',
    category: 'household',
    urgency: 'now',
    title: 'Build a two-week pantry buffer',
    description: () => `Remote communities are first to feel supply chain disruptions and last to recover. Keep two weeks of non-perishable staples on hand. Rotate stock. Know what grows locally and who grows it.`,
    baseScore: 0.75,
    guideLink: '/guide#gather',
  },
  {
    domain: 'food',
    condition: (c) => (val(c, 'remoteness') ?? 0) >= 3 && (val(c, 'remoteness') ?? 0) < 5,
    driver: () => 'regional location',
    category: 'community',
    urgency: 'ongoing',
    title: 'Map local food sources',
    description: () => `Know where food comes from near you — community gardens, local farms, food co-ops, food banks. Map them. Share the map. When supply chains are disrupted, local sources become critical.`,
    baseScore: 0.55,
    guideLink: '/guide#resource-map',
  },
  // ── Economic ──
  {
    domain: 'economic',
    condition: (c) => (val(c, 'housing_stress') ?? 0) > 0.3,
    driver: (c) => `${Math.round((val(c, 'housing_stress') ?? 0) * 100)}% housing stress`,
    category: 'household',
    urgency: 'now',
    title: 'Stress-test your household budget',
    description: (c) => `With ${Math.round((val(c, 'housing_stress') ?? 0) * 100)}% of households in housing stress, rate changes hit hard. Model what happens to your budget if rates rise another 0.5%. Identify which expenses can flex and which can't. Talk to your lender before you're in trouble, not after.`,
    baseScore: 0.8,
    guideLink: '/guide#gather',
  },
  {
    domain: 'economic',
    condition: (c) => (val(c, 'median_income') ?? Infinity) < 1200,
    driver: () => 'lower median income',
    category: 'community',
    urgency: 'this_month',
    title: 'Set up a mutual aid fund or skills exchange',
    description: () => `A community mutual aid fund doesn't need to be large — even small amounts pooled together create a safety net. Pair it with a skills exchange: plumbing for childcare, tutoring for garden help. The currency is trust.`,
    baseScore: 0.65,
    guideLink: '/guide#gather',
  },
  // ── Electricity ──
  {
    domain: 'electricity',
    condition: (c) => (val(c, 'solar_penetration') ?? 0) < 500,
    driver: () => 'low solar capacity — grid dependent',
    category: 'household',
    urgency: 'this_month',
    title: 'Assess solar and battery options',
    description: () => `Your area has low solar uptake, meaning high grid dependency. Even a small system reduces exposure to wholesale price spikes. Check state rebates, community bulk-buy schemes, and rental options if you don't own.`,
    baseScore: 0.55,
    guideLink: '/guide#energy-transport',
  },
  {
    domain: 'electricity',
    condition: () => true, // universal
    driver: () => 'grid dependency',
    category: 'household',
    urgency: 'ongoing',
    title: 'Shift high-draw activities off peak',
    description: () => `Run dishwashers, washing machines, and pool pumps outside 4-8pm. This reduces your bill and eases grid stress during price spikes. Set timers if your appliances support it.`,
    baseScore: 0.3,
    guideLink: '/guide#gather',
  },
  // ── Housing ──
  {
    domain: 'housing',
    condition: (c) => (val(c, 'housing_stress') ?? 0) > 0.3,
    driver: (c) => `${Math.round((val(c, 'housing_stress') ?? 0) * 100)}% housing stress`,
    category: 'advocacy',
    urgency: 'ongoing',
    title: 'Advocate for housing affordability measures',
    description: () => `High housing stress is structural — it needs structural responses. Engage with local council on affordable housing targets, planning reform, and renter protections. Community voice is the lever.`,
    baseScore: 0.5,
    guideLink: '/guide#advocate',
  },
  // ── Emergency ──
  {
    domain: 'emergency',
    condition: (c) => (val(c, 'remoteness') ?? 0) >= 4,
    driver: () => 'remote — limited emergency access',
    category: 'community',
    urgency: 'this_month',
    title: 'Build a community emergency plan',
    description: () => `Remote communities can't rely on rapid external response. Know who has first aid training, generator access, satellite phones, and water storage. Create a communication tree that works when mobile networks don't.`,
    baseScore: 0.75,
    guideLink: '/guide#resource-map',
  },
  {
    domain: 'emergency',
    condition: () => true,
    driver: () => 'baseline preparedness',
    category: 'household',
    urgency: 'ongoing',
    title: 'Maintain a household emergency kit',
    description: () => `Water (3L per person per day for 3 days), torch, battery radio, first aid, medications, phone charger, cash, copies of key documents. Check every 6 months.`,
    baseScore: 0.25,
    guideLink: '/guide#gather',
  },
  // ── Diversity / entrainment ──
  {
    domain: 'economic',
    condition: (c) => {
      const id = val(c, 'industry_diversity');
      return id !== null && id < 1.4; // natural log threshold (was 2 in log2)
    },
    driver: () => 'concentrated economy — entrainment risk',
    category: 'advocacy',
    urgency: 'ongoing',
    title: 'Advocate for economic diversification',
    description: (c) => {
      const id = val(c, 'industry_diversity');
      return `Your community's economy is concentrated (Shannon index ${id !== null ? id.toFixed(2) : 'low'}). When the dominant industry contracts, everything contracts together. Support local entrepreneurship, attract complementary industries, and invest in skills that transfer across sectors.`;
    },
    baseScore: 0.6,
    guideLink: '/guide#advocate',
  },
  // ── Vulnerability concentration (SPEC-004) ──
  {
    domain: 'emergency',
    condition: (c) => (val(c, 'age_65_plus') ?? 0) > 0.20,
    driver: (c) => `${Math.round((val(c, 'age_65_plus') ?? 0) * 100)}% residents over 65`,
    category: 'community',
    urgency: 'this_month',
    title: 'Know your vulnerable neighbours',
    description: (c) => `${Math.round((val(c, 'age_65_plus') ?? 0) * 100)}% of this community is over 65. In a crisis, these are the people who need a knock on the door. Start with your street. Do you know who lives alone? Who can't drive? Who depends on delivered medications?`,
    baseScore: 0.75,
    guideLink: '/guide#connect-neighbours',
  },
  {
    domain: 'emergency',
    condition: (c) => (val(c, 'age_65_plus') ?? 0) > 0.20 && (val(c, 'lone_person') ?? 0) > 0.25,
    driver: (c) => `high elderly + ${Math.round((val(c, 'lone_person') ?? 0) * 100)}% living alone`,
    category: 'community',
    urgency: 'this_month',
    title: 'Set up a heatwave and outage check-in roster',
    description: () => `When the power goes out or temperatures spike, people living alone are most at risk. A simple phone tree or street-level check-in roster means someone notices. Set one up before summer.`,
    baseScore: 0.7,
    guideLink: '/guide#resource-map',
  },
  {
    domain: 'emergency',
    condition: (c) => (val(c, 'age_80_plus') ?? 0) > 0.05 && (val(c, 'remoteness') ?? 0) >= 3,
    driver: (c) => `${Math.round((val(c, 'age_80_plus') ?? 0) * 100)}% over 80 in a regional/remote area`,
    category: 'community',
    urgency: 'now',
    title: 'Map medication and mobility dependencies',
    description: () => `People over 80 in regional areas depend on medication deliveries, community transport, and home care services that fail silently during supply disruptions. Know who depends on what. A disruption to pharmacy deliveries is invisible until someone runs out.`,
    baseScore: 0.8,
    guideLink: '/guide#resource-map',
  },
  {
    domain: 'fuel',
    condition: (c) => (val(c, 'age_65_plus') ?? 0) > 0.20 && (val(c, 'car_dependency') ?? 0) > 0.5,
    driver: (c) => `${Math.round((val(c, 'age_65_plus') ?? 0) * 100)}% over 65 + ${Math.round((val(c, 'car_dependency') ?? 0) * 100)}% car dependency`,
    category: 'community',
    urgency: 'this_month',
    title: 'Coordinate community transport for isolated elderly',
    description: () => `In car-dependent communities with a high elderly population, fuel price spikes hit hardest — many older residents are on fixed incomes and can't absorb the increase. A volunteer transport roster for medical appointments and shopping trips builds the ties that matter in a crisis.`,
    baseScore: 0.7,
    guideLink: '/guide#shared-resources',
  },
];

function val(chars: StructuralCharacteristic[], key: string): number | null {
  return chars.find((c) => c.key === key)?.value ?? null;
}

function computeActions(
  chars: StructuralCharacteristic[],
  exposures: ExposureWeight[],
  diversity: DiversitySpectrum[],
): ProfileAction[] {
  // Entrainment penalty: increases urgency for entrained communities
  let entrainmentPenalty = 0;
  for (const d of diversity) {
    if (d.spectrumPosition === 'entrained') entrainmentPenalty = Math.max(entrainmentPenalty, 0.3);
    else if (d.spectrumPosition === 'mixed') entrainmentPenalty = Math.max(entrainmentPenalty, 0.15);
  }

  const actions: ProfileAction[] = [];

  for (const template of ACTION_TEMPLATES) {
    if (!template.condition(chars)) continue;

    const exposureWeight = exposures.find((e) => e.domain === template.domain)?.weight ?? 0.2;
    const score = template.baseScore * exposureWeight * (1 + entrainmentPenalty);

    actions.push({
      title: template.title,
      description: template.description(chars),
      category: template.category,
      urgency: template.urgency,
      domain: template.domain,
      driver: template.driver(chars),
      score,
      guideLink: template.guideLink,
    });
  }

  return actions.sort((a, b) => b.score - a.score);
}

// ── Main profile builder ─────────────────────────────────────────────────────

export function buildProfile(postcode: string): ExposureProfile {
  const { localities } = getCachedData();

  // Extract structural characteristics
  const structural = extractStructural(postcode);
  const available = structural.filter((c) => c.value !== null).length;

  // Compute exposure weights from structural data
  const exposures = computeExposures(structural);

  // Generate contextualised signal recommendations
  const signals = contextualiseSignals(structural, exposures);

  // Cascade timeline estimates
  const cascade = computeCascade(structural);

  // Diversity spectrum
  const diversity = computeDiversitySpectrum(structural);

  // Profile-driven actions
  const actions = computeActions(structural, exposures, diversity);

  // Preserve full scoring (secondary)
  const scoring = scorePostcode(postcode);

  // State from postcode
  const num = parseInt(postcode, 10);
  let state = 'Unknown';
  if (num >= 2600 && num <= 2618) state = 'ACT';
  else if (num >= 2900 && num <= 2920) state = 'ACT';
  else if (num >= 800 && num <= 899) state = 'NT';
  else if (num >= 900 && num <= 999) state = 'NT';
  else if (num >= 2000 && num <= 2999) state = 'NSW';
  else if (num >= 1000 && num <= 1999) state = 'NSW';
  else if (num >= 3000 && num <= 3999) state = 'VIC';
  else if (num >= 8000 && num <= 8999) state = 'VIC';
  else if (num >= 4000 && num <= 4999) state = 'QLD';
  else if (num >= 9000 && num <= 9999) state = 'QLD';
  else if (num >= 5000 && num <= 5999) state = 'SA';
  else if (num >= 6000 && num <= 6999) state = 'WA';
  else if (num >= 7000 && num <= 7999) state = 'TAS';

  return {
    postcode,
    locality: localities[postcode] ?? '',
    state,
    structural,
    dataCompleteness: { available, total: structural.length },
    exposures,
    signals,
    cascade,
    diversity,
    actions,
    scoring,
  };
}

// ── HTTP handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const postcode = url.searchParams.get('postcode');

  if (!postcode) {
    return Response.json(
      { error: 'Missing required query parameter: postcode', status: 400 },
      { status: 400 },
    );
  }

  if (!isValidPostcode(postcode)) {
    return Response.json(
      { error: `Invalid postcode format: "${postcode}". Must be 3-4 digits.`, status: 400 },
      { status: 400 },
    );
  }

  const { raw } = getCachedData();
  if (!raw[postcode]) {
    return Response.json(
      { error: `Postcode not found: ${postcode}`, status: 404 },
      { status: 404 },
    );
  }

  // Require minimum data to show a meaningful profile
  const d = raw[postcode];
  const hasCensus = d.census && (
    d.census.car_dependency !== null ||
    d.census.housing_stress !== null ||
    d.census.median_income !== null
  );
  if (!hasCensus) {
    return Response.json(
      {
        error: `Not enough data for postcode ${postcode}. This may be a PO box or non-residential postcode. Census data is not available for this area.`,
        status: 404,
      },
      { status: 404 },
    );
  }

  const profile = buildProfile(postcode);
  return Response.json(profile);
}
