'use client';

/**
 * Your Place — Exposure Profile
 *
 * SPEC-003: Profile-first framing. Structural shape + contextualised signals.
 * Scoring engine preserved but secondary.
 *
 * Information hierarchy follows user cognitive journey:
 * orientation → action → understanding (not the data model's logic)
 */

import { useState, useCallback, type FormEvent } from 'react';
import {
  MagnifyingGlass,
  CaretDown,
  CaretRight,
  MapPin,
  Lightning,
  Pulse,
  GasPump,
  Grains,
  PlugCharging,
  CurrencyDollar,
  House,
  FirstAid,
  Info,
  X,
  ArrowRight,
  TreeStructure,
  Timer,
  Eye,
  Database,
} from '@phosphor-icons/react';
import type {
  ExposureProfile,
  StructuralCharacteristic,
  ExposureWeight,
  ContextualisedSignal,
  CascadeEstimate,
  DiversitySpectrum,
  ProfileAction,
} from '../api/profile/route';
import Link from 'next/link';

// ── Domain config ────────────────────────────────────────────────────────────

const DOMAIN_ICONS: Record<string, typeof GasPump> = {
  fuel: GasPump,
  food: Grains,
  electricity: PlugCharging,
  economic: CurrencyDollar,
  housing: House,
  emergency: FirstAid,
};

// Two-tone palette: amber for pressure/exposure, green for capacity, gray for neutral.
// Icons differentiate domains — colour is reserved for meaning, not decoration.
const EXPOSURE_STYLE = { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' };
const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  fuel: EXPOSURE_STYLE,
  food: EXPOSURE_STYLE,
  electricity: EXPOSURE_STYLE,
  economic: EXPOSURE_STYLE,
  housing: EXPOSURE_STYLE,
  emergency: EXPOSURE_STYLE,
};

// Signal key → human-readable name
const SIGNAL_NAMES: Record<string, string> = {
  brentCrude: 'Brent crude oil price',
  crackSpread: 'Oil-to-fuel refining margin',
  waFuel: 'WA fuel prices',
  nswFuel: 'NSW fuel prices',
  asxFood: 'Food & agriculture stocks',
  asxEnergy: 'Energy sector stocks',
  farmInputs: 'Farm input costs',
  aemoElectricity: 'Wholesale electricity price',
  rbaCashRate: 'RBA cash rate',
  audUsd: 'AUD/USD exchange rate',
  nswRfs: 'NSW bushfire incidents',
  vicEmv: 'VIC emergency incidents',
  dieselTgp: 'Diesel wholesale price',
  petrolTgp: 'Petrol wholesale price',
  foodBasket: 'Grocery price changes',
  cascadePressure: 'Combined cost pressure',
  retailMargin: 'Diesel pump markup over wholesale',
  stationAvailability: 'Fuel station monitoring',
};

// ── Main page ────────────────────────────────────────────────────────────────

