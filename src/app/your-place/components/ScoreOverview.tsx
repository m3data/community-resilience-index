'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  Lightning,
  CaretDown,
  Warning,
  CheckCircle,
  Users,
} from '@phosphor-icons/react';
import type { PostcodeRecord, QuadrantClassification, IndicatorValue } from '../types';

// ── Display config ──────────────────────────────────────────────────────────

const QUADRANT_STYLES: Record<QuadrantClassification, { bg: string; border: string; icon: typeof CheckCircle; iconColor: string }> = {
  monitor: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, iconColor: 'text-green-600' },
  'stress-tested': { bg: 'bg-amber-50', border: 'border-amber-200', icon: Warning, iconColor: 'text-amber-600' },
  'structurally-fragile': { bg: 'bg-amber-50', border: 'border-amber-300', icon: Warning, iconColor: 'text-amber-600' },
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: Warning, iconColor: 'text-red-600' },
};

const QUADRANT_FRAMING: Record<QuadrantClassification, string> = {
  monitor: 'Your community has capacity. Stay prepared.',
  'stress-tested': 'Your community has capacity and it\u2019s being drawn on heavily.',
  'structurally-fragile': 'Your community has structural gaps to address. Build capacity now.',
  critical: 'Your community needs immediate mutual support and long-term capacity building.',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function scorePercent(score: number, max: number): number {
  return Math.min(100, Math.round((score / max) * 100));
}

export function indicatorBar(normalised: number, max: number): string {
  return `${Math.min(100, Math.round((normalised / max) * 100))}%`;
}

export function strengthLabel(score: number, max: number): { text: string; color: string } {
  const pct = score / max;
  if (pct >= 0.7) return { text: 'Strong', color: 'text-green-600' };
  if (pct >= 0.4) return { text: 'Moderate', color: 'text-amber-600' };
  return { text: 'Weak', color: 'text-red-600' };
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ScoreCard({
  label,
  score,
  max,
  scoreLabel,
  confidence,
  variant,
  children,
}: {
  label: string;
  score: number;
  max: number;
  scoreLabel: string;
  confidence: number;
  variant: 'resilience' | 'pressure';
  children?: React.ReactNode;
}) {
  const isResilience = variant === 'resilience';
  const barColor = isResilience ? 'bg-green-500' : 'bg-amber-500';
  const trackColor = isResilience ? 'bg-green-100' : 'bg-amber-100';
  const accentColor = isResilience ? 'text-green-700' : 'text-amber-700';
  const borderColor = isResilience ? 'border-green-200' : 'border-amber-200';

  return (
    <div className={`rounded-xl border-2 ${borderColor} bg-white p-5`}>
      <div className="flex items-center gap-2 mb-3">
        {isResilience
          ? <ShieldCheck size={20} weight="duotone" className="text-green-600" />
          : <Lightning size={20} weight="duotone" className="text-amber-600" />
        }
        <span className={`text-xs font-semibold uppercase tracking-wide ${accentColor}`}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-heading text-3xl font-bold text-gray-900">
          {score.toFixed(1)}
        </span>
        <span className="text-sm text-gray-400">/ {max}</span>
      </div>
      <p className={`text-sm font-medium mt-0.5 ${accentColor}`}>{scoreLabel}</p>
      <div className={`mt-3 w-full h-2 ${trackColor} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${scorePercent(score, max)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Data confidence: {Math.round(confidence * 100)}%
      </p>
      {children}
    </div>
  );
}

export function ExpandableSection({
  title,
  icon: Icon,
  score,
  scoreMax,
  available,
  children,
}: {
  title: string;
  icon: typeof Users;
  score: number;
  scoreMax: number;
  available?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const unavailable = available === false;
  const strength = strengthLabel(score, scoreMax);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <Icon size={18} weight="duotone" className={unavailable ? 'text-gray-300' : 'text-gray-500'} />
        <span className={`text-sm font-medium flex-1 ${unavailable ? 'text-gray-400' : 'text-gray-900'}`}>
          {title}
        </span>
        {unavailable ? (
          <span className="text-xs text-gray-400 italic">data pending</span>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: indicatorBar(score, scoreMax) }}
              />
            </div>
            <span className={`text-xs font-medium w-16 text-right ${strength.color}`}>
              {strength.text}
            </span>
          </div>
        )}
        <CaretDown
          size={16}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function IndicatorRow({ name, value, max }: { name: string; value: IndicatorValue; max: number }) {
  const label = INDICATOR_LABELS[name] ?? name.replace(/_/g, ' ');
  const hasData = value.raw !== null;

  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <span className="flex-1 text-gray-600 min-w-0 truncate">{label}</span>
      {hasData ? (
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full"
              style={{ width: indicatorBar(value.normalised, max) }}
            />
          </div>
          <span className="font-mono text-xs text-gray-500 w-8 text-right">
            {Math.round(value.normalised * 100 / max)}%
          </span>
        </div>
      ) : (
        <span className="text-xs text-gray-300 italic">no data</span>
      )}
    </div>
  );
}

// ── Indicator labels ────────────────────────────────────────────────────────

const INDICATOR_LABELS: Record<string, string> = {
  seifa_irsd: 'Socioeconomic Advantage',
  educational_attainment: 'Educational Attainment',
  english_proficiency: 'English Proficiency',
  health_service_access: 'Health Service Access',
  median_household_income: 'Median Household Income',
  unemployment_rate: 'Unemployment Rate',
  industry_diversity: 'Industry Diversity',
  housing_affordability: 'Housing Affordability',
  gini_coefficient: 'Income Equality',
  voluntary_work_participation: 'Volunteering Rate',
  nonprofit_org_density: 'Community Organisations',
  voter_turnout: 'Civic Participation',
  organisational_type_diversity: 'Organisation Diversity',
  distance_to_hospital: 'Hospital Proximity',
  distance_to_fire_police: 'Emergency Service Proximity',
  govt_service_points_per_capita: 'Government Services',
  emergency_management_plan: 'Emergency Plan',
  internet_connectivity: 'Internet Access',
  dwelling_quality: 'Dwelling Quality',
  transport_mode_diversity: 'Transport Diversity',
  public_transport_access: 'Public Transport',
  vacancy_rate: 'Housing Occupancy',
  agricultural_land: 'Agricultural Land',
  green_space_per_capita: 'Green Space',
  land_use_diversity: 'Land Use Diversity',
  water_security: 'Water Security',
  remoteness: 'Remoteness',
  local_fuel_price_relative: 'Local Fuel Price',
  fuel_station_density: 'Fuel Station Access',
  local_fuel_availability: 'Fuel Availability',
  seifa_irsd_inverted: 'Socioeconomic Disadvantage',
  car_dependency_rate: 'Car Dependency',
  housing_stress: 'Housing Stress',
  agricultural_workforce_proportion: 'Agricultural Workforce',
  distance_to_supermarket: 'Supermarket Distance',
  public_transport_accessibility: 'Public Transport',
  solar_battery_penetration: 'Solar Penetration',
  volunteer_density: 'Volunteer Density',
  community_infrastructure_density: 'Community Infrastructure',
  local_food_production_potential: 'Local Food Production',
};

// ── Main export ─────────────────────────────────────────────────────────────

export function ScoreOverview({ data }: { data: PostcodeRecord }) {
  const qs = QUADRANT_STYLES[data.quadrant];
  const QIcon = qs.icon;

  return (
    <>
      {/* Postcode header */}
      <div className="flex items-baseline gap-3">
        <h2 className="font-heading text-2xl font-bold text-gray-900">
          {data.locality || data.postcode}
        </h2>
        <span className="text-sm text-gray-400">
          {data.locality ? `${data.postcode} \u00b7 ` : ''}{data.state}
        </span>
      </div>

      {/* Two scores side by side */}
      <div className="grid sm:grid-cols-2 gap-4">
        <ScoreCard
          label="Baseline Resilience"
          score={data.bric.score}
          max={6}
          scoreLabel={data.bric.label}
          confidence={data.bric.confidence}
          variant="resilience"
        />
        <ScoreCard
          label="Crisis Pressure"
          score={data.inform.score}
          max={10}
          scoreLabel={data.inform.label}
          confidence={data.inform.confidence}
          variant="pressure"
        />
      </div>

      {/* Quadrant */}
      <div className={`rounded-xl border-2 ${qs.border} ${qs.bg} p-5`}>
        <div className="flex items-start gap-3">
          <QIcon size={24} weight="duotone" className={qs.iconColor} />
          <div>
            <h3 className="font-heading text-base font-bold text-gray-900">
              {data.quadrant_label}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {QUADRANT_FRAMING[data.quadrant]}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
