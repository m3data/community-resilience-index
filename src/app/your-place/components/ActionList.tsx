'use client';

import { ArrowRight } from '@phosphor-icons/react';
import type { Action, ActionPriority, ActionCategory } from '../types';

const PRIORITY_ORDER: ActionPriority[] = ['immediate', 'this_week', 'this_month', 'ongoing'];

const PRIORITY_LABELS: Record<ActionPriority, string> = {
  immediate: 'Now', this_week: 'This Week', this_month: 'This Month', ongoing: 'Ongoing',
};

const PRIORITY_STYLES: Record<ActionPriority, string> = {
  immediate: 'bg-red-100 text-red-700', this_week: 'bg-amber-100 text-amber-700',
  this_month: 'bg-green-100 text-green-700', ongoing: 'bg-gray-100 text-gray-600',
};

const CATEGORY_ICONS: Record<ActionCategory, string> = {
  household: 'Household', community: 'Community', advocacy: 'Advocacy',
};

function ActionCard({ action }: { action: Action }) {
  return (
    <div className="flex gap-3 p-3 bg-white border border-gray-200 rounded-lg">
      <div className="shrink-0 mt-0.5">
        <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full ${PRIORITY_STYLES[action.priority]}`}>
          {PRIORITY_LABELS[action.priority]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900">{action.title}</h4>
          <span className="text-[10px] text-gray-400 uppercase">{CATEGORY_ICONS[action.category]}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{action.description}</p>
      </div>
    </div>
  );
}

export function ActionList({ actions }: { actions: Action[] }) {
  if (actions.length === 0) return null;

  const groupedActions = PRIORITY_ORDER.reduce<Record<ActionPriority, Action[]>>(
    (acc, p) => {
      acc[p] = actions.filter((a) => a.priority === p);
      return acc;
    },
    { immediate: [], this_week: [], this_month: [], ongoing: [] },
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight size={18} weight="bold" className="text-green-600" />
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          What You Can Do
        </h3>
      </div>
      <div className="space-y-2">
        {PRIORITY_ORDER.map((priority) => {
          const priorityActions = groupedActions[priority];
          if (priorityActions.length === 0) return null;
          return priorityActions.map((action, i) => (
            <ActionCard key={`${priority}-${i}`} action={action} />
          ));
        })}
      </div>
    </section>
  );
}
