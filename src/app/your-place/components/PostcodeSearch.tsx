'use client';

import type { FormEvent } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

export function PostcodeSearch({
  postcode,
  setPostcode,
  loading,
  error,
  onSubmit,
}: {
  postcode: string;
  setPostcode: (value: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <section className="bg-green-900 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-amber-500 font-medium text-sm uppercase tracking-wide mb-3">
          Community Resilience Index
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-tight">
          Your Place
        </h1>
        <p className="mt-4 text-green-100 text-lg max-w-2xl">
          Enter your postcode to see how your community is placed —
          what it has, and what it&rsquo;s up against.
        </p>

        {/* Search — embedded in hero */}
        <form onSubmit={onSubmit} className="mt-8 flex gap-3 max-w-md">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{3,4}"
              maxLength={4}
              placeholder="Enter postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white text-gray-900 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label="Australian postcode"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-green-900 font-semibold rounded-lg disabled:opacity-50 transition-colors text-base focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-green-900"
          >
            {loading ? 'Loading\u2026' : 'Look up'}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>
        )}
      </div>
    </section>
  );
}
