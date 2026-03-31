/**
 * /methodology/validation — Validation & Transparency
 *
 * Documents what is validated, what cannot be validated yet,
 * and data transparency commitments for the exposure profile approach.
 */

import type { Metadata } from "next";
import {
  CheckCircle,
  Warning,
  ChartBar,
  ArrowsLeftRight,
  Scales,
  LinkSimple,
  Eye,
  ShieldCheck,
  MagnifyingGlass,
  TreeStructure,
} from "@phosphor-icons/react/dist/ssr";
import { MethodologyNav } from "../components/MethodologyNav";

export const metadata: Metadata = {
  title: "Validation & Transparency",
  description:
    "What we test, what we can't test yet, and what we're honest about. Validation results and data transparency for the Community Resilience Index exposure profiles.",
};

export default function Validation() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-green-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="text-amber-500 font-medium text-sm uppercase tracking-wide mb-3">
            Methodology
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-tight">
            Validation &amp; Transparency
          </h1>
          <p className="mt-4 text-green-100 text-lg max-w-2xl">
            What we test, what we can&apos;t test yet, and what we&apos;re
            honest about.
          </p>
        </div>
      </section>

      {/* Nav */}
      <MethodologyNav />

      {/* Summary cards */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <SummaryCard label="Postcodes" value="3,193" sublabel="scored" />
          <SummaryCard
            label="Structural"
            value="11"
            sublabel="indicators per postcode"
          />
          <SummaryCard label="Exposure" value="6" sublabel="domains" />
          <SummaryCard
            label="Signals"
            value="20+"
            sublabel="automated sources"
          />
          <SummaryCard
            label="Coverage"
            value="WA + NSW"
            sublabel="station-level, national for other signals"
          />
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 space-y-10">
        {/* Section 1: What's Validated */}
        <div>
          <h2 className="font-heading text-2xl font-bold text-green-900 mb-2">
            What&apos;s Validated
          </h2>
          <p className="text-gray-600 mb-6">
            The scoring engine underneath the exposure profiles has been
            validated against five quantitative tests. We chose to present
            profiles instead of scores because a profile is more actionable
            but the validated methodology is what gives those profiles
            their grounding.
          </p>
        </div>

        {/* Scoring Engine: Normalisation Robustness */}
        <TestSection
          id="normalisation"
          icon={<ArrowsLeftRight size={24} weight="duotone" />}
          title="Normalisation Robustness"
          badge="Validated"
          pass
          description="Min-max vs percentile-rank normalisation compared across all postcodes. Method choice does not change rankings."
        >
          <div className="grid sm:grid-cols-2 gap-6">
            <MetricCard
              label="BRIC rank correlation (Spearman)"
              value="0.976"
              threshold="0.85"
              pass
            />
            <MetricCard
              label="INFORM rank correlation (Spearman)"
              value="0.952"
              threshold="0.85"
              pass
            />
          </div>
          <Note>
            Rankings are robust to the choice of normalisation method. Both
            scoring frameworks remain highly correlated regardless of whether
            min-max or percentile-rank normalisation is used.
          </Note>
        </TestSection>

        {/* Scoring Engine: Weight Sensitivity */}
        <TestSection
          id="weight-sensitivity"
          icon={<Scales size={24} weight="duotone" />}
          title="Weight Sensitivity"
          badge="Validated"
          pass
          description="Indicator weights perturbed by +/-20%. Stable under parameter uncertainty."
        >
          <div className="grid sm:grid-cols-2 gap-6">
            <MetricCard
              label="Min BRIC rank correlation"
              value="0.999"
              threshold="0.90"
              pass
            />
            <MetricCard
              label="Min INFORM rank correlation"
              value="0.996"
              threshold="0.90"
              pass
            />
            <MetricCard
              label="Max quadrant change rate"
              value="9.1%"
              threshold="10%"
              pass
            />
            <MetricCard
              label="Perturbation rounds"
              value="4"
              threshold=""
              pass
            />
          </div>
          <Note>
            Even at maximum perturbation (+/-20% on all indicators
            simultaneously), fewer than 1 in 10 postcodes change
            classification. The structural data is stable under parameter
            uncertainty.
          </Note>
        </TestSection>

        {/* Scoring Engine: External Validation */}
        <TestSection
          id="seifa"
          icon={<LinkSimple size={24} weight="duotone" />}
          title="External Validation (SEIFA)"
          badge="Validated"
          pass
          description="Structural data correlated with the ABS Socio-Economic Index for Areas (SEIFA IRSD). Validates that structural indicators capture genuine socioeconomic patterns."
        >
          <div className="grid sm:grid-cols-3 gap-6">
            <MetricCard
              label="Pearson r"
              value="0.909"
              threshold="0.40"
              pass
            />
            <MetricCard
              label="Spearman rho"
              value="0.912"
              threshold="0.40"
              pass
            />
            <MetricCard
              label="Postcodes compared"
              value="2,624"
              threshold=""
              pass
            />
          </div>
          <Note>
            Strong correlation with SEIFA IRSD validates that our structural
            data captures genuine socioeconomic patterns. The gap between r=0.91
            and 1.0 is the point: perfect correlation would mean the two
            measures are identical and one is redundant. The CRI captures
            dimensions SEIFA does not, particularly diversity and crisis
            exposure.
          </Note>
        </TestSection>

        {/* Scoring Engine: Diversity Weighting */}
        <TestSection
          id="diversity"
          icon={<TreeStructure size={24} weight="duotone" />}
          title="Diversity Weighting"
          badge="Validated"
          pass
          description="Compares standard and diversity-weighted scoring across mining-dependent postcodes. Concentrated economies are correctly flagged."
        >
          <div className="grid sm:grid-cols-2 gap-6">
            <MetricCard
              label="Standard vs diversity Spearman"
              value="0.997"
              threshold=""
              pass
            />
            <MetricCard
              label="Mining postcodes scoring lower"
              value="22 / 28"
              threshold="majority"
              pass
            />
          </div>
          <Note>
            Diversity weighting reveals structural brittleness that standard
            scoring misses. Communities with concentrated economies appear
            resilient on volume-based indicators but are exposed when diversity
            is weighted. 22 of 28 mining-dependent postcodes score lower under
            diversity weighting, consistent with the hypothesis that
            concentration mimics resilience but creates systemic fragility.
          </Note>
        </TestSection>

        {/* Section 3: Exposure Profile Validation */}
        <div className="border-t border-gray-200 pt-10">
          <h2 className="font-heading text-2xl font-bold text-green-900 mb-2">
            Exposure Profile Validation
          </h2>
          <p className="text-gray-600 mb-6">
            The exposure profile maps structural characteristics to exposure
            domains using deterministic rules. Here is what we can verify and
            what we cannot.
          </p>
        </div>

        <TestSection
          id="profile-verifiable"
          icon={<ShieldCheck size={24} weight="duotone" />}
          title="What Can Be Verified"
          badge="Auditable"
          pass
          description="Deterministic rules, reproducible outputs, verifiable positions."
        >
          <div className="space-y-4">
            <VerificationItem
              title="Exposure rules are deterministic and auditable"
              detail="Every exposure mapping is a deterministic function of structural inputs. No randomness, no LLM inference. You can inspect the code to trace any exposure rating back to its inputs."
            />
            <VerificationItem
              title="Signal contextualisation uses parameterised templates"
              detail="When signals are contextualised for a postcode, the text is generated from parameterised templates with known inputs. Reproducible, not generative."
            />
            <VerificationItem
              title="Structural characteristics match against national percentiles"
              detail="Every structural characteristic is positioned against the national distribution. You can verify your community's position against the ABS source data."
            />
          </div>
        </TestSection>

        <TestSection
          id="profile-limitations"
          icon={<MagnifyingGlass size={24} weight="duotone" />}
          title="What Cannot Be Validated Yet"
          badge="Honest gap"
          pass={false}
          description="Limitations we name openly rather than hide."
        >
          <div className="space-y-4">
            <VerificationItem
              title="Cascade timeline estimates are structural, not empirical"
              detail="Timeline estimates (e.g. 'fuel price increases reach grocery shelves in 2-4 weeks') are based on industry knowledge and published cost coefficients, not empirical measurement of actual propagation delays. We present them as estimates, not forecasts."
            />
            <VerificationItem
              title="Exposure mapping rules are based on domain expertise, not statistical derivation"
              detail="The rules that map structural characteristics to exposure domains are authored from domain expertise, not derived from statistical models. This is a deliberate design choice: transparent rules that anyone can inspect and challenge are more trustworthy than an opaque model with higher accuracy claims."
            />
            <VerificationItem
              title="Station availability gap detection is a proxy"
              detail="When fuel station reporting gaps are used as a demand pressure signal, it is a proxy measure. Stations may stop reporting for operational reasons unrelated to supply pressure. We flag this uncertainty in the signal context."
            />
          </div>
        </TestSection>

        {/* Section 4: Data Transparency */}
        <div className="border-t border-gray-200 pt-10">
          <h2 className="font-heading text-2xl font-bold text-green-900 mb-2">
            Data Transparency
          </h2>
          <p className="text-gray-600 mb-6">
            We show what data is available and name what is missing. Every data
            point is sourced and dated.
          </p>
        </div>

        <TestSection
          id="data-transparency"
          icon={<Eye size={24} weight="duotone" />}
          title="What We Disclose"
          badge="Transparent"
          pass
          description="Data provenance, age, and coverage gaps are surfaced, not hidden."
        >
          <div className="space-y-4">
            <VerificationItem
              title="Most structural data is from 2021 Census (5 years old)"
              detail="We say so on every profile. The 2026 Census will allow us to refresh structural indicators. Until then, the data reflects 2021 conditions and we are explicit about that."
            />
            <VerificationItem
              title="Signal availability varies by state"
              detail="WA has the most transparent fuel data (FuelWatch, station-level, daily). NSW provides data via CKAN and FuelCheck. Other states have limited or no automated public data. We surface what is available and name what is missing."
            />
            <VerificationItem
              title="Every data point is sourced and dated"
              detail="Structural characteristics show their data source and vintage. Live signals show their fetch timestamp and source authority. Derived signals like cascade pressure are labelled as estimates."
            />
            <VerificationItem
              title="Missing data is named, not hidden"
              detail="When an indicator has no data for a postcode, we show that gap rather than imputing a value or hiding the field. When a signal source is unavailable for a region, we say so."
            />
          </div>
        </TestSection>

        {/* Section 5: OECD Compliance */}
        <div className="border-t border-gray-200 pt-10">
          <h2 className="font-heading text-2xl font-bold text-green-900 mb-6">
            OECD 10-Step Compliance
          </h2>
          <p className="text-gray-600 mb-6">
            The scoring engine follows the OECD/JRC Handbook on Constructing
            Composite Indicators (2008) and the England BRIC adaptation by
            Camacho et al. (2024), which achieved 100% OECD compliance and is
            the closest methodological precedent. We preserve this rigour even
            though the primary output is now an exposure profile rather than a
            composite score.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-4 font-medium text-gray-700">
                    Step
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Requirement
                  </th>
                  <th className="text-left py-3 pl-4 font-medium text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <OecdRow
                  step={1}
                  requirement="Theoretical framework"
                  status="complete"
                  detail="DROP model + INFORM + coherence/entrainment lens"
                />
                <OecdRow
                  step={2}
                  requirement="Data selection"
                  status="complete"
                  detail="11 structural indicators with documented rationale"
                />
                <OecdRow
                  step={3}
                  requirement="Imputation of missing data"
                  status="complete"
                  detail="Missing data handling with explicit gap surfacing"
                />
                <OecdRow
                  step={4}
                  requirement="Multivariate analysis"
                  status="complete"
                  detail="PCA + Cronbach alpha per capital"
                />
                <OecdRow
                  step={5}
                  requirement="Normalisation"
                  status="complete"
                  detail="Min-max + percentile-rank, robustness validated"
                />
                <OecdRow
                  step={6}
                  requirement="Weighting and aggregation"
                  status="complete"
                  detail="Equal weighting within capitals, sensitivity tested"
                />
                <OecdRow
                  step={7}
                  requirement="Robustness and sensitivity"
                  status="complete"
                  detail="Normalisation robustness + weight perturbation analysis"
                />
                <OecdRow
                  step={8}
                  requirement="Back to the data"
                  status="complete"
                  detail="Full decomposition in exposure profiles"
                />
                <OecdRow
                  step={9}
                  requirement="Links to other indicators"
                  status="complete"
                  detail="SEIFA IRSD external validation (r=0.909)"
                />
                <OecdRow
                  step={10}
                  requirement="Visualisation"
                  status="complete"
                  detail="Exposure profiles, signal cascade, action templates"
                />
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Validation run: 20 March 2026. Source data: ABS Census 2021, SEIFA
          2021, MMM 2023, CER postcode data. Signal sources: WA FuelWatch, AIP
          terminal gate prices, AEMO, RBA, ABS SDMX, DCCEEW, Yahoo Finance.
        </p>
      </section>
    </div>
  );
}

