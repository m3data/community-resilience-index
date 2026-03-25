'use client';

import { Info } from '@phosphor-icons/react';
import type { ResponseSignalMeta } from '../types';

export function Provenance({
  signals,
  dataConfidence,
  lastUpdated,
}: {
  signals: ResponseSignalMeta[];
  dataConfidence: number;
  lastUpdated: string;
}) {
  return (
    <footer className="flex items-center gap-2 text-xs text-gray-400 pt-4 border-t border-gray-100">
      <Info size={14} />
      <span>
        {signals.length} data source{signals.length !== 1 ? 's' : ''} &middot;
        Confidence {Math.round(dataConfidence * 100)}% &middot;
        Updated {lastUpdated}
      </span>
    </footer>
  );
}
