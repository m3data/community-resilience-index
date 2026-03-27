# Community Resilience Index

Postcode-level resilience intelligence for Australian communities. Live at [australia.communityresilienceindex.net](https://australia.communityresilienceindex.net).

## What it does

Enter a postcode. Get your community's exposure profile: what structural characteristics shape your vulnerability, which pressures reach you hardest, what to do about them, and which signals to watch.

Three layers of intelligence:

1. **Structural profile** — per-postcode characteristics from official data (car dependency, refinery distance, industry diversity, remoteness, housing stress, solar capacity, SEIFA). These are the shape of your community. They explain why some pressures hit you harder than others.

2. **Exposure mapping** — algorithmic computation of how exposed your community is across six domains (fuel, food, electricity, economic, housing, emergency). Driven by structural data, not opinion. Transparent rules, auditable logic.

3. **Live signals** — fuel reserves, diesel prices, crude oil, refining margins, electricity wholesale prices, food and agriculture equities, farm input costs, RBA cash rate, AUD/USD, emergency feeds. Sourced from public APIs and government data. Contextualised per-postcode: the same signal means different things for a remote mining town versus an inner-suburban commuter belt.

Actions are computed from exposure weights, structural drivers, and diversity. The top three things to do are shown inline, ranked by urgency.

## Why

Australia imports ~90% of its refined fuel. It has been non-compliant with the IEA's 90-day reserve obligation since 2012 — the only member nation failing this requirement. Government headline reserve figures include fuel on water, in pipelines, and in the exclusive economic zone. Actual onshore controllable reserves are lower than reported.

Citizens deserve higher fidelity information about how systemic pressures reach their communities.

## Methodology

Structural data from ABS Census 2021, SEIFA 2021, Modified Monash Model 2023, Clean Energy Regulator, and derived refinery distance calculations. Exposure mapping uses algorithmic rules (not ML or LLM generation) documented in SPEC-003. Diversity measured via Shannon index. Coherence/entrainment spectrum distinguishes between communities that can reorganise under stress and those locked into brittle dependencies. Full methodology at [australia.communityresilienceindex.net/methodology](https://australia.communityresilienceindex.net/methodology).

## Tech

Next.js 16, Tailwind v4, TypeScript. Profile engine is deterministic (algorithmic exposure weights, parameterised contextualisation templates). Signals layer fetches from DCCEEW, ABS, FuelWatch, Yahoo Finance, AEMO, Google News. Manual signals (demand pressure, farm inputs) update via `src/data/manual-signals.json`.

## Licence

Code: CC BY-SA 4.0. Data sourced under CC BY 4.0 (ABS).

---

Built by [Mat Mytka](https://moralimagineer.com) / [EarthianLabs](https://github.com/m3data). Research connection: transformative adaptation under systemic stress.
