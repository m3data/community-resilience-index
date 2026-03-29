/**
 * /methodology/references — Academic citations
 *
 * Audience: Researcher / Journalist
 * Content: Full academic citations for all frameworks and methods used.
 */

import type { Metadata } from "next";
import { MethodologyNav } from "../components/MethodologyNav";

export const metadata: Metadata = {
  title: "References",
  description:
    "Academic citations for the Community Resilience Index methodology: BRIC framework, INFORM model, exposure profile approach, and coherence/entrainment analysis.",
};

export default function References() {
  return (
    <div>
      <section className="bg-green-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <p className="text-amber-500 font-medium text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3">
            Methodology
          </p>
          <h1 className="font-heading text-2xl sm:text-4xl font-bold leading-tight">
            References
          </h1>
          <p className="mt-3 sm:mt-4 text-green-100 text-base sm:text-lg max-w-2xl">
            Academic citations, data sources, and frameworks.
          </p>
        </div>
      </section>

      <MethodologyNav />

      <main className="methodology-page">

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

        <h3>Structural Profile</h3>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Provider</th>
              <th>Frequency</th>
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
              <td>Annual</td>
              <td>National</td>
            </tr>
            <tr>
              <td>CER Postcode Solar Installations</td>
              <td>Clean Energy Regulator</td>
              <td>Annual</td>
              <td>National</td>
            </tr>
            <tr>
              <td>Refinery distances</td>
              <td>Derived (Lytton QLD, Geelong VIC)</td>
              <td>Static</td>
              <td>National</td>
            </tr>
          </tbody>
        </table>

        <h3>Live Signals</h3>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Provider</th>
              <th>Frequency</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Brent crude, ASX equities, AUD/USD, crack spread</td>
              <td>Yahoo Finance (delayed)</td>
              <td>Intraday</td>
              <td>Global / National</td>
            </tr>
            <tr>
              <td>Petroleum Statistics (reserves, IEA compliance)</td>
              <td>DCCEEW via data.gov.au</td>
              <td>Weekly</td>
              <td>National</td>
            </tr>
            <tr>
              <td>Terminal gate prices (diesel + petrol)</td>
              <td>Australian Institute of Petroleum</td>
              <td>Daily</td>
              <td>National (city-level)</td>
            </tr>
            <tr>
              <td>NEM wholesale electricity</td>
              <td>AEMO Visualisations API</td>
              <td>5-minute dispatch</td>
              <td>NEM regions (5 states)</td>
            </tr>
            <tr>
              <td>FuelWatch (diesel + petrol, station-level)</td>
              <td>Government of Western Australia</td>
              <td>Daily</td>
              <td>WA</td>
            </tr>
            <tr>
              <td>FuelCheck (diesel + petrol, station-level)</td>
              <td>NSW Government (CKAN)</td>
              <td>Daily</td>
              <td>NSW + ACT</td>
            </tr>
            <tr>
              <td>Cash rate target (F1 table)</td>
              <td>Reserve Bank of Australia</td>
              <td>Board meetings</td>
              <td>National</td>
            </tr>
            <tr>
              <td>CPI food sub-groups (SDMX)</td>
              <td>Australian Bureau of Statistics</td>
              <td>Quarterly</td>
              <td>National</td>
            </tr>
            <tr>
              <td>Major bushfire incidents (GeoJSON)</td>
              <td>NSW Rural Fire Service</td>
              <td>Live feed (~30 min)</td>
              <td>NSW</td>
            </tr>
            <tr>
              <td>Emergency incidents (OSOM GeoJSON)</td>
              <td>VIC Emergency Management</td>
              <td>Live feed (~5 min)</td>
              <td>Victoria</td>
            </tr>
            <tr>
              <td>Energy policy news</td>
              <td>Google News RSS (filtered)</td>
              <td>Rolling</td>
              <td>National</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
    </div>
  );
}
