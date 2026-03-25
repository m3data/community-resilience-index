/**
 * Quadrant classification and action selection — SPEC-001 ADR-002, REQ-012, REQ-019
 *
 * Classifies a postcode into one of four quadrants based on BRIC resilience
 * and INFORM crisis exposure scores, then selects contextual actions based
 * on the quadrant and weak areas.
 */

export type QuadrantClassification =
  | 'monitor'
  | 'stress-tested'
  | 'structurally-fragile'
  | 'critical';

export interface QuadrantResult {
  classification: QuadrantClassification;
  label: string;
  actionFramingText: string;
}

export type ActionPriority = 'immediate' | 'this_week' | 'this_month' | 'ongoing';
export type ActionCategory = 'household' | 'community' | 'advocacy';

export interface Action {
  priority: ActionPriority;
  category: ActionCategory;
  title: string;
  description: string;
  guide_section: string;
}

const QUADRANT_META: Record<
  QuadrantClassification,
  { label: string; actionFramingText: string }
> = {
  monitor: {
    label: 'Monitor',
    actionFramingText: 'Your community has capacity. Stay prepared.',
  },
  'stress-tested': {
    label: 'Stress-Tested',
    actionFramingText:
      'Your community has capacity and it\u2019s being drawn on. Activate mutual support.',
  },
  'structurally-fragile': {
    label: 'Structurally Fragile',
    actionFramingText:
      'Your community has gaps to address. Build capacity now.',
  },
  critical: {
    label: 'Critical Priority',
    actionFramingText:
      'Your community needs immediate mutual support and long-term capacity building.',
  },
};

const DEFAULT_THRESHOLDS = { resilience: 3.0, crisis: 5.0 };

export function classifyQuadrant(
  bricScore: number,
  informScore: number,
  thresholds?: { resilience: number; crisis: number },
): QuadrantResult {
  const t = thresholds ?? DEFAULT_THRESHOLDS;

  let classification: QuadrantClassification;
  if (bricScore >= t.resilience && informScore < t.crisis) {
    classification = 'monitor';
  } else if (bricScore >= t.resilience && informScore >= t.crisis) {
    classification = 'stress-tested';
  } else if (bricScore < t.resilience && informScore < t.crisis) {
    classification = 'structurally-fragile';
  } else {
    classification = 'critical';
  }

  return { classification, ...QUADRANT_META[classification] };
}

// --- Action catalogues keyed by quadrant × weak area ---

type Capital =
  | 'social'
  | 'economic'
  | 'community'
  | 'institutional'
  | 'housing_infrastructure'
  | 'environmental';

type Pillar = 'exposure' | 'sensitivity' | 'lack_of_coping';

