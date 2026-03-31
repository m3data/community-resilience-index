/**
 * /methodology/indicators.Data Sources & Indicators
 *
 * SPEC-003: Exposure profile approach
 * Audience: Community organiser, journalist, researcher
 * Content: Structural indicators, exposure mapping rules, diversity analysis,
 *          signal contextualisation, preserved scoring engine, missing data handling.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  Table,
  MapTrifold,
  TreeStructure,
  Broadcast,
  Archive,
  ShieldWarning,
} from "@phosphor-icons/react/dist/ssr";
import { MethodologyNav } from "../components/MethodologyNav";

export const metadata: Metadata = {
  title: "Data Sources & Indicators",
  description:
    "Data sources and indicators used to build each community's exposure profile: structural characteristics, exposure mapping rules, diversity analysis, and signal contextualisation.",
};

export default function DataSourcesIndicators() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-green-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="text-amber-500 font-medium text-sm uppercase tracking-wide mb-3">
            Methodology
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-tight">
            Data Sources & Indicators
          </h1>
          <p className="mt-4 text-green-100 text-lg max-w-2xl">
            The 11 structural indicators that shape each community's exposure
            profile, where the data comes from, and how it connects to action.
          </p>
        </div>
      </section>

      {/* Nav */}
      <MethodologyNav />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* ── Section 1: Structural Profile Indicators ──────────────── */}
        <section id="structural-indicators">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-green-700 flex-shrink-0 mt-1">
              <Table size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900">
                Structural Profile Indicators
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                11 indicators drawn from public datasets to characterise each
                postcode
              </p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-6">
            Every exposure profile is built from 11 indicators that describe the
            structural shape of a community: how people get around, what work is
            available, how far away critical supply chains are, and what buffers
            exist against economic pressure. None of these are predictions. They
            describe what is already true about a place.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-3 font-medium text-gray-700">
                    Indicator
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-700">
                    Source
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-700">
                    Vintage
                  </th>
                  <th className="text-left py-3 pl-3 font-medium text-gray-700">
                    What it measures
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <IndicatorRow
                  name="Car dependency"
                  dataKey="car_dependency"
                  source="ABS Census 2021"
                  vintage="2021"
                  description="% of commuters who drive to work"
                />
                <IndicatorRow
                  name="Refinery distance"
                  dataKey="refinery_distance"
                  source="Derived (Lytton, Geelong)"
                  vintage="Static"
                  description="km to nearest operating refinery"
                />
                <IndicatorRow
                  name="Industry diversity"
                  dataKey="industry_diversity"
                  source="ABS Census 2021"
                  vintage="2021"
                  description="Shannon index across employment sectors"
                />
                <IndicatorRow
                  name="Agricultural workforce"
                  dataKey="agricultural_workforce"
                  source="ABS Census 2021"
                  vintage="2021"
                  description="% in agriculture, forestry, fishing"
                />
                <IndicatorRow
                  name="Remoteness"
                  dataKey="remoteness"
                  source="Modified Monash Model 2023"
                  vintage="2023"
                  description="MMM category 1-7"
                />
                <IndicatorRow
                  name="Housing stress"
                  dataKey="housing_stress"
                  source="ABS Census 2021"
                  vintage="2021"
                  description="% of households spending >30% income on housing"
                />
                <IndicatorRow
                  name="Solar capacity"
                  dataKey="solar_capacity"
                  source="Clean Energy Regulator"
                  vintage="2024"
                  description="Installed kW per postcode"
                />
                <IndicatorRow
                  name="SEIFA IRSD"
                  dataKey="seifa_irsd"
                  source="ABS SEIFA 2021"
                  vintage="2021"
                  description="Socioeconomic index decile"
                />
                <IndicatorRow
                  name="Median income"
                  dataKey="median_income"
                  source="ABS Census 2021"
                  vintage="2021"
                  description="Weekly household income"
                />
                <IndicatorRow
                  name="Transport diversity"
                  dataKey="transport_diversity"
                  source="ABS Census 2021"
                  vintage="2021"
                  description="Shannon index across commute modes"
                />
                <IndicatorRow
                  name="Internet access"
                  dataKey="internet_access"
                  source="ABS Census 2021"
                  vintage="2021"
                  description="% of dwellings with internet"
                />
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Most structural data comes from the 2021 Census, now five years
              old. The August 2026 Census will refresh these indicators
              significantly. Until then, the profile reflects structural
              characteristics that change slowly: how a community is built, not
              how it feels today. Live signals provide the current-conditions
              layer.
            </p>
          </div>
        </section>

        {/* ── Section 2: Exposure Mapping Rules ────────────────────── */}
        <section id="exposure-mapping">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-green-700 flex-shrink-0 mt-1">
              <MapTrifold size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900">
                Exposure Mapping Rules
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                How structural indicators connect to exposure domains
              </p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-4">
            Each community receives exposure weights across six domains: fuel,
            and transport, food and agriculture, electricity and grid, economic,
            housing, and emergency services. The weights are not
            machine-learned. They follow transparent rules: if a structural
            indicator crosses a threshold, the relevant domain&rsquo;s weight
            increases.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            The thresholds and cost relationships are drawn from published
            domain research:{' '}
            <a href="/methodology/references#ref-accc-fuel-2023" className="text-green-700 underline underline-offset-2">ACCC fuel monitoring</a>{' '}
            (diesel as 30&ndash;40% of freight costs, regional price differentials),{' '}
            <a href="/methodology/references#ref-bitre-freight-2022" className="text-green-700 underline underline-offset-2">BITRE freight economics</a>{' '}
            (distance-based cost modelling),{' '}
            <a href="/methodology/references#ref-abares-outlook-2024" className="text-green-700 underline underline-offset-2">ABARES commodity reports</a>{' '}
            (freight share of food cost: 8&ndash;12%),{' '}
            <a href="/methodology/references#ref-rba-transmission-2023" className="text-green-700 underline underline-offset-2">RBA transmission research</a>{' '}
            (rate-to-mortgage lag), and{' '}
            <a href="/methodology/references#ref-iea-australia-2023" className="text-green-700 underline underline-offset-2">IEA energy policy reviews</a>{' '}
            (import dependency, stockholding obligations).
            Full citations on the{' '}
            <a href="/methodology/references#domain-evidence" className="text-green-700 underline underline-offset-2">references page</a>.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-4 font-medium text-gray-700">
                    If your community has...
                  </th>
                  <th className="text-left py-3 pl-4 font-medium text-gray-700">
                    Your exposure increases in...
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <MappingRow
                  condition="High car dependency (>60%)"
                  domain="Fuel & transport"
                />
                <MappingRow
                  condition="Far from refinery (>500km)"
                  domain="Fuel & transport"
                />
                <MappingRow
                  condition="High agricultural workforce (>10%)"
                  domain="Food & agriculture"
                />
                <MappingRow
                  condition="Remote or very remote (MMM 5+)"
                  domain="Food, fuel, emergency services"
                />
                <MappingRow
                  condition="Low solar capacity"
                  domain="Electricity & grid"
                />
                <MappingRow
                  condition="High housing stress (>30%)"
                  domain="Economic, housing"
                />
                <MappingRow
                  condition="Low median income"
                  domain="Economic"
                />
                <MappingRow
                  condition="Low SEIFA (decile 1-3)"
                  domain="Economic"
                />
              </tbody>
            </table>
          </div>

          <p className="text-gray-700 leading-relaxed mt-6">
            Each domain receives a weight between 0 and 1, calculated from how
            many structural factors contribute and how far each factor exceeds
            its threshold. A postcode with high car dependency and long refinery
            distance will have a higher fuel and transport weight than one with
            only high car dependency. The algorithm is deterministic: the same
            inputs always produce the same weights.
          </p>
        </section>

        {/* ── Section 3: Diversity Analysis ────────────────────────── */}
        <section id="diversity-analysis">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-green-700 flex-shrink-0 mt-1">
              <TreeStructure size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900">
                Diversity Analysis
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                How concentration and diversification shape exposure
              </p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-4">
            Two indicators use the Shannon diversity index, a measure borrowed
            from ecology that quantifies how evenly distributed a set of
            categories is. Higher values mean more even spread across
            categories. Lower values mean concentration in a few.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-heading font-semibold text-gray-900 text-sm mb-2">
                Industry diversity
              </h3>
              <p className="text-sm text-gray-600">
                Calculated across ANZSIC employment sectors. A mining town where
                70% of workers are in one industry scores low. A regional centre
                with spread across health, education, retail, and agriculture
                scores high.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-heading font-semibold text-gray-900 text-sm mb-2">
                Transport diversity
              </h3>
              <p className="text-sm text-gray-600">
                Calculated across commute modes (car, public transport, cycling,
                walking, work from home). A suburb where 90% drive scores low. A
                suburb with meaningful public transport and cycling scores high.
              </p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-4">
            The spectrum runs from <strong>concentrated</strong> (low diversity,
            high exposure) to <strong>diversified</strong> (high diversity, lower
            exposure). Concentration is not inherently bad. A mining town may be
            wealthy, but it creates structural dependence on a single system. If
            that system is disrupted, there is less to fall back on.
          </p>

          <p className="text-gray-700 leading-relaxed">
            This is what we call the <strong>entrainment penalty</strong> in the
            action urgency scoring. When a community's economy or transport
            system is entrained to a single mode, the urgency of diversification
            actions increases, even if current conditions look stable. A system
            that appears resilient because it is performing well is not the same
            as a system that can absorb disruption.
          </p>
        </section>

        {/* ── Section 4: Signal Contextualisation ──────────────────── */}
        <section id="signal-contextualisation">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-green-700 flex-shrink-0 mt-1">
              <Broadcast size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900">
                Signal Contextualisation
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                How live signals are ranked by relevance to your community
              </p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-4">
            The exposure profile does not just describe structure. It
            contextualises live signals. The{" "}
            <Link
              href="/signals"
              className="text-green-700 underline hover:text-green-900"
            >
              signals layer
            </Link>{" "}
            tracks real-time data across six cascade layers, from upstream
            market pressure (crude oil prices, exchange rates) through wholesale
            and retail prices to emergency incidents.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-3">
              Cascade layers
            </h3>
            <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
              <li>Upstream market pressure (crude oil, exchange rates, equities)</li>
              <li>Electricity and grid (wholesale spot prices)</li>
              <li>Wholesale fuel (terminal gate prices by city)</li>
              <li>Retail prices (pump prices, supermarket shelf prices)</li>
              <li>Economic context (CPI, cash rate, farm input costs)</li>
              <li>Emergency and downstream (bushfire, flood, incidents)</li>
            </ol>
          </div>

          <p className="text-gray-700 leading-relaxed mb-4">
            Not every signal matters equally to every postcode. A community with
            high car dependency and long refinery distance will see fuel price
            signals ranked higher. A community with a large agricultural
            workforce will see farm input cost signals ranked higher. The
            ranking uses parameterised templates: each signal has a relevance
            formula tied to the exposure domain it belongs to.
          </p>

          <p className="text-gray-700 leading-relaxed">
            This is template-based contextualisation, not LLM generation. The
            same structural profile always produces the same signal ranking. The
            text you see in each profile is filled from templates using the
            community's actual numbers, not generated by a language model.
          </p>
        </section>

        {/* ── Section 5: What's Preserved ──────────────────────────── */}
        <section id="preserved-scoring">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-green-700 flex-shrink-0 mt-1">
              <Archive size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900">
                Preserved Scoring Engine
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                The composite index is built, validated, and waiting for fresh
                data
              </p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-4">
            The codebase includes a full BRIC (Baseline Resilience Indicators
            for Communities) and INFORM (Index for Risk Management) composite
            scoring engine. It has been validated across 3,193 postcodes with
            five tests passing, including external validation against the ABS
            SEIFA index (Pearson r = 0.909).
          </p>

          <p className="text-gray-700 leading-relaxed mb-4">
            This engine is preserved but not the primary output. The core
            structural data is from the 2021 Census, and a composite score built
            on five-year-old data risks false precision. The exposure profile
            approach was adopted to give communities actionable intelligence
            now, using the structural indicators we have confidence in, rather
            than waiting for a complete dataset.
          </p>

          <p className="text-gray-700 leading-relaxed">
            When August 2026 Census data arrives, the composite scoring engine
            will be re-activated with fresh indicators across all six capitals.
            Full validation methodology and results are on the{" "}
            <Link
              href="/methodology/validation"
              className="text-green-700 underline hover:text-green-900"
            >
              validation page
            </Link>
            .
          </p>
        </section>

        {/* ── Section 6: Missing Data ──────────────────────────────── */}
        <section id="missing-data">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-green-700 flex-shrink-0 mt-1">
              <ShieldWarning size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900">
                Missing Data
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                How gaps in the data are handled honestly
              </p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-4">
            Not every postcode has data for all 11 indicators. Some postcodes
            are absent from the Census data. Others lack solar capacity records
            or remoteness classifications. The system handles this transparently:
          </p>

          <ol className="text-gray-700 leading-relaxed space-y-3 list-decimal list-inside mb-6">
            <li>
              <strong>NULL values are excluded</strong>: if an indicator is
              missing for a postcode, it is left out of the exposure
              calculation rather than estimated or imputed.
            </li>
            <li>
              <strong>Confidence drops proportionally</strong>: a profile built
              from 8 of 11 indicators carries lower confidence than one built
              from all 11. This is shown to the user.
            </li>
            <li>
              <strong>Partial profiles are shown honestly</strong>: the system
              never hides what it does not know. If a domain's weight is based
              on incomplete indicators, the profile says so.
            </li>
          </ol>

          <p className="text-gray-700 leading-relaxed">
            This approach prefers honesty over completeness. A partial profile
            with clear provenance is more useful than a complete-looking profile
            that papers over gaps.
          </p>
        </section>

        <p className="text-xs text-gray-400 mt-8 border-t border-gray-200 pt-6">
          Data sources: ABS Census 2021, ABS SEIFA 2021, Modified Monash Model
          2023, Clean Energy Regulator 2024, derived refinery distances
          (Lytton QLD, Geelong VIC). Profile engine: SPEC-003.
        </p>
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────

function IndicatorRow({
  name,
  dataKey,
  source,
  vintage,
  description,
}: {
  name: string;
  dataKey: string;
  source: string;
  vintage: string;
  description: string;
}) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2.5 pr-3">
        <span className="font-medium text-gray-900">{name}</span>
        <span className="block text-xs text-gray-400 font-mono">{dataKey}</span>
      </td>
      <td className="py-2.5 px-3">{source}</td>
      <td className="py-2.5 px-3">{vintage}</td>
      <td className="py-2.5 pl-3">{description}</td>
    </tr>
  );
}

function MappingRow({
  condition,
  domain,
}: {
  condition: string;
  domain: string;
}) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2.5 pr-4 text-gray-900">{condition}</td>
      <td className="py-2.5 pl-4 font-medium text-amber-700">{domain}</td>
    </tr>
  );
}
