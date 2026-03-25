'use client';

import {
  Lightning,
  MapTrifold,
  Gauge,
  Lifebuoy,
} from '@phosphor-icons/react';
import type { PillarScore } from '../types';
import { ExpandableSection, IndicatorRow } from './ScoreOverview';

const PILLAR_CONFIG: Record<string, { label: string; icon: typeof MapTrifold }> = {
  exposure: { label: 'Exposure', icon: MapTrifold },
  sensitivity: { label: 'Sensitivity', icon: Gauge },
  lack_of_coping: { label: 'Lack of Coping Capacity', icon: Lifebuoy },
};

export function PillarBreakdown({
  pillars,
}: {
  pillars: Record<string, PillarScore>;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Lightning size={18} weight="duotone" className="text-amber-600" />
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Crisis Pressure Pillars
        </h3>
      </div>
      <div className="space-y-2">
        {(Object.entries(pillars) as [string, PillarScore][]).map(([key, pillar]) => {
          const config = PILLAR_CONFIG[key];
          return (
            <ExpandableSection
              key={key}
              title={config?.label ?? key}
              icon={config?.icon ?? Gauge}
              score={pillar.score}
              scoreMax={10}
              available={true}
            >
              {Object.entries(pillar.indicators).map(([name, val]) => (
                <IndicatorRow key={name} name={name} value={val} max={10} />
              ))}
            </ExpandableSection>
          );
        })}
      </div>
    </section>
  );
}
