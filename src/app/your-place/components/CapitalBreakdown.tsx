'use client';

import {
  ShieldCheck,
  Users,
  CurrencyDollar,
  Handshake,
  Buildings,
  House,
  Leaf,
} from '@phosphor-icons/react';
import type { CapitalScore } from '../types';
import { ExpandableSection, IndicatorRow } from './ScoreOverview';

const CAPITAL_CONFIG: Record<string, { label: string; icon: typeof Users }> = {
  social: { label: 'Social', icon: Users },
  economic: { label: 'Economic', icon: CurrencyDollar },
  community: { label: 'Community', icon: Handshake },
  institutional: { label: 'Institutional', icon: Buildings },
  housing_infrastructure: { label: 'Housing & Infrastructure', icon: House },
  environmental: { label: 'Environmental', icon: Leaf },
};

export function CapitalBreakdown({
  capitals,
}: {
  capitals: Record<string, CapitalScore>;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={18} weight="duotone" className="text-green-600" />
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Resilience Capitals
        </h3>
      </div>
      <div className="space-y-2">
        {(Object.entries(capitals) as [string, CapitalScore][]).map(([key, capital]) => {
          const config = CAPITAL_CONFIG[key];
          return (
            <ExpandableSection
              key={key}
              title={config?.label ?? key}
              icon={config?.icon ?? Users}
              score={capital.score}
              scoreMax={1}
              available={capital.available}
            >
              {Object.entries(capital.indicators).map(([name, val]) => (
                <IndicatorRow key={name} name={name} value={val} max={1} />
              ))}
            </ExpandableSection>
          );
        })}
      </div>
    </section>
  );
}
