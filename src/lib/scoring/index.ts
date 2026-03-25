/**
 * Scoring module — barrel export
 *
 * Re-exports all scoring components for the Community Resilience Index.
 * Pure core: no I/O, no global state. See SPEC-001 Section 8 (Purity Boundary Map).
 */

// Types
export type {
  IndicatorInput,
  IndicatorBreakdown,
  CapitalResult,
  BricResult,
  PillarResult,
  InformResult,
} from './types';

// Confidence
export {
  computeSignalConfidence,
  type SignalMeta,
  type Authority,
  type Freshness,
  type Coverage,
} from './confidence';

// Normalisation
export {
  normalise,
  normaliseInverted,
  computeSkewness,
} from './normalise';

// Diversity indices
export {
  computeHerfindahl,
  computeShannonDiversity,
} from './diversity';

// BRIC scoring (Layer 1)
export {
  computeCapitalScore,
  computeBricScore,
} from './bric';

// INFORM scoring (Layer 2)
export {
  computePillarScore,
  computeInformScore,
} from './inform';

// Quadrant classification + action selection
export {
  classifyQuadrant,
  selectActions,
} from './quadrant';

// Weight configuration
export {
  type IndicatorWeight,
  type CapitalWeights,
  type PillarWeights,
  type Quadrant,
  type QuadrantThresholds,
  type ScoreLabel,
  socialCapital,
  economicCapital,
  communityCapital,
  institutionalCapital,
  housingInfraCapital,
  environmentalCapital,
  bricCapitals,
  exposurePillar,
  sensitivityPillar,
  lackOfCopingCapacityPillar,
  informPillars,
  quadrantThresholds,
  scoreLabels,
  getScoreLabel,
  weightsConfig,
} from './weights';