const CAPITAL_ACTIONS: Record<Capital, { household: Action; community: Action; advocacy: Action }> =
  {
    economic: {
      household: {
        priority: 'this_week',
        category: 'household',
        title: 'Reduce household fuel dependency',
        description:
          'Audit energy use and identify ways to reduce fuel costs and exposure to price shocks.',
        guide_section: '#economic-resilience',
      },
      community: {
        priority: 'this_month',
        category: 'community',
        title: 'Start a community circle',
        description:
          'Organise a local group to share resources, skills, and mutual aid during disruptions.',
        guide_section: '#community-circles',
      },
      advocacy: {
        priority: 'ongoing',
        category: 'advocacy',
        title: 'Contact your MP about fuel reserves',
        description:
          'Advocate for strategic fuel reserves and energy affordability policies in your electorate.',
        guide_section: '#advocacy-energy',
      },
    },
    social: {
      household: {
        priority: 'this_week',
        category: 'household',
        title: 'Map your support network',
        description:
          'Identify neighbours, friends, and family you can rely on and who may need your help.',
        guide_section: '#social-capital',
      },
      community: {
        priority: 'this_month',
        category: 'community',
        title: 'Host a neighbourhood meet-up',
        description:
          'Bring together residents to build familiarity and trust before a crisis hits.',
        guide_section: '#social-events',
      },
      advocacy: {
        priority: 'ongoing',
        category: 'advocacy',
        title: 'Push for community gathering spaces',
        description:
          'Advocate for accessible public spaces that support social connection.',
        guide_section: '#advocacy-social',
      },
    },
    community: {
      household: {
        priority: 'this_week',
        category: 'household',
        title: 'Join a local community group',
        description:
          'Find and participate in an existing community organisation in your area.',
        guide_section: '#community-participation',
      },
      community: {
        priority: 'this_month',
        category: 'community',
        title: 'Coordinate volunteer response capacity',
        description:
          'Work with local groups to establish a volunteer roster for emergencies.',
        guide_section: '#community-volunteers',
      },
      advocacy: {
        priority: 'ongoing',
        category: 'advocacy',
        title: 'Strengthen local governance participation',
        description:
          'Engage with council and local planning to ensure community voices are heard.',
        guide_section: '#advocacy-governance',
      },
    },
    institutional: {
      household: {
        priority: 'this_month',
        category: 'household',
        title: 'Know your local services',
        description:
          'Identify emergency services, health facilities, and support agencies in your area.',
        guide_section: '#institutional-awareness',
      },
      community: {
        priority: 'this_month',
        category: 'community',
        title: 'Build relationships with service providers',
        description:
          'Connect community groups with local government and service organisations.',
        guide_section: '#institutional-links',
      },
      advocacy: {
        priority: 'ongoing',
        category: 'advocacy',
        title: 'Demand transparent emergency planning',
        description:
          'Push for publicly available, community-informed emergency management plans.',
        guide_section: '#advocacy-institutions',
      },
    },
    housing_infrastructure: {
      household: {
        priority: 'this_week',
        category: 'household',
        title: 'Assess your home for hazard resilience',
        description:
          'Check your property for flood, fire, and storm vulnerabilities and address easy fixes.',
        guide_section: '#housing-resilience',
      },
      community: {
        priority: 'this_month',
        category: 'community',
        title: 'Organise a neighbourhood resilience audit',
        description:
          'Collectively assess infrastructure vulnerabilities in your street or block.',
        guide_section: '#infrastructure-audit',
      },
      advocacy: {
        priority: 'ongoing',
        category: 'advocacy',
        title: 'Advocate for resilient infrastructure investment',
        description:
          'Push for upgraded drainage, power lines, and public infrastructure in vulnerable areas.',
        guide_section: '#advocacy-infrastructure',
      },
    },
    environmental: {
      household: {
        priority: 'this_month',
        category: 'household',
        title: 'Understand your local environmental risks',
        description:
          'Learn about flood zones, fire risk areas, and heat island effects in your locality.',
        guide_section: '#environmental-awareness',
      },
      community: {
        priority: 'this_month',
        category: 'community',
        title: 'Support local environmental restoration',
        description:
          'Join or start tree planting, waterway care, or land management initiatives.',
        guide_section: '#environmental-restoration',
      },
      advocacy: {
        priority: 'ongoing',
        category: 'advocacy',
        title: 'Push for climate adaptation planning',
        description:
          'Demand local government climate adaptation strategies informed by community needs.',
        guide_section: '#advocacy-environment',
      },
    },
  };

const PILLAR_ACTIONS: Record<Pillar, Action> = {
  exposure: {
    priority: 'this_week',
    category: 'household',
    title: 'Review your hazard exposure',
    description:
      'Check recent hazard maps and warnings relevant to your area to understand current threats.',
    guide_section: '#exposure-awareness',
  },
  sensitivity: {
    priority: 'this_week',
    category: 'household',
    title: 'Identify vulnerable household members',
    description:
      'Make a plan for anyone in your household with health, mobility, or age-related sensitivity.',
    guide_section: '#sensitivity-planning',
  },
  lack_of_coping: {
    priority: 'this_week',
    category: 'community',
    title: 'Build local coping networks',
    description:
      'Connect with neighbours to share coping resources — transport, shelter, supplies.',
    guide_section: '#coping-networks',
  },
};

