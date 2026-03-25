/**
 * /methodology/indicators — Full indicator catalogue
 *
 * SPEC-001 REQ-020, CON-002
 * Audience: Researcher (technical depth)
 * Content: SPEC-001 Section 4 (REQ-001 through REQ-011) — every indicator
 *          with source, rationale, weight, direction, and confidence metadata.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indicator Catalogue",
  description:
    "Full catalogue of indicators used in the Community Resilience Index: sources, weights, directions, and confidence metadata for all six capitals.",
};

export default function IndicatorCatalogue() {
  return (
    <main className="methodology-page">
      <h1>Indicator Catalogue</h1>

      <nav className="methodology-nav" aria-label="Methodology sections">
        <a href="/methodology">Overview</a>
        <a href="/methodology/validation">Validation</a>
        <a href="/methodology/references">References</a>
      </nav>

      <p>
        This page documents every indicator used in the Community Resilience
        Index, organised by layer and component. Each table shows the
        indicator name, data source, measurement direction, weight within its
        component, and normalisation method. Weights marked with{' '}
        <strong>*</strong> reflect the coherence/entrainment adjustment
        (ADR-003) where diversity indicators are weighted above the baseline.
      </p>

      <section id="normalisation">
        <h2>Normalisation Methods</h2>
        <p>
          All indicators are normalised across the full set of Australian
          postcodes before aggregation. Two methods are used:
        </p>
        <ul>
          <li>
            <strong>Min-max</strong>: <code>(value - min) / (max - min)</code>,
            scaled to 0&ndash;1 (BRIC) or 0&ndash;10 (INFORM). Default method.
          </li>
          <li>
            <strong>Percentile-rank</strong>:{' '}
            <code>percentile_rank(value) / 100</code>. Used when skewness
            exceeds 2.0 across all postcodes, to prevent outlier distortion.
          </li>
        </ul>
        <p>
          The method applied to each indicator is determined automatically at
          build time based on distribution shape. For &ldquo;lower is
          better&rdquo; indicators, the normalised value is inverted so that
          higher normalised scores always indicate greater resilience (BRIC) or
          greater crisis pressure (INFORM).
        </p>
      </section>

      <section id="aggregation">
        <h2>Aggregation</h2>
        <ul>
          <li>
            <strong>Within each BRIC capital:</strong> weighted arithmetic mean
            of normalised indicators. Range 0&ndash;1.
          </li>
          <li>
            <strong>BRIC composite:</strong> sum of six capital scores. Range
            0&ndash;6 (Cutter et al. 2010 convention). When fewer capitals are
            available, the sum is proportionally scaled:{' '}
            <code>BRIC = (sum / n_available) &times; 6</code>.
          </li>
          <li>
            <strong>Within each INFORM pillar:</strong> weighted arithmetic
            mean of normalised indicators. Range 0&ndash;10.
          </li>
          <li>
            <strong>INFORM composite:</strong> geometric mean of three pillar
            scores. Range 0&ndash;10 (INFORM convention). Geometric mean
            prevents full compensation across pillars.
          </li>
          <li>
            <strong>Cross-layer:</strong> no aggregation. Separate BRIC and
            INFORM scores with quadrant classification (ADR-002).
          </li>
        </ul>
      </section>

      {/* ── Layer 1: BRIC ──────────────────────────────────────────────── */}

      <h2 id="bric">Layer 1: BRIC Baseline Resilience</h2>

      <section id="social-capital">
        <h3>Social Capital (REQ-001)</h3>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Source</th>
              <th>Direction</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SEIFA IRSD score</td>
              <td>ABS SEIFA 2021 by POA</td>
              <td>Higher = more resilient</td>
              <td>0.30</td>
            </tr>
            <tr>
              <td>Educational attainment (% with post-school qualification)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Higher = more resilient</td>
              <td>0.25</td>
            </tr>
            <tr>
              <td>English language proficiency (% proficient)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Higher = more resilient</td>
              <td>0.20</td>
            </tr>
            <tr>
              <td>Health service access (distance to GP/hospital)</td>
              <td>Derived / DoctorConnect</td>
              <td>Lower distance = more resilient</td>
              <td>0.25</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="economic-capital">
        <h3>Economic Capital (REQ-002)</h3>
        <p>
          Industry diversity is weighted at 0.30 (above the 0.20 baseline) per
          ADR-003. Economic monoculture is a brittleness signal &mdash; the
          coherence/entrainment distinction applied to employment structure.
        </p>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Source</th>
              <th>Direction</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Median household income</td>
              <td>ABS Census 2021 by POA</td>
              <td>Higher = more resilient</td>
              <td>0.20</td>
            </tr>
            <tr>
              <td>Unemployment rate</td>
              <td>ABS Census 2021 by POA</td>
              <td>Lower = more resilient</td>
              <td>0.20</td>
            </tr>
            <tr>
              <td>Industry diversity (Herfindahl index, inverted)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Lower HHI = more diverse = more resilient</td>
              <td>0.30*</td>
            </tr>
            <tr>
              <td>Housing affordability (mortgage/rent as % income, inverted)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Lower = more resilient</td>
              <td>0.15</td>
            </tr>
            <tr>
              <td>Gini coefficient of income (inverted)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Lower = more equal = more resilient</td>
              <td>0.15</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="community-capital">
        <h3>Community Capital (REQ-003)</h3>
        <p>
          Organisational type diversity is weighted above voter turnout per
          ADR-003. Diverse community infrastructure signals coherence.
        </p>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Source</th>
              <th>Direction</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Voluntary work participation rate</td>
              <td>ABS Census 2021 by POA</td>
              <td>Higher = more resilient</td>
              <td>0.35</td>
            </tr>
            <tr>
              <td>Nonprofit/community org density</td>
              <td>ACNC register by postcode</td>
              <td>Higher = more resilient</td>
              <td>0.30</td>
            </tr>
            <tr>
              <td>Voter turnout</td>
              <td>AEC data by division (mapped to POA)</td>
              <td>Higher = more resilient</td>
              <td>0.15</td>
            </tr>
            <tr>
              <td>Organisational type diversity</td>
              <td>Derived from ACNC register</td>
              <td>Higher = more resilient</td>
              <td>0.20*</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="institutional-capital">
        <h3>Institutional Capital (REQ-004)</h3>
        <p>
          Institutional capital is the hardest to source at postcode level. MVP
          uses distance-based proxies. Confidence for this capital is lower
          than for census-derived capitals.
        </p>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Source</th>
              <th>Direction</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Distance to nearest hospital</td>
              <td>OpenStreetMap / NHSD</td>
              <td>Lower = more resilient</td>
              <td>0.30</td>
            </tr>
            <tr>
              <td>Distance to nearest fire/police station</td>
              <td>OpenStreetMap</td>
              <td>Lower = more resilient</td>
              <td>0.25</td>
            </tr>
            <tr>
              <td>Government service delivery points per capita</td>
              <td>Services Australia locations</td>
              <td>Higher = more resilient</td>
              <td>0.25</td>
            </tr>
            <tr>
              <td>Emergency management plan existence (LGA level)</td>
              <td>State emergency management agencies</td>
              <td>Binary (1/0)</td>
              <td>0.20</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="housing-infrastructure-capital">
        <h3>Housing &amp; Infrastructure Capital (REQ-005)</h3>
        <p>
          Transport mode diversity is weighted at 0.30 per ADR-003. A
          community where 90% drive to work is entrained to fuel supply
          &mdash; fragile in a supply chain crisis.
        </p>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Source</th>
              <th>Direction</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Internet connectivity (% with broadband)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Higher = more resilient</td>
              <td>0.20</td>
            </tr>
            <tr>
              <td>Dwelling quality (% owner-occupied, not needing repair)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Higher = more resilient</td>
              <td>0.15</td>
            </tr>
            <tr>
              <td>Transport mode diversity (Shannon index of commute modes)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Higher = more resilient</td>
              <td>0.30*</td>
            </tr>
            <tr>
              <td>Public transport access (GTFS stops within postcode)</td>
              <td>State transport GTFS feeds</td>
              <td>Higher = more resilient</td>
              <td>0.20</td>
            </tr>
            <tr>
              <td>Vacancy rate</td>
              <td>ABS Census 2021 by POA</td>
              <td>Lower = more resilient</td>
              <td>0.15</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="environmental-capital">
        <h3>Environmental Capital (REQ-006)</h3>
        <p>
          Largely deferred to v2 due to data availability. MVP may score this
          capital with reduced confidence or flag as &ldquo;data pending.&rdquo;
        </p>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Source</th>
              <th>Direction</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Agricultural land within LGA</td>
              <td>ABS Agricultural Census</td>
              <td>Higher = more resilient</td>
              <td>0.35</td>
            </tr>
            <tr>
              <td>Green space per capita</td>
              <td>OpenStreetMap derived</td>
              <td>Higher = more resilient</td>
              <td>0.25</td>
            </tr>
            <tr>
              <td>Land use diversity (Shannon index)</td>
              <td>ABS land use data</td>
              <td>Higher = more resilient</td>
              <td>0.25*</td>
            </tr>
            <tr>
              <td>Water security classification</td>
              <td>Bureau of Meteorology / state water authorities</td>
              <td>Higher = more resilient</td>
              <td>0.15</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Layer 2: INFORM ────────────────────────────────────────────── */}

      <h2 id="inform">Layer 2: INFORM Crisis Exposure</h2>

      <p>
        INFORM indicators measure crisis-specific pressure. Higher pillar
        scores indicate greater exposure, sensitivity, or lack of coping
        capacity. Raw values are normalised to 0&ndash;10. For indicators
        where higher raw values are <em>good</em> for the community
        (e.g. solar penetration), the normalised score is inverted so that
        the pillar correctly represents <em>lack</em> of that capacity.
      </p>

      <section id="exposure-pillar">
        <h3>Exposure Pillar (REQ-008)</h3>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Source</th>
              <th>Frequency</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Remoteness (MMM category)</td>
              <td>ABS MMM 2023</td>
              <td>Static</td>
              <td>0.30</td>
            </tr>
            <tr>
              <td>Distance to nearest refinery</td>
              <td>Computed (Lytton, Geelong)</td>
              <td>Static</td>
              <td>0.25</td>
            </tr>
            <tr>
              <td>Local fuel price relative to national average</td>
              <td>WA FuelWatch, QLD CKAN, NSW FuelCheck</td>
              <td>Daily</td>
              <td>0.25</td>
            </tr>
            <tr>
              <td>Fuel station density per capita</td>
              <td>ACCC / scraped</td>
              <td>Monthly</td>
              <td>0.10</td>
            </tr>
            <tr>
              <td>Local fuel availability</td>
              <td>Crowdsource / scrape</td>
              <td>Daily</td>
              <td>0.10</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="sensitivity-pillar">
        <h3>Sensitivity Pillar (REQ-009)</h3>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Source</th>
              <th>Frequency</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SEIFA IRSD (inverted)</td>
              <td>ABS SEIFA 2021 by POA</td>
              <td>Static</td>
              <td>0.30</td>
            </tr>
            <tr>
              <td>Car dependency rate</td>
              <td>ABS Census 2021 by POA</td>
              <td>Static</td>
              <td>0.25</td>
            </tr>
            <tr>
              <td>Housing stress (mortgage/rent as % income)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Static</td>
              <td>0.20</td>
            </tr>
            <tr>
              <td>Agricultural workforce proportion</td>
              <td>ABS Census 2021 by POA</td>
              <td>Static</td>
              <td>0.15</td>
            </tr>
            <tr>
              <td>Distance to nearest supermarket</td>
              <td>Derived</td>
              <td>Static</td>
              <td>0.10</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="lack-of-coping-pillar">
        <h3>Lack of Coping Capacity Pillar (REQ-010)</h3>
        <p>
          All indicators in this pillar measure <em>capacity</em> (higher raw
          value = better). They are inverted during normalisation so the pillar
          score reflects <em>lack</em> of coping capacity, consistent with the
          INFORM convention.
        </p>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Source</th>
              <th>Frequency</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Public transport accessibility (inverted)</td>
              <td>GTFS feeds</td>
              <td>Static</td>
              <td>0.20</td>
            </tr>
            <tr>
              <td>Solar/battery penetration (inverted)</td>
              <td>CER postcode data</td>
              <td>Quarterly</td>
              <td>0.20</td>
            </tr>
            <tr>
              <td>Volunteer density (inverted)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Static</td>
              <td>0.20</td>
            </tr>
            <tr>
              <td>Internet connectivity (inverted)</td>
              <td>ABS Census 2021 by POA</td>
              <td>Static</td>
              <td>0.15</td>
            </tr>
            <tr>
              <td>Community infrastructure density (inverted)</td>
              <td>ABS / OSM</td>
              <td>Static</td>
              <td>0.15</td>
            </tr>
            <tr>
              <td>Local food production potential (inverted)</td>
              <td>ABS Agricultural Census</td>
              <td>Static</td>
              <td>0.10</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Signal Confidence ──────────────────────────────────────────── */}

      <section id="signal-confidence">
        <h2>Signal Confidence Metadata</h2>
        <p>
          Every indicator carries a <code>SignalMeta</code> object recording
          its source, authority level, data freshness, and geographic coverage.
          A composite confidence score (0&ndash;1) is computed per indicator
          using the following weights:
        </p>
        <table>
          <thead>
            <tr>
              <th>Factor</th>
              <th>Weight</th>
              <th>Scoring</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Authority</td>
              <td>0.35</td>
              <td>
                official = 1.0, derived = 0.7, scraped = 0.4, estimated = 0.2
              </td>
            </tr>
            <tr>
              <td>Freshness</td>
              <td>0.35</td>
              <td>
                real-time = 1.0, daily = 0.9, monthly = 0.7, annual = 0.4,
                census = 0.3
              </td>
            </tr>
            <tr>
              <td>Coverage</td>
              <td>0.30</td>
              <td>national = 1.0, state = 0.6, partial = 0.3</td>
            </tr>
          </tbody>
        </table>
        <p>
          Capital and pillar confidence scores are the weighted average of
          their constituent indicators&rsquo; confidence scores. When
          indicators are missing, confidence drops proportionally.
        </p>
      </section>

      {/* ── Missing Data ───────────────────────────────────────────────── */}

      <section id="missing-data">
        <h2>Missing Data Handling</h2>
        <ol>
          <li>
            If a postcode is absent from a dataset, the indicator value is
            NULL.
          </li>
          <li>
            NULL indicators are excluded from the weighted mean for their
            capital or pillar.
          </li>
          <li>
            Remaining indicator weights are renormalised to sum to 1.0.
          </li>
          <li>
            The capital/pillar confidence score is reduced proportionally.
          </li>
          <li>
            If more than 50% of indicators in a capital/pillar are missing,
            the component is flagged as &ldquo;insufficient data&rdquo;
            rather than computed from sparse inputs.
          </li>
        </ol>
      </section>
    </main>
  );
}
