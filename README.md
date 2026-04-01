# Community Resilience Index

![Repo Status](https://img.shields.io/badge/REPO_STATUS-Active_Research-blue?style=for-the-badge&labelColor=8b5e3c&color=e5dac1)
![Version](https://img.shields.io/badge/VERSION-0.1.1-blue?style=for-the-badge&labelColor=3b82f6&color=1e40af)
![License](https://img.shields.io/badge/LICENSE-AGPL--3.0-green?style=for-the-badge&labelColor=10b981&color=047857)
![Next.js](https://img.shields.io/badge/NEXT.JS-16-black?style=for-the-badge&labelColor=171717&color=000000)
![TypeScript](https://img.shields.io/badge/TYPESCRIPT-5-blue?style=for-the-badge&labelColor=3178c6&color=235a97)

Postcode-level resilience intelligence for Australian communities. Live at [australia.communityresilienceindex.net](https://australia.communityresilienceindex.net).

## What it does

Enter a postcode. Get your community's exposure profile: what structural characteristics shape your vulnerability, which pressures reach you hardest, what to do about them, and which signals to watch.

Three layers of intelligence:

1. **Structural profile** — per-postcode characteristics from official data (car dependency, industry diversity, remoteness, housing stress, solar capacity, socioeconomic position). These are the shape of your community. They explain why some pressures hit you harder than others.

2. **Exposure mapping** — algorithmic computation of how exposed your community is across six domains (fuel, food, electricity, economic, housing, emergency). Driven by structural data, not opinion. Transparent rules, auditable logic.

3. **Live signals** — 20+ automated feeds across a 6-layer cascade model. Upstream market pressure (Brent crude, crack spread, AUD/USD, ASX energy and food equities), supply position (DCCEEW fuel reserves, AEMO electricity, energy policy news), wholesale prices (AIP terminal gate prices), retail impact (WA FuelWatch, NSW FuelCheck, station availability, supermarket prices, food basket CPI), downstream cascade (RBA cash rate, farm inputs), and emergency feeds (NSW RFS, VIC EMV). Each signal shows its temporal window so you know what you're looking at.

Actions are computed from exposure weights, structural drivers, and diversity. The top three things to do are shown inline, ranked by urgency.

## Signal architecture

Signals are organised as a cascading failure early warning system. Pressure propagates through layers:

```
Layer 1: Upstream pressure     Brent crude, crack spread, AUD/USD, ASX equities
    ↓
Layer 2: Supply position       DCCEEW reserves, AEMO electricity, energy policy
    ↓
Layer 3: Wholesale prices      AIP terminal gate prices (diesel + petrol, city-level)
    ↓
Layer 4: Retail impact         WA/NSW fuel prices, station availability, food prices
    ↓
Layer 5: Downstream cascade    RBA cash rate, farm input costs
    ↓
Layer 6: Emergency             NSW RFS bushfires, VIC EMV incidents
```

**Station availability** is a proxy signal built from daily snapshots of WA FuelWatch (~1,100 stations) and NSW FuelCheck (~5,600 stations). Gap detection compares consecutive days to identify stations that stopped reporting. Other states lack public station-level reporting.

The signals page caches for 5 minutes. Individual API fetches have per-source revalidation windows (5 min for AEMO, 15 min for market data, 1 hour for wholesale prices, 24 hours for quarterly statistics). All external fetches have timeouts and graceful degradation.

## Why

Australia imports ~90% of its refined fuel. It has been non-compliant with the IEA's 90-day reserve obligation since 2012 — the only member nation failing this requirement. Government headline reserve figures include fuel on water, in pipelines, and in the exclusive economic zone. Actual onshore controllable reserves are lower than reported.

Citizens deserve higher fidelity information about how systemic pressures reach their communities.

## Methodology

Structural data from ABS Census 2021, SEIFA 2021, Modified Monash Model 2023, and Clean Energy Regulator. Exposure mapping uses algorithmic rules (not ML or LLM generation) documented in SPEC-003. Diversity measured via Shannon index. Coherence/entrainment spectrum distinguishes between communities that can reorganise under stress and those locked into brittle dependencies.

Full methodology at [australia.communityresilienceindex.net/methodology](https://australia.communityresilienceindex.net/methodology).

## Tech

- **Framework:** Next.js 16 (app router, React 19, Turbopack)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript 5
- **Icons:** Phosphor Icons (duotone, SSR imports)
- **Data parsing:** ExcelJS for DCCEEW/AIP XLSX files
- **Fonts:** Fraunces (headings), DM Sans (body), DM Mono (code)

Profile engine is deterministic — algorithmic exposure weights, parameterised contextualisation templates. No ML, no LLM generation.

Signal layer fetches from: Yahoo Finance, DCCEEW (data.gov.au CKAN), ABS (SDMX API), WA FuelWatch (RSS), NSW FuelCheck (CKAN), AIP (XLSX), AEMO (Visualisations API), RBA (CSV), NSW RFS (GeoJSON), VIC EMV (GeoJSON), Google News (RSS).

Daily automated refresh via launchd agent (6am, runs on wake): supermarket price scraping, energy news, station snapshots. Auto-commits and pushes to trigger Vercel deploy.

## Test coverage

337 tests across 21 test files. All passing. ~830ms.

| Area | Tests |
|------|-------|
| Scoring engine (BRIC, INFORM, quadrant, normalise, diversity, confidence, weights) | ~200 |
| Profile API (`/api/profile`) | 28 |
| Score API (`/api/score`) | ~10 |
| Data loader | ~15 |
| Layer 1 signals (brent, asx-energy, asx-food, aud-usd, crack-spread) | 28 |
| Layer 2-6 signals (aemo, rba, nsw-rfs, vic-emv, food-basket) | 25 |
| Signal aggregator | 7 |
| Station availability (gap detection) | 6 |
| WA FuelWatch, NSW FuelCheck, ABS CPI, fuel reserves, news volume | ~18 |

```bash
npm test
```

## Data sources

| Source | Frequency | Auth required |
|--------|-----------|---------------|
| ABS Census 2021 | Static (next: Aug 2026) | No |
| ABS SEIFA 2021 | Static | No |
| ABS CPI (SDMX) | Quarterly | No |
| Modified Monash Model 2023 | Annual | No |
| Clean Energy Regulator | Annual | No |
| DCCEEW Petroleum Statistics | Weekly | No |
| AIP Terminal Gate Prices | Daily | No |
| WA FuelWatch | Daily | No |
| NSW FuelCheck | Daily | No |
| Yahoo Finance | Intraday (delayed) | No |
| AEMO NEM | 5-minute dispatch | No |
| RBA Statistical Tables | Monthly | No |
| NSW RFS | Live feed | No |
| VIC EMV | Live feed | No |
| Google News RSS | Rolling | No |
| Coles/Woolworths prices | Manual scrape | No |

All data sources are public and free. No API keys required.

## Licence

**Code:** [AGPL-3.0](LICENSE). If you modify and serve this over a network, you must share your source.

**Content** (methodology text, documentation): CC BY-SA 4.0.

**Data** sourced under CC BY 4.0 (ABS, DCCEEW). INFORM methodology: JRC, CC BY 4.0.

---

Built by [Mat Mytka](https://moralimagineer.com) / [EarthianLabs](https://github.com/m3data). Research connection: transformative adaptation under systemic stress.
