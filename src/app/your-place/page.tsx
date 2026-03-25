'use client';

/**
 * Your Place — Community Resilience Index
 *
 * SPEC-001 REQ-016 through REQ-019.
 * Calls /api/score, displays BRIC resilience (primary) and INFORM crisis
 * pressure (secondary) with progressive disclosure into capitals, pillars,
 * and indicators. Resilience-first framing per ADR-002.
 */

import { useState, useCallback, type FormEvent } from 'react';
import type { PostcodeRecord } from './types';
import { PostcodeSearch } from './components/PostcodeSearch';
import { ScoreOverview } from './components/ScoreOverview';
import { CapitalBreakdown } from './components/CapitalBreakdown';
import { PillarBreakdown } from './components/PillarBreakdown';
import { ActionList } from './components/ActionList';
import { Provenance } from './components/Provenance';

export default function YourPlacePage() {
  const [postcode, setPostcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PostcodeRecord | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = postcode.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setData(null);

      try {
        const res = await fetch(`/api/score?postcode=${encodeURIComponent(trimmed)}`);
        const body = await res.json();
        if (!res.ok) {
          setError(body.error ?? `Request failed (${res.status})`);
        } else {
          setData(body as PostcodeRecord);
        }
      } catch {
        setError('Could not reach the scoring service. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [postcode],
  );

  return (
    <div>
      <PostcodeSearch
        postcode={postcode}
        setPostcode={setPostcode}
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
      />

      {data && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
          <ScoreOverview data={data} />
          <CapitalBreakdown capitals={data.bric.capitals} />
          <PillarBreakdown pillars={data.inform.pillars} />
          <ActionList actions={data.actions} />
          <Provenance
            signals={data.signals}
            dataConfidence={data.data_confidence}
            lastUpdated={data.last_updated}
          />
        </div>
      )}
    </div>
  );
}
