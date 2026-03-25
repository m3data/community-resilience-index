// ── Response types for Your Place ────────────────────────────────────────────

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
  normalisation_method: string;
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

export type QuadrantClassification =
  | 'monitor'
  | 'stress-tested'
  | 'structurally-fragile'
  | 'critical';

export type ActionPriority = 'immediate' | 'this_week' | 'this_month' | 'ongoing';
export type ActionCategory = 'household' | 'community' | 'advocacy';

export interface Action {
  priority: ActionPriority;
  category: ActionCategory;
  title: string;
  description: string;
  guide_section: string;
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
