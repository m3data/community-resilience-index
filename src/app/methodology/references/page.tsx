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
              target="_blank"
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
              target="_blank"
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
              target="_blank"
              rel="noopener noreferrer"
            >
              doi:10.1787/9789264043466-en
            </a>
          </li>
        </ol>
      </section>

      <section id="domain-evidence">
        <h2>Exposure Domain Evidence Base</h2>
        <p>
          The exposure mapping rules draw on the following domain-specific
          research and regulatory data. These sources ground the thresholds
          and cost relationships used in the algorithmic exposure weights.
        </p>

        <h3>Fuel &amp; Transport</h3>
        <ol className="reference-list">
          <li id="ref-accc-fuel-2023">
            Australian Competition &amp; Consumer Commission (2023).{' '}
            <em>Report on the Australian petroleum market: December quarter 2023</em>.
            ACCC. [Diesel share of road freight costs: 30&ndash;40%.
            Wholesale&ndash;retail margin analysis. Regional price differentials.]
          </li>
          <li id="ref-bitre-freight-2022">
            Bureau of Infrastructure and Transport Research Economics (2022).{' '}
            <em>Road freight estimates and forecasts</em>. BITRE.
            [Freight cost structure: fuel as proportion of operating costs.
            Distance-based cost modelling for regional supply chains.]
          </li>
          <li id="ref-accc-fuel-security">
            Australian Competition &amp; Consumer Commission (2024).{' '}
            <em>Inquiry into the National Anti-Profiteering Mechanism: Interim Report</em>.
            [Ampol, Viva, BP, Mobil pricing conduct. Vertical integration
            in Australian fuel supply.]
          </li>
          <li id="ref-iea-australia-2023">
            International Energy Agency (2023).{' '}
            <em>Australia 2023: Energy Policy Review</em>. IEA.
            [90-day stockholding obligation. Import dependency ~90%.
            MSO structure and reporting methodology.]
          </li>
        </ol>

        <h3>Food &amp; Agriculture</h3>
        <ol className="reference-list">
          <li id="ref-abares-outlook-2024">
            Australian Bureau of Agricultural and Resource Economics and Sciences (2024).{' '}
            <em>Agricultural Commodities: March quarter 2024</em>. ABARES.
            [Farm input cost transmission. Fertiliser import dependency.
            Freight share of retail food cost: 8&ndash;12% average,
            ~15% for fresh produce, ~6% for shelf-stable.]
          </li>
          <li id="ref-abs-cpi-methodology">
            Australian Bureau of Statistics (2024).{' '}
            <em>Consumer Price Index: Concepts, Sources and Methods</em>.
            ABS Cat. No. 6461.0. [Food sub-group CPI methodology.
            Quarterly measurement. Seasonal adjustment.]
          </li>
        </ol>

        <h3>Electricity &amp; Grid</h3>
        <ol className="reference-list">
          <li id="ref-aemo-nem-2024">
            Australian Energy Market Operator (2024).{' '}
            <em>Quarterly Energy Dynamics Q4 2024</em>. AEMO.
            [NEM dispatch pricing. Gas-peaker marginal price setting.
            Renewable generation negative pricing.]
          </li>
        </ol>

        <h3>Economic &amp; Housing</h3>
        <ol className="reference-list">
          <li id="ref-rba-transmission-2023">
            Reserve Bank of Australia (2023).{' '}
            <em>The Transmission of Monetary Policy</em>. RBA Bulletin.
            [Cash rate to mortgage rate transmission lag: 4&ndash;6 weeks.
            Compound stress on households with existing housing pressure.]
          </li>
          <li id="ref-abs-seifa-2021">
            Australian Bureau of Statistics (2023).{' '}
            <em>Socio-Economic Indexes for Areas (SEIFA) 2021</em>.
            ABS Cat. No. 2033.0.55.001. [IRSD methodology.
            Postcode-level socioeconomic classification.]
          </li>
        </ol>

        <h3>Emergency Services</h3>
        <ol className="reference-list">
          <li id="ref-nsw-rfs-data">
            NSW Rural Fire Service (2024).{' '}
            <em>NSW RFS Major Incidents GeoJSON Feed</em>.
            [Incident classification: Emergency Warning, Watch and Act, Advice.
            Live feed, ~30 minute refresh.]
          </li>
          <li id="ref-vic-emv-data">
            Emergency Management Victoria (2024).{' '}
            <em>OSOM Public GeoJSON Feed</em>.
            [Incident severity weighting. Active status classification.
            Live feed, ~5 minute refresh.]
          </li>
        </ol>

        <h3>Diversity &amp; Concentration</h3>
        <ol className="reference-list">
          <li id="ref-shannon-1948">
            Shannon, C.E. (1948). A mathematical theory of communication.{' '}
            <em>The Bell System Technical Journal</em>, 27(3),
            379&ndash;423. [Shannon diversity index: original formulation
            applied here to industry employment and transport mode diversity.]
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
              <td>Station availability (gap detection)</td>
              <td>WA FuelWatch + NSW FuelCheck</td>
              <td>Daily snapshot</td>
              <td>WA + NSW (~10,800 stations)</td>
            </tr>
            <tr>
              <td>Energy policy news</td>
              <td>Google News RSS (filtered)</td>
              <td>Twice daily</td>
              <td>National</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
    </div>
  );
}
