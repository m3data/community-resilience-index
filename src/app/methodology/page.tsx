/**
 * /methodology — Overview page
 *
 * SPEC-001 REQ-020, CON-002
 * Audience: Community Organiser (clear, no jargon)
 * Content: Sections 1.1–1.4 of SPEC-001, rewritten for plain-language accessibility
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the Community Resilience Index measures structural resilience. Two-layer architecture combining baseline capacity (BRIC) with crisis exposure (INFORM).",
};

export default function MethodologyOverview() {
  return (
    <main className="methodology-page">
      <h1>How We Measure Community Resilience</h1>

      <nav className="methodology-nav" aria-label="Methodology sections">
        <a href="/methodology/indicators">Indicator Catalogue</a>
        <a href="/methodology/validation">Validation</a>
        <a href="/methodology/references">References</a>
      </nav>

      <section id="what-we-measure">
        <h2>What This Index Measures</h2>
        <p>
          The Community Resilience Index answers two questions for every
          Australian postcode:
        </p>
        <ol>
          <li>
            <strong>How strong is your community&rsquo;s foundation?</strong>
            &mdash; the social networks, economic diversity, housing, and
            institutional support that exist <em>before</em> any crisis hits.
          </li>
          <li>
            <strong>How hard is the current crisis hitting your area?</strong>
            &mdash; the specific pressures your community faces right now, like
            fuel supply distance, transport dependency, and cost-of-living
            exposure.
          </li>
        </ol>
        <p>
          These two questions need separate answers because the actions that
          follow are different. A community with a strong foundation under heavy
          pressure needs to activate what it already has. A community with a
          weak foundation and low pressure has time to build capacity before
          the next shock.
        </p>
      </section>

      <section id="two-layers">
        <h2>Two Layers, Not One Number</h2>
        <p>
          Most resilience tools produce a single score. We deliberately do not.
          A single number hides the most useful information: whether your
          community&rsquo;s challenges are structural (long-term, buildable) or
          situational (crisis-specific, immediate).
        </p>

        <h3>Layer 1: Baseline Resilience (BRIC)</h3>
        <p>
          The first layer measures your community&rsquo;s pre-existing capacity
          across six areas, which researchers call &ldquo;capitals&rdquo;:
        </p>
        <ul>
          <li>
            <strong>Social</strong> &mdash; education levels, language access,
            socioeconomic advantage
          </li>
          <li>
            <strong>Economic</strong> &mdash; income, employment, industry mix,
            housing affordability
          </li>
          <li>
            <strong>Community</strong> &mdash; volunteering, community
            organisations, civic participation
          </li>
          <li>
            <strong>Institutional</strong> &mdash; proximity to hospitals,
            emergency services, government service points
          </li>
          <li>
            <strong>Housing &amp; Infrastructure</strong> &mdash; internet
            access, dwelling quality, transport options
          </li>
          <li>
            <strong>Environmental</strong> &mdash; agricultural land, green
            space, water security
          </li>
        </ul>
        <p>
          This layer uses the BRIC framework (Baseline Resilience Indicators
          for Communities), the most widely replicated method for measuring
          community resilience globally, with over 30 peer-reviewed studies.
          It draws on Australian Bureau of Statistics Census data and other
          official sources.
        </p>
        <p>
          The baseline score ranges from 0 to 6. Higher means more structural
          resilience. This score changes slowly &mdash; it reflects conditions
          that take years to build or erode.
        </p>

        <h3>Layer 2: Crisis Pressure (INFORM)</h3>
        <p>
          The second layer measures how hard a specific crisis is pressing on
          your community. It uses the INFORM framework (Index for Risk
          Management), developed by the European Commission for humanitarian
          risk assessment, adapted here for Australian supply chain disruption.
        </p>
        <p>Three dimensions:</p>
        <ul>
          <li>
            <strong>Exposure</strong> &mdash; how far your community is from
            fuel supply, how remote it is, local fuel pricing
          </li>
          <li>
            <strong>Sensitivity</strong> &mdash; how dependent your community
            is on the things being disrupted (car dependency, housing stress,
            agricultural workforce reliance)
          </li>
          <li>
            <strong>Lack of Coping Capacity</strong> &mdash; what buffers your
            community lacks (public transport, solar power, internet, local
            food production, community infrastructure)
          </li>
        </ul>
        <p>
          The crisis pressure score ranges from 0 to 10. Higher means more
          pressure. This score can change faster as crisis conditions evolve.
        </p>
      </section>

      <section id="quadrant">
        <h2>Putting It Together: Four Situations</h2>
        <p>
          Your community&rsquo;s baseline resilience and crisis pressure
          combine into one of four situations, each pointing to different
          actions:
        </p>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Lower Crisis Pressure</th>
              <th>Higher Crisis Pressure</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Higher Resilience</strong>
              </td>
              <td>
                <strong>Monitor</strong> &mdash; your community has capacity
                and low current pressure. Stay prepared.
              </td>
              <td>
                <strong>Stress-Tested</strong> &mdash; capacity exists and
                it&rsquo;s being drawn on. Activate mutual support.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Lower Resilience</strong>
              </td>
              <td>
                <strong>Structurally Fragile</strong> &mdash; not currently
                acute but one shock away. Build capacity now.
              </td>
              <td>
                <strong>Critical Priority</strong> &mdash; low capacity under
                high pressure. Immediate mutual support and long-term capacity
                building needed.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="coherence-vs-entrainment">
        <h2>Coherence vs Entrainment: Why Diversity Matters</h2>
        <p>
          This is where our index differs from standard resilience
          measurements. Most indices treat all forms of community strength as
          equal. A postcode where 90% of workers are in one industry scores
          the same on &ldquo;employment rate&rdquo; as one where workers are
          spread across many industries. Both look resilient by that measure.
        </p>
        <p>
          But they fail differently. The single-industry community is
          <strong>entrained</strong> &mdash; locked into one dependency. It
          looks stable right up until that industry contracts, at which point
          everything falls apart at once. There is nothing else to reorganise
          around.
        </p>
        <p>
          The diverse-industry community is <strong>coherent</strong> &mdash;
          its parts are connected but not locked together. When one sector
          struggles, others can absorb the shock. People have options. The
          community can reorganise.
        </p>
        <p>
          This distinction &mdash; between brittle stability (entrainment) and
          adaptive stability (coherence) &mdash; runs through our index.
          Wherever the data allows, we measure not just <em>how much</em> of
          something a community has, but <em>how diverse</em> those holdings
          are:
        </p>
        <ul>
          <li>
            <strong>Economic:</strong> not just employment levels, but industry
            diversity (are jobs spread across sectors?)
          </li>
          <li>
            <strong>Transport:</strong> not just car ownership, but transport
            mode diversity (can people get around without a car?)
          </li>
          <li>
            <strong>Community:</strong> not just organisation count, but
            organisational type diversity (are there many kinds of community
            groups?)
          </li>
          <li>
            <strong>Environment:</strong> not just agricultural land, but land
            use diversity (is there variety in how land is used?)
          </li>
        </ul>
        <p>
          Diversity indicators are weighted slightly higher than volume
          indicators within each capital. This means a community with moderate
          employment across five industries is scored as more resilient than
          one with high employment concentrated in a single industry. This is
          a deliberate methodological choice grounded in research on coupled
          systems and adaptive capacity.
        </p>
      </section>

      <section id="how-scores-work">
        <h2>How Scores Are Calculated</h2>
        <p>
          Every indicator is compared against all Australian postcodes and
          scaled to a common range so that different measurements (dollars,
          percentages, distances) can be combined fairly. For most indicators,
          this is a simple minimum-to-maximum scaling. For indicators with
          extreme outliers (e.g. one very remote postcode stretching the
          scale), we use a ranking method instead.
        </p>
        <p>
          Within each capital or pillar, indicators are combined using a
          weighted average. The weights reflect how important each indicator
          is to that dimension of resilience, informed by the academic
          literature and the coherence/entrainment lens described above. All
          weights are documented in the{' '}
          <a href="/methodology/indicators">indicator catalogue</a>.
        </p>
        <p>
          The six baseline capital scores are summed (range 0&ndash;6). The
          three crisis pillar scores are combined using a geometric mean
          (range 0&ndash;10), which prevents one low-pressure pillar from
          masking a high-pressure one.
        </p>
      </section>

      <section id="confidence">
        <h2>Data Confidence</h2>
        <p>
          Every score comes with a confidence rating. This tells you how much
          to trust the number based on three factors: the authority of the
          data source (official statistics vs estimates), how recently it was
          collected, and how complete the coverage is for your postcode.
        </p>
        <p>
          When data is missing for some indicators, remaining indicators carry
          more weight and the confidence score drops accordingly. We always
          show you what data is available and what is pending &mdash; a partial
          picture honestly labelled is more useful than a complete-looking
          picture hiding its gaps.
        </p>
      </section>

      <section id="limitations">
        <h2>Limitations</h2>
        <ul>
          <li>
            Most baseline data comes from the 2021 Census. Communities change.
            The index measures structural conditions as of that snapshot.
          </li>
          <li>
            The index uses statistical proxies. &ldquo;Distance to nearest
            hospital&rdquo; is not the same as &ldquo;quality of local
            healthcare.&rdquo; We measure what the data can tell us, and we
            name what it cannot.
          </li>
          <li>
            Small score differences between postcodes may not be meaningful.
            Focus on the overall pattern and quadrant classification rather
            than precise score comparisons.
          </li>
          <li>
            Some capitals (Institutional, Environmental) have limited data
            in the current version and are flagged with reduced confidence.
          </li>
        </ul>
      </section>

      <section id="quality-framework">
        <h2>Quality Framework</h2>
        <p>
          This index follows the OECD/JRC Handbook on Constructing Composite
          Indicators (2008), which provides a ten-step quality standard for
          index construction. The England BRIC adaptation (Camacho et al. 2024)
          achieved full compliance with this standard. We target the same
          level of methodological rigour. See{' '}
          <a href="/methodology/validation">validation</a> for details on
          how the index is tested.
        </p>
      </section>
    </main>
  );
}
