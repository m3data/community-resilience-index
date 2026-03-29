/**
 * /methodology — Overview page
 *
 * SPEC-003 methodology documentation.
 * Audience: Community Organiser (clear, no jargon)
 * Content: Exposure profile approach — structural shape, exposure mapping, contextualised signals
 */

import type { Metadata } from "next";
import { MethodologyNav } from "./components/MethodologyNav";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the Community Resilience Index builds exposure profiles. Structural data, algorithmic exposure mapping, contextualised signals, and coherence analysis.",
};

export default function MethodologyOverview() {
  return (
    <div>
      <section className="bg-green-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <p className="text-amber-500 font-medium text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3">
            Methodology
          </p>
          <h1 className="font-heading text-2xl sm:text-4xl font-bold leading-tight">
            How We Build Exposure Profiles
          </h1>
          <p className="mt-3 sm:mt-4 text-green-100 text-base sm:text-lg max-w-2xl">
            Structural data, algorithmic exposure mapping, contextualised signals,
            and coherence analysis. No black boxes.
          </p>
        </div>
      </section>

      <MethodologyNav />

      <main className="methodology-page">

      <section id="what-we-measure">
        <h2>What This Tool Does</h2>
        <p>
          The Community Resilience Index builds an exposure profile for every
          Australian postcode. It answers three questions:
        </p>
        <ol>
          <li>
            <strong>What is your community&rsquo;s structural shape?</strong>
            &mdash; the characteristics that determine how pressures reach you:
            car dependency, distance from fuel supply, industry concentration,
            remoteness, housing affordability, energy independence.
          </li>
          <li>
            <strong>Which pressures hit your community hardest?</strong>
            &mdash; algorithmic exposure mapping across six domains: fuel,
            food, electricity, economic, housing, emergency. Driven by
            structural data, not opinion.
          </li>
          <li>
            <strong>What should you do and what should you watch?</strong>
            &mdash; actions ranked by urgency and live signals contextualised
            to your specific community.
          </li>
        </ol>
        <p>
          We deliberately do not produce a single composite score. A number
          hides the most useful information: <em>why</em> your community is
          exposed and <em>what</em> you can do about it. A profile shows the
          shape of your exposure. Shape is actionable; a number is not.
        </p>
      </section>

      <section id="three-layers">
        <h2>Three Layers, Not One Score</h2>

        <h3>Layer 1: Structural Profile</h3>
        <p>
          We extract up to 11 characteristics per postcode from official
          Australian data:
        </p>
        <ul>
          <li>
            <strong>Car dependency</strong> &mdash; proportion of commuters
            who drive (ABS Census 2021)
          </li>
          <li>
            <strong>Refinery distance</strong> &mdash; kilometres to the
            nearest operating refinery (derived)
          </li>
          <li>
            <strong>Industry diversity</strong> &mdash; Shannon index across
            employment sectors (ABS Census 2021)
          </li>
          <li>
            <strong>Agricultural workforce</strong> &mdash; proportion in
            agriculture, forestry, fishing (ABS Census 2021)
          </li>
          <li>
            <strong>Remoteness</strong> &mdash; Modified Monash Model
            category (ABS 2023)
          </li>
          <li>
            <strong>Housing stress</strong> &mdash; proportion of households
            spending &gt;30% of income on housing (ABS Census 2021)
          </li>
          <li>
            <strong>Solar capacity</strong> &mdash; installed kW per postcode
            (Clean Energy Regulator 2024)
          </li>
          <li>
            <strong>Socioeconomic index (IRSD)</strong> &mdash; ABS SEIFA
            2021
          </li>
          <li>
            <strong>Median household income</strong> &mdash; weekly (ABS
            Census 2021)
          </li>
          <li>
            <strong>Transport mode diversity</strong> &mdash; Shannon index
            across commute modes (ABS Census 2021)
          </li>
          <li>
            <strong>Internet access</strong> &mdash; proportion of dwellings
            connected (ABS Census 2021)
          </li>
        </ul>
        <p>
          Each characteristic is compared against all Australian postcodes
          so you can see where your community sits nationally. The 2&ndash;3
          characteristics that deviate most from the national median are
          surfaced as your community&rsquo;s most distinctive features.
        </p>

        <h3>Layer 2: Exposure Mapping</h3>
        <p>
          Structural characteristics are mapped to exposure domains using
          transparent, algorithmic rules grounded in published research from
          the{' '}
          <a href="https://www.accc.gov.au/by-industry/petrol-and-fuel" className="text-green-700 underline underline-offset-2">ACCC</a>,{' '}
          <a href="https://www.bitre.gov.au/" className="text-green-700 underline underline-offset-2">BITRE</a>,{' '}
          <a href="https://www.agriculture.gov.au/abares" className="text-green-700 underline underline-offset-2">ABARES</a>,{' '}
          and the{' '}
          <a href="https://www.rba.gov.au/" className="text-green-700 underline underline-offset-2">RBA</a>.
          These are not machine-learned or LLM-generated. Every rule is
          documented and auditable. Full evidence base on the{' '}
          <a href="/methodology/references#domain-evidence" className="text-green-700 underline underline-offset-2">references page</a>.
        </p>
        <table>
          <thead>
            <tr>
              <th>If your community has&hellip;</th>
              <th>Your exposure increases in&hellip;</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>High car dependency (&gt;60%)</td>
              <td>Fuel &amp; transport</td>
            </tr>
            <tr>
              <td>Far from refinery (&gt;500km)</td>
              <td>Fuel &amp; transport, supply chain disruption</td>
            </tr>
            <tr>
              <td>High agricultural workforce (&gt;10%)</td>
              <td>Food &amp; agriculture</td>
            </tr>
            <tr>
              <td>Remote/very remote (MMM 5+)</td>
              <td>Food, fuel, emergency</td>
            </tr>
            <tr>
              <td>Low solar capacity</td>
              <td>Electricity &amp; grid</td>
            </tr>
            <tr>
              <td>High housing stress (&gt;30%)</td>
              <td>Economic pressure, housing affordability</td>
            </tr>
            <tr>
              <td>Low median income</td>
              <td>Economic pressure</td>
            </tr>
          </tbody>
        </table>
        <p>
          Each domain receives an exposure weight between 0 and 1. Domains
          are ranked so you see your highest exposures first. Every weight
          includes a plain-language explanation of what&rsquo;s driving it.
        </p>

        <h3>Layer 3: Contextualised Signals</h3>
        <p>
          Live data feeds are ranked by relevance to your community&rsquo;s
          structural profile. The same signal means different things in
          different places:
        </p>
        <ul>
          <li>
            A crude oil price spike matters more in a postcode with 80% car
            dependency and 800km from a refinery than in an inner-city area
            with strong public transport.
          </li>
          <li>
            Farm input cost increases hit harder in communities where 15% of
            workers are in agriculture.
          </li>
          <li>
            RBA rate changes compound most in postcodes with high housing
            stress.
          </li>
        </ul>
        <p>
          Signal context is generated using parameterised templates &mdash;
          deterministic, auditable text that fills in your community&rsquo;s
          actual values. No generative AI is used.
        </p>
      </section>

      <section id="actions">
        <h2>How Actions Are Generated</h2>
        <p>
          Actions are computed from exposure weights, structural drivers,
          and diversity analysis. The formula:
        </p>
        <p>
          <code>
            action_urgency = base_score &times; exposure_weight &times;
            (1 + entrainment_penalty)
          </code>
        </p>
        <p>
          Where <strong>base_score</strong> reflects how critical the action
          type is inherently, <strong>exposure_weight</strong> is how exposed
          your specific postcode is in that domain, and{' '}
          <strong>entrainment_penalty</strong> increases urgency for
          communities with concentrated dependencies (0.0 for diversified,
          0.15 for moderate, 0.3 for concentrated).
        </p>
        <p>
          Actions are categorised as <em>Household</em> (things you can do
          alone), <em>Community</em> (things that need collective action),
          or <em>Advocacy</em> (things that need structural change). They
          are time-sequenced: <em>Do now</em>, <em>This month</em>,{' '}
          <em>Ongoing</em>.
        </p>
      </section>

      <section id="coherence-vs-entrainment">
        <h2>Concentrated or Diversified: Why This Matters</h2>
        <p>
          This is where our approach differs from standard resilience tools.
          Most indices treat all forms of community strength as equal. A
          postcode where 90% of workers are in one industry scores the same
          on &ldquo;employment rate&rdquo; as one where workers are spread
          across many industries. Both look resilient by that measure.
        </p>
        <p>
          But they fail differently. The single-industry community is
          <strong> concentrated</strong> &mdash; locked into one dependency. It
          looks stable right up until that industry contracts, at which point
          everything falls apart at once. There is nothing else to reorganise
          around.
        </p>
        <p>
          The diverse-industry community is <strong>diversified</strong> &mdash;
          its parts are connected but not locked together. When one sector
          struggles, others can absorb the shock. People have options. The
          community can reorganise.
        </p>
        <p>
          We measure diversity using the Shannon diversity index across
          industry employment and transport modes. Higher diversity means
          more ways for a community to reorganise under stress. This is
          presented as a spectrum, not a binary.
        </p>
        <p>
          Diversity directly affects the urgency of recommended actions.
          Communities with concentrated dependencies face a higher
          entrainment penalty in the action ranking formula, because when
          their dominant system fails there is no fallback.
        </p>
      </section>

      <section id="cascade">
        <h2>Cascade Timeline Estimates</h2>
        <p>
          When global prices change, communities don&rsquo;t feel it
          immediately. Crude oil takes weeks to reach the bowser. Farm input
          costs take months to flow through to food prices. Rate changes take
          weeks to hit mortgage repayments.
        </p>
        <p>
          We provide estimated propagation timelines for each domain,
          adjusted for remoteness. These are based on supply chain structure,
          ACCC fuel monitoring data, AEMO market analysis, ABARES commodity
          reports, and RBA transmission research. They are estimates and
          projections, not precise forecasts.
        </p>
      </section>

      <section id="data-sources">
        <h2>Data Sources and Vintage</h2>
        <p>
          Most structural data comes from the 2021 Census. This is a
          five-year-old snapshot. Communities change. The index measures
          structural conditions as of that collection point. The 2026
          Census (August) will provide a significant refresh.
        </p>
        <p>
          Non-census sources (solar capacity, remoteness classification) are
          more recent (2023&ndash;2024). Live signals are fetched in real-time
          from public APIs.
        </p>
        <p>
          Every data point on the profile page includes its source and
          vintage. We show what data is available and name what is missing
          &mdash; a partial picture honestly labelled is more useful than a
          complete-looking picture hiding its gaps.
        </p>
      </section>

      <section id="limitations">
        <h2>Limitations</h2>
        <ul>
          <li>
            Most structural data is from the 2021 Census &mdash; five years
            old. Communities change. Treat structural characteristics as a
            baseline, not a current snapshot.
          </li>
          <li>
            Exposure mapping uses algorithmic rules that may not capture
            every local factor. A community next to a military base or major
            logistics hub may have supply chain resilience not reflected in
            the census data.
          </li>
          <li>
            Cascade timeline estimates are based on industry structure and
            historical patterns, not real-time supply chain monitoring.
            Actual propagation depends on market conditions, contracts, and
            policy interventions.
          </li>
          <li>
            Signal data depends on public API availability. Some feeds
            (notably state fuel price APIs) are intermittently unreliable.
            We show the last successful fetch time.
          </li>
          <li>
            Actions are computed from structural data and exposure rules.
            They are starting points for community conversation, not
            prescriptions. Local knowledge matters more than any index.
          </li>
        </ul>
      </section>
    </main>
    </div>
  );
}