const BASELINE_ACTIONS: Record<QuadrantClassification, Action[]> = {
  monitor: [
    {
      priority: 'ongoing',
      category: 'household',
      title: 'Maintain preparedness',
      description:
        'Keep emergency kits stocked, plans current, and communication channels active.',
      guide_section: '#preparedness',
    },
    {
      priority: 'ongoing',
      category: 'community',
      title: 'Support community preparedness initiatives',
      description:
        'Contribute to local emergency preparedness efforts and share your capacity.',
      guide_section: '#community-preparedness',
    },
    {
      priority: 'ongoing',
      category: 'advocacy',
      title: 'Engage with institutional resilience planning',
      description:
        'Participate in local government resilience and adaptation planning processes.',
      guide_section: '#advocacy-resilience',
    },
  ],
  'stress-tested': [
    {
      priority: 'this_week',
      category: 'household',
      title: 'Activate your household emergency plan',
      description:
        'Review and activate your emergency plan given current elevated crisis conditions.',
      guide_section: '#emergency-activation',
    },
    {
      priority: 'this_week',
      category: 'community',
      title: 'Activate mutual aid networks',
      description:
        'Reach out to your community networks and coordinate support for those in need.',
      guide_section: '#mutual-aid',
    },
    {
      priority: 'this_week',
      category: 'advocacy',
      title: 'Demand adequate emergency response resourcing',
      description:
        'Contact representatives about current crisis response adequacy in your area.',
      guide_section: '#advocacy-emergency',
    },
  ],
  'structurally-fragile': [
    {
      priority: 'this_month',
      category: 'household',
      title: 'Build your household resilience foundations',
      description:
        'Start with an emergency kit, a communications plan, and knowing your neighbours.',
      guide_section: '#foundations',
    },
    {
      priority: 'this_month',
      category: 'community',
      title: 'Form or join a resilience group',
      description:
        'Find others in your area who want to build community capacity together.',
      guide_section: '#resilience-groups',
    },
    {
      priority: 'ongoing',
      category: 'advocacy',
      title: 'Advocate for investment in underserved areas',
      description:
        'Push for equitable distribution of resilience resources to structurally fragile communities.',
      guide_section: '#advocacy-equity',
    },
  ],
  critical: [
    {
      priority: 'immediate',
      category: 'household',
      title: 'Secure immediate household safety',
      description:
        'Ensure your household has water, food, medication, and a safe communication plan now.',
      guide_section: '#immediate-safety',
    },
    {
      priority: 'immediate',
      category: 'community',
      title: 'Activate emergency mutual support',
      description:
        'Check on vulnerable neighbours immediately. Coordinate shared resources and transport.',
      guide_section: '#emergency-mutual-support',
    },
    {
      priority: 'this_week',
      category: 'advocacy',
      title: 'Demand immediate crisis support allocation',
      description:
        'Contact local and state representatives about urgent resource needs in your community.',
      guide_section: '#advocacy-crisis',
    },
  ],
};

export function selectActions(
  quadrant: string,
  weakCapitals: string[],
  weakPillars: string[],
): Action[] {
  const q = quadrant as QuadrantClassification;
  const actions: Action[] = [...BASELINE_ACTIONS[q]];

  // Add actions keyed to weak capitals
  for (const capital of weakCapitals) {
    const capitalActions = CAPITAL_ACTIONS[capital as Capital];
    if (capitalActions) {
      actions.push(capitalActions.household, capitalActions.community, capitalActions.advocacy);
    }
  }

  // Add actions keyed to weak pillars
  for (const pillar of weakPillars) {
    const pillarAction = PILLAR_ACTIONS[pillar as Pillar];
    if (pillarAction) {
      actions.push(pillarAction);
    }
  }

  // Elevate priorities for critical quadrant
  if (q === 'critical') {
    for (const action of actions) {
      if (action.priority === 'this_month') {
        action.priority = 'this_week';
      }
    }
  }

  return actions;
}