// -- Helper components --------------------------------------------------------

function SummaryCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="font-heading text-2xl font-bold text-gray-900 mt-1">
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
    </div>
  );
}

function TestSection({
  id,
  icon,
  title,
  badge,
  pass,
  description,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  badge: string;
  pass: boolean;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="text-green-700 flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-heading text-xl font-bold text-gray-900">
              {title}
            </h2>
            {pass ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                <CheckCircle size={14} weight="fill" />
                {badge}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Warning size={14} weight="fill" />
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  threshold,
  pass,
}: {
  label: string;
  value: string;
  threshold: string;
  pass: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-heading text-2xl font-bold text-gray-900 mt-1">
        {value}
      </p>
      {threshold && (
        <p className="text-xs text-gray-400 mt-0.5">
          threshold: {threshold}{" "}
          {pass ? (
            <span className="text-green-600">met</span>
          ) : (
            <span className="text-red-600">not met</span>
          )}
        </p>
      )}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
      <p className="text-sm text-gray-700 leading-relaxed">{children}</p>
    </div>
  );
}

function VerificationItem({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{detail}</p>
    </div>
  );
}

function OecdRow({
  step,
  requirement,
  status,
  detail,
}: {
  step: number;
  requirement: string;
  status: "complete" | "pending" | "in-progress";
  detail: string;
}) {
  const statusColour =
    status === "complete"
      ? "text-green-700"
      : status === "pending"
        ? "text-amber-700"
        : "text-blue-700";
  const statusLabel =
    status === "complete"
      ? "Complete"
      : status === "pending"
        ? "Pending"
        : "In progress";
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 pr-4 font-mono text-gray-400">{step}</td>
      <td className="py-3 px-4 font-medium text-gray-900">{requirement}</td>
      <td className="py-3 pl-4">
        <span className={`font-medium text-sm ${statusColour}`}>
          {statusLabel}
        </span>
        <span className="text-gray-500 text-xs block mt-0.5">{detail}</span>
      </td>
    </tr>
  );
}
