/**
 * /methodology/references — Academic citations
 *
 * SPEC-001 REQ-020, CON-002
 * Audience: Researcher / Journalist
 * Content: SPEC-001 References section — full academic citations for all
 *          frameworks and methods used in the Community Resilience Index.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "References",
  description:
    "Academic citations for the Community Resilience Index methodology: BRIC framework, INFORM model, ABS Census data, and coherence/entrainment analysis.",
};

export default function References() {
  return (
    <main className="methodology-page">
      <h1>References</h1>

      <nav className="methodology-nav" aria-label="Methodology sections">
        <a href="/methodology">Overview</a>
        <a href="/methodology/indicators">Indicator Catalogue</a>
        <a href="/methodology/validation">Validation</a>
      </nav>

      <section id="primary-frameworks">
        <h2>Primary Frameworks</h2>
        <ol className="reference-list">
          <li id="ref-cutter-2010">
            Cutter, S.L., Burton, C.G., Emrich, C.T. (2010). Disaster
            resilience indicators for benchmarking baseline conditions.{' '}
            <em>
              Journal of Homeland Security and Emergency Management
            </em>
            , 7(1).
          </li>
          <li id="ref-cutter-2014">
            Cutter, S.L., Ash, K.D., Emrich, C.T. (2014). The geographies of
            community disaster resilience.{' '}
            <em>Global Environmental Change</em>, 29, 65&ndash;77.
          </li>
          <li id="ref-de-groeve-2016">
            De Groeve, T., Poljan&scaron;ek, K., Ehrlich, D. (2016). INFORM:
            Methodology for the Index for Risk Management. JRC European
            Commission.
          </li>
          <li id="ref-cutter-2008">
            Cutter, S.L., Barnes, L., Berry, M. et al. (2008). A place-based
            model for understanding community resilience to natural disasters.{' '}
            <em>Global Environmental Change</em>, 18(4), 598&ndash;606.
            (DROP model)
          </li>
        </ol>
      </section>

      <section id="bric-adaptations">
        <h2>BRIC Systematic Review &amp; Adaptations</h2>
        <ol className="reference-list">
          <li id="ref-camacho-2023">
            Camacho, C., Bunn, F., Wooding, N. (2023). Measurement of
            community resilience using the BRIC framework: A systematic review.{' '}
            <em>International Journal of Disaster Risk Reduction</em>, 95,
            103870.{' '}
            <a
              href="https://doi.org/10.1016/j.ijdrr.2023.103870"
              rel="noopener noreferrer"
            >
              doi:10.1016/j.ijdrr.2023.103870
            </a>
          </li>
          <li id="ref-camacho-2024">
            Camacho, C., Wooding, N., Shervin, F. et al. (2024). Adapting
            BRIC for England: Development of a Community Resilience Index.{' '}
            <em>
              International Journal of Environmental Research and Public Health
            </em>
            , 21(8), 1012.{' '}
            <a
              href="https://doi.org/10.3390/ijerph21081012"
              rel="noopener noreferrer"
            >
              doi:10.3390/ijerph21081012
            </a>
          </li>
        </ol>
      </section>

      <section id="quality-framework">
        <h2>Quality Framework</h2>
        <ol className="reference-list">
          <li id="ref-oecd-2008">
            OECD/JRC (2008). Handbook on Constructing Composite Indicators:
            Methodology and User Guide. OECD Publishing.{' '}
            <a
              href="https://doi.org/10.1787/9789264043466-en"
              rel="noopener noreferrer"
            >
              doi:10.1787/9789264043466-en
            </a>
          </li>
        </ol>
      </section>

      <section id="theoretical-contribution">
        <h2>Coherence/Entrainment Theoretical Frame</h2>
        <ol className="reference-list">
          <li id="ref-mytka-2026">
            Mytka, M. (2026). Cross-substrate coupling in human&ndash;AI
            interaction. SSRN Abstract ID 6439347.
          </li>
        </ol>
      </section>

      <section id="data-sources">
        <h2>Data Sources</h2>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Provider</th>
              <th>Update Frequency</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Census 2021 DataPacks (by POA)</td>
              <td>Australian Bureau of Statistics</td>
              <td>Census cycle (5 years)</td>
              <td>National</td>
            </tr>
            <tr>
              <td>SEIFA 2021 (IRSD by POA)</td>
              <td>Australian Bureau of Statistics</td>
              <td>Census cycle</td>
              <td>National</td>
            </tr>
            <tr>
              <td>Modified Monash Model 2023</td>
              <td>Australian Bureau of Statistics</td>
              <td>Periodic</td>
              <td>National</td>
            </tr>
            <tr>
              <td>CER Postcode Solar Installations</td>
              <td>Clean Energy Regulator</td>
              <td>Quarterly</td>
              <td>National</td>
            </tr>
            <tr>
              <td>FuelWatch</td>
              <td>Government of Western Australia</td>
              <td>Daily</td>
              <td>WA only</td>
            </tr>
            <tr>
              <td>QLD Fuel Prices (CKAN)</td>
              <td>Queensland Government</td>
              <td>Daily</td>
              <td>QLD only</td>
            </tr>
            <tr>
              <td>NSW FuelCheck</td>
              <td>NSW Government</td>
              <td>Daily</td>
              <td>NSW only</td>
            </tr>
            <tr>
              <td>Refinery distances</td>
              <td>Derived (Lytton QLD, Geelong VIC)</td>
              <td>Static</td>
              <td>National</td>
            </tr>
            <tr>
              <td>ACNC Register</td>
              <td>Australian Charities and Not-for-profits Commission</td>
              <td>Annual</td>
              <td>National</td>
            </tr>
            <tr>
              <td>GTFS Transit Feeds</td>
              <td>State transport agencies</td>
              <td>Varies</td>
              <td>State-level</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
