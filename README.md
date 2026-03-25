# Community Resilience Index

Postcode-level resilience intelligence for Australian communities. Live at [australia.communityresilienceindex.net](https://australia.communityresilienceindex.net).

## What it does

Two layers of information for citizens trying to understand how exposed their community is to supply chain disruption:

1. **Structural scoring** — postcode-level composite index combining baseline capacity (economic diversity, infrastructure, social cohesion) with crisis exposure (remoteness, refinery distance, fuel pricing). 3,193 postcodes scored.

2. **Live signals** — fuel reserves, diesel prices, demand-side pressure, farm input costs, food prices, news coverage. Sourced from public APIs and government data. Updated daily. We show the official numbers and name the gaps the government doesn't.

## Why

Australia imports ~90% of its refined fuel. It has been non-compliant with the IEA's 90-day reserve obligation since 2012 — the only member nation failing this requirement. Government headline reserve figures include fuel on water, in pipelines, and in the exclusive economic zone. Actual onshore controllable reserves are lower than reported.

Citizens deserve higher fidelity information.

## Tech

Next.js 16, Tailwind v4, TypeScript. Scoring engine is pure (no I/O, deterministic). Signals layer fetches from DCCEEW, ABS, AIP, FuelWatch, Google News. Manual signals (demand pressure, farm inputs) update via `src/data/manual-signals.json`.

## Methodology

Adapted from the [INFORM Risk Index](https://drmkc.jrc.ec.europa.eu/inform-index) (JRC European Commission). Full methodology at [australia.communityresilienceindex.net/methodology](https://australia.communityresilienceindex.net/methodology).

## Licence

Code: CC BY-SA 4.0. Data sourced under CC BY 4.0 (ABS, INFORM).

---

Built by [EarthianLabs](https://github.com/m3data). Research connection: transformative adaptation under systemic stress.