export default function YourPlacePage() {
  const [postcode, setPostcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ExposureProfile | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = postcode.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setProfile(null);

      try {
        const res = await fetch(`/api/profile?postcode=${encodeURIComponent(trimmed)}`);
        const body = await res.json();
        if (!res.ok) {
          setError(body.error ?? `Request failed (${res.status})`);
        } else {
          setProfile(body as ExposureProfile);
        }
      } catch {
        setError('Could not reach the profile service. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [postcode],
  );

  return (
    <div>
      {/* Hero + search */}
      <section className="bg-green-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <p className="text-amber-500 font-medium text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3">
            Community Resilience Index
          </p>
          <h1 className="font-heading text-2xl sm:text-4xl font-bold leading-tight">
            Your Place
          </h1>
          <p className="mt-3 sm:mt-4 text-green-100 text-base sm:text-lg max-w-2xl">
            Enter your postcode to see what pressures reach your community hardest,
            what to do about them, and which signals to watch.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 flex gap-3 max-w-md">
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

      {/* Profile results — ordered by user need: orientation → action → understanding */}
      {profile && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">
          {/* 1. Orientation */}
          <ProfileHeader profile={profile} />
          {/* 2. Action */}
          <TopActions actions={profile.actions} />
          {/* 3. Why these actions — exposure context */}
          <ExposureMap exposures={profile.exposures} />
          {/* 4. Live intelligence */}
          <SignalRecommendations signals={profile.signals} />
          {/* 5. Understanding — structural depth (collapsed) */}
          <StructuralShape structural={profile.structural} completeness={profile.dataCompleteness} />
          {/* 6. Deeper pattern */}
          <DiversitySection spectra={profile.diversity} />
          {/* 7. Timeline context */}
          <CascadeTimeline cascade={profile.cascade} />
          {/* 8. Provenance */}
          <DataVintage structural={profile.structural} completeness={profile.dataCompleteness} />
        </div>
      )}
    </div>
  );
}

// ── 1. Profile header — orientation + lede finding ───────────────────────────

function ProfileHeader({ profile }: { profile: ExposureProfile }) {
  const top = profile.exposures[0];
  const second = profile.exposures[1];
  const topColor = top ? DOMAIN_COLORS[top.domain] : null;

  return (
    <div>
      <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900">
          {profile.locality || profile.postcode}
        </h2>
        <span className="text-xs sm:text-sm text-gray-400">
          {profile.locality ? `${profile.postcode} \u00b7 ` : ''}{profile.state}
        </span>
      </div>

      {/* Lede finding — expanded from a badge into a sentence */}
      {top && topColor && (
        <div className={`mt-3 sm:mt-4 rounded-xl border-2 ${topColor.border} ${topColor.bg} p-4 sm:p-5`}>
          <p className="text-sm sm:text-base text-gray-900 leading-relaxed">
            <strong className={topColor.text}>{top.label} </strong> is this
            community&rsquo;s highest exposure
            {second && second.weight > 0.3 ? (
              <>, followed by <strong className={DOMAIN_COLORS[second.domain]?.text ?? ''}>{second.label.toLowerCase()}</strong></>
            ) : null}.{' '}
            <span className="text-gray-600">{top.reason}.</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── 2. Actions — what to do (moved to top) ───────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  household: { label: 'Household', color: 'bg-gray-100 text-gray-600' },
  community: { label: 'Community', color: 'bg-green-50 text-green-700' },
  advocacy: { label: 'Advocacy', color: 'bg-gray-100 text-gray-600' },
};

const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  now: { label: 'Do now', color: 'bg-amber-100 text-amber-700' },
  this_month: { label: 'This month', color: 'bg-amber-50 text-amber-600' },
  ongoing: { label: 'Ongoing', color: 'bg-gray-100 text-gray-500' },
};

function TopActions({ actions }: { actions: ProfileAction[] }) {
  if (actions.length === 0) return null;

  const top = actions.slice(0, 3);

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <ArrowRight size={20} weight="duotone" className="text-green-700" />
        <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">What to do</h3>
      </div>

      <div className="space-y-3 mt-4">
        {top.map((action, i) => {
          const Icon = DOMAIN_ICONS[action.domain] ?? Lightning;
          const urg = URGENCY_LABELS[action.urgency] ?? URGENCY_LABELS.ongoing;
          const cat = CATEGORY_LABELS[action.category] ?? CATEGORY_LABELS.household;

          return (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={16} weight="duotone" className="text-green-700" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Action leads */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5 sm:mb-2">
                    <h4 className="text-sm sm:text-base font-bold text-gray-900">{action.title}</h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${urg.color}`}>
                      {urg.label}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {action.description}
                  </p>
                  {/* Driver is supporting, not leading */}
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-400">
                      Based on: {action.driver}
                    </p>
                    <Link
                      href={action.guideLink}
                      className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800 shrink-0"
                    >
                      Guide
                      <ArrowRight size={12} weight="bold" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {actions.length > 3 && (
        <MoreActions actions={actions.slice(3)} />
      )}
    </section>
  );
}

function MoreActions({ actions }: { actions: ProfileAction[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        {expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
        {actions.length} more action{actions.length !== 1 ? 's' : ''}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {actions.map((action, i) => {
            const urg = URGENCY_LABELS[action.urgency] ?? URGENCY_LABELS.ongoing;
            const cat = CATEGORY_LABELS[action.category] ?? CATEGORY_LABELS.household;

            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{action.title}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${urg.color}`}>
                      {urg.label}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 3. Exposure map — where pressure reaches you hardest ─────────────────────

function ExposureMap({ exposures }: { exposures: ExposureWeight[] }) {
  const [showAll, setShowAll] = useState(false);
  const topExposures = exposures.slice(0, 3);
  const restExposures = exposures.slice(3);

  // Name the top exposures explicitly
  const topNames = topExposures
    .filter((e) => e.weight > 0.3)
    .map((e) => e.label.toLowerCase());

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Pulse size={20} weight="duotone" className="text-amber-700" />
        <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">Where pressure reaches you hardest</h3>
      </div>
      {topNames.length > 0 && (
        <p className="text-sm text-gray-600 mb-4">
          Your highest exposures are{' '}
          <strong>{topNames.slice(0, -1).join(', ')}{topNames.length > 1 ? ' and ' : ''}{topNames[topNames.length - 1]}</strong>,
          based on this community&rsquo;s structural characteristics.
        </p>
      )}

      <div className="space-y-3">
        {topExposures.map((exp) => (
          <ExposureBar key={exp.domain} exposure={exp} />
        ))}
      </div>

      {restExposures.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            {showAll ? <CaretDown size={14} /> : <CaretRight size={14} />}
            {restExposures.length} more domain{restExposures.length !== 1 ? 's' : ''}
          </button>
          {showAll && (
            <div className="mt-3 space-y-3">
              {restExposures.map((exp) => (
                <ExposureBar key={exp.domain} exposure={exp} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ExposureBar({ exposure }: { exposure: ExposureWeight }) {
  const Icon = DOMAIN_ICONS[exposure.domain] ?? Lightning;
  const colors = DOMAIN_COLORS[exposure.domain] ?? DOMAIN_COLORS.fuel;
  const pct = Math.round(exposure.weight * 100);

  return (
    <div className={`rounded-lg border ${colors.border} p-3 sm:p-4 ${colors.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} weight="duotone" className={colors.text} />
        <span className="text-sm font-semibold text-gray-900 flex-1">{exposure.label}</span>
        <span className={`text-xs font-bold ${colors.text}`}>{pct}%</span>
      </div>
      <div className="h-1.5 sm:h-2 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 mt-2 leading-relaxed">{exposure.reason}</p>
    </div>
  );
}

// ── 4. Signal recommendations — human-readable names, no relevance % ─────────

function SignalRecommendations({ signals }: { signals: ContextualisedSignal[] }) {
  if (signals.length === 0) return null;

  const top = signals.slice(0, 4);

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Pulse size={20} weight="duotone" className="text-green-700" />
        <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">Signals to watch</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Live data feeds ranked by relevance to your community.
      </p>

      <div className="space-y-3">
        {top.map((sig) => {
          const Icon = DOMAIN_ICONS[sig.domain] ?? Lightning;
          const humanName = SIGNAL_NAMES[sig.key] ?? sig.key.replace(/([A-Z])/g, ' $1').trim();

          return (
            <Link key={sig.key} href={`/signals#${sig.key}`} className="flex gap-3 p-3 sm:p-4 rounded-lg border border-gray-100 bg-white hover:border-green-200 hover:bg-green-50/30 transition-colors group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-green-100">
                <Icon size={14} weight="duotone" className="text-gray-500 group-hover:text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{humanName}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {sig.domain}
                  </span>
                  <ArrowRight size={12} weight="bold" className="text-gray-300 group-hover:text-green-600 transition-colors" />
                </div>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{sig.context}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── 5. Structural shape — collapsed, outliers first ──────────────────────────

function StructuralShape({
  structural,
  completeness,
}: {
  structural: StructuralCharacteristic[];
  completeness: { available: number; total: number };
}) {
  const [expanded, setExpanded] = useState(false);
  const withData = structural.filter((c) => c.value !== null);
  const withoutData = structural.filter((c) => c.value === null);

  // Find outliers — characteristics furthest from median (percentile far from 0.5)
  const ranked = [...withData]
    .filter((c) => c.percentile !== null)
    .sort((a, b) => Math.abs((b.percentile ?? 0.5) - 0.5) - Math.abs((a.percentile ?? 0.5) - 0.5));
  const outliers = ranked.slice(0, 3);
  const rest = withData.filter((c) => !outliers.includes(c));

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <TreeStructure size={20} weight="duotone" className="text-green-700" />
        <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">What shapes this community&rsquo;s exposure</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        The factors that shape how exposed this community is.
        {outliers.length > 0 && ' Most distinctive shown first.'}
      </p>

      {/* Outliers always visible */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {outliers.map((char) => (
          <StructuralCard key={char.key} char={char} highlight />
        ))}
      </div>

      {/* Rest collapsed */}
      {rest.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            {expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
            {rest.length + withoutData.length} more characteristic{rest.length + withoutData.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <>
              <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rest.map((char) => (
                  <StructuralCard key={char.key} char={char} />
                ))}
              </div>
              {withoutData.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {withoutData.map((char) => (
                    <span key={char.key} className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      {char.label} (no data)
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function StructuralCard({ char, highlight }: { char: StructuralCharacteristic; highlight?: boolean }) {
  // Colour the percentile bar based on deviation from median
  const pct = char.percentile !== null ? Math.round(char.percentile * 100) : null;
  const isHigh = pct !== null && pct >= 75;
  const isLow = pct !== null && pct <= 25;
  const barColor = isHigh ? 'bg-green-500' : isLow ? 'bg-amber-500' : 'bg-gray-400';
  const deviationLabel = isHigh ? 'Above average' : isLow ? 'Below average' : pct !== null ? 'Near average' : null;
  const deviationColor = isHigh ? 'text-green-600' : isLow ? 'text-amber-600' : 'text-gray-400';

  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'border-green-200 bg-green-50/30' : 'border-gray-100 bg-white'}`}>
      <p className="text-[11px] text-gray-400 font-medium">{char.label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{char.formatted}</p>
      {pct !== null && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium ${deviationColor} shrink-0`}>
              {deviationLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 6. Diversity spectrum — "Concentrated or diversified?" ───────────────────

function DiversitySection({ spectra }: { spectra: DiversitySpectrum[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (spectra.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Eye size={20} weight="duotone" className="text-green-700" />
        <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">Concentrated or diversified?</h3>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          aria-label="Learn about concentration and diversity"
        >
          <Info size={14} />
          Why this matters
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        When one thing fails in a diversified community, other options exist.
        When everything depends on the same thing, it all falls at once.
      </p>

      <div className="space-y-4">
        {spectra.map((s) => (
          <SpectrumBar key={s.label} spectrum={s} />
        ))}
      </div>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title="Concentration vs diversity">
          <p className="text-sm text-gray-600 leading-relaxed">
            A community where 90% of workers are in one industry looks stable
            right up until that industry contracts. Then everything fails at once.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            We measure diversity in industry, transport, and other systems using
            the Shannon diversity index. Higher diversity means more ways for a
            community to reorganise under stress. Low diversity means locked
            dependencies that fail together.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            Neither is inherently good or bad. A mining town with concentrated
            industry can be thriving. But understanding where your community sits
            on this spectrum tells you what kind of stress it can absorb.
          </p>
        </Modal>
      )}
    </section>
  );
}

// Absolute scale max for each diversity type (Shannon index theoretical max)
const DIVERSITY_SCALE: Record<string, number> = {
  'Industry diversity': 4.25,   // log2(~19 ANZSIC divisions)
  'Transport diversity': 3.0,   // log2(~8 commute modes)
};

function SpectrumBar({ spectrum }: { spectrum: DiversitySpectrum }) {
  // Position dot on the absolute scale, not the percentile
  const scaleMax = DIVERSITY_SCALE[spectrum.label] ?? 4.0;
  const absolutePosition = Math.round(Math.min(100, (spectrum.value / scaleMax) * 100));

  // Use the API's spectrumPosition for label and colour (based on absolute thresholds)
  const posColors = {
    entrained: { dot: 'bg-amber-500', label: 'text-amber-700', bg: 'bg-amber-50' },
    mixed: { dot: 'bg-yellow-500', label: 'text-yellow-700', bg: 'bg-yellow-50' },
    coherent: { dot: 'bg-green-500', label: 'text-green-700', bg: 'bg-green-50' },
  };
  const colors = posColors[spectrum.spectrumPosition];
  const label = spectrum.spectrumPosition === 'entrained' ? 'Concentrated' : spectrum.spectrumPosition === 'coherent' ? 'Diversified' : 'Moderate';

  // Percentile as context, not as position
  const pctLabel = spectrum.percentile !== null
    ? `More diversified than ${Math.round(spectrum.percentile * 100)}% of communities`
    : null;

  return (
    <div className={`rounded-lg border border-gray-100 p-4 ${colors.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{spectrum.label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.label} bg-white/80`}>
          {label}
        </span>
      </div>

      <div className="relative h-3 bg-gradient-to-r from-amber-200 via-yellow-200 to-green-200 rounded-full mt-1">
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${colors.dot} rounded-full border-2 border-white shadow-sm transition-all`}
          style={{ left: `clamp(8px, ${absolutePosition}% - 8px, calc(100% - 16px))` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>Concentrated</span>
        <span>Diversified</span>
      </div>

      {pctLabel && (
        <p className="text-[11px] text-gray-400 mt-1.5">{pctLabel}</p>
      )}

      <p className="text-sm text-gray-600 mt-2 leading-relaxed">
        {spectrum.interpretation}
      </p>
    </div>
  );
}

// ── 7. Cascade timeline — "How long before it reaches here?" ─────────────────

function CascadeTimeline({ cascade }: { cascade: CascadeEstimate[] }) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Timer size={20} weight="duotone" className="text-amber-700" />
        <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">How long before it reaches here?</h3>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          aria-label="Learn about cascade estimates"
        >
          <Info size={14} />
          How estimated
        </button>
      </div>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        {expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
        Estimated propagation times for upstream pressures
      </button>

      {expanded && (
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {cascade.map((c) => {
            const Icon = DOMAIN_ICONS[c.domain] ?? Lightning;
            const colors = DOMAIN_COLORS[c.domain] ?? DOMAIN_COLORS.fuel;

            return (
              <div key={c.domain} className={`rounded-lg border ${colors.border} p-4 ${colors.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} weight="duotone" className={colors.text} />
                  <span className="text-sm font-medium text-gray-900">{c.label}</span>
                </div>
                <p className={`text-lg font-bold ${colors.text}`}>{c.estimate}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{c.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title="How cascade timelines are estimated">
          <p className="text-sm text-gray-600 leading-relaxed">
            These estimates are based on supply chain structure, industry knowledge,
            and historical patterns of how price pressures propagate through
            distribution networks.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            They are <strong>not</strong> precise forecasts. Actual timing depends on
            market conditions, contract structures, competitive dynamics, and policy
            interventions. Use them as rough orientation, not planning targets.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            Remote and regional communities typically face longer lag times due to
            longer supply chains and fewer competitive pressures to pass on price
            decreases.
          </p>
          <h4 className="text-sm font-semibold text-gray-900 mt-4">Sources</h4>
          <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
            <li>ACCC fuel monitoring reports</li>
            <li>AEMO market analysis</li>
            <li>ABARES agricultural commodity reports</li>
            <li>RBA monetary policy transmission research</li>
          </ul>
        </Modal>
      )}
    </section>
  );
}

// ── 8. Data provenance — with completeness stat moved here ───────────────────

function DataVintage({
  structural,
  completeness,
}: {
  structural: StructuralCharacteristic[];
  completeness: { available: number; total: number };
}) {
  const vintages = new Map<string, string[]>();
  for (const char of structural) {
    if (char.value === null) continue;
    const key = `${char.source} (${char.vintage})`;
    if (!vintages.has(key)) vintages.set(key, []);
    vintages.get(key)!.push(char.label);
  }

  return (
    <section className="border-t border-gray-100 pt-8">
      <div className="flex items-center gap-2 mb-4">
        <Database size={22} weight="duotone" className="text-gray-400" />
        <h3 className="font-heading text-sm font-bold text-gray-500 uppercase tracking-wide">Where this data comes from</h3>
        <span className="text-xs text-gray-400 ml-auto">
          {completeness.available} of {completeness.total} data points available
        </span>
      </div>
      <div className="space-y-2">
        {Array.from(vintages.entries()).map(([source, indicators]) => (
          <div key={source} className="flex items-start gap-2 text-xs text-gray-400">
            <span className="font-medium shrink-0">{source}:</span>
            <span>{indicators.join(', ')}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        Structural data is based on the most recent available sources. Most indicators
        use the 2021 Census, which will be refreshed after the August 2026 Census.
        Live signal data is fetched in real-time from public APIs.
      </p>
    </section>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-heading text-base font-bold text-gray-900">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
