import type { Signal, SignalSet } from "./types";
import { fetchFoodCpi } from "./abs-cpi";
// AIP API broken (returns HTML), QLD CKAN is monthly historical (weeks behind).
// Neither gives near-real-time prices. Disabled until a live source is available.
// WA FuelWatch is the only reliable live diesel signal.
// import { fetchDieselPrice } from "./diesel-price";
import { fetchFuelReserves } from "./fuel-reserves";
import { fetchWaDiesel, fetchWaPetrol, computeRetailMargin } from "./wa-fuelwatch";
import { fetchNewsVolume } from "./news-volume";
// NSW FuelCheck: real-time API requires OneGov API key (free registration).
// OAuth token endpoint currently returning empty responses (NSW govt issue).
// See nsw-fuelcheck.ts for implementation — ready to enable when auth works.
// import { fetchNswDiesel } from "./nsw-fuelcheck";
import { fetchDemandPressure } from "./demand-pressure";
import { fetchFarmInputs } from "./farm-inputs";

// Tier 1 signal modules — direct API integrations (no scraping)
import { fetchBrentCrude } from "./brent-crude";
import { fetchAsxEnergy } from "./asx-energy";
import { fetchAsxFood } from "./asx-food";
import { fetchAudUsd } from "./aud-usd";
import { fetchCrackSpread } from "./crack-spread";
import { fetchAemoElectricity } from "./aemo-electricity";
import { fetchRbaCashRate } from "./rba-cash-rate";
import { fetchNswRfs } from "./nsw-rfs";
import { fetchVicEmv } from "./vic-emv";

// Layer 3: Wholesale price transmission
import { fetchAipDieselTgp, fetchAipPetrolTgp } from "./aip-tgp";

// Layer 4: Retail impact — food basket
import { fetchFoodBasket } from "./food-basket";

// Derived: Cascade pressure indicator (synthesised from other signals)
import { computeCascadePressure } from "./cascade-pressure";

// Fallback values — used when automated APIs are unreachable
const FALLBACK_SIGNALS: Record<string, Signal> = {
  reserves: {
    label: "Fuel reserves (headline)",
    value: "~30 days",
    trend: "down",
    source: "DCCEEW Petroleum Statistics",
    context:
      "Australia holds less than the IEA's recommended 90-day minimum — the only IEA member failing this obligation since 2012. Net import dependency ~90%. These are MSO headline figures that include fuel on water, in pipelines, and in Australia's exclusive economic zone. Actual onshore controllable reserves are materially lower.",
    lastUpdated: null,
    automated: false,
  },
  food: {
    label: "Food price index",
    value: "Unavailable",
    trend: "stable",
    source: "ABS CPI",
    context:
      "Food prices reflect transport, energy, and input costs across the supply chain. Communities with fewer local food sources and lower household buffers are more exposed to price movements.",
    lastUpdated: null,
    automated: false,
  },
};

export async function fetchSignals(): Promise<SignalSet> {
  // Fetch all signals in parallel — existing + Tier 1
  const [
    reserves, food, foodBasket, waDiesel, waPetrol, newsVolume, demandPressure, farmInputs,
    brentCrude, asxEnergy, asxFood, audUsd, crackSpread, aemoElectricity,
    dieselTgp, petrolTgp,
    rbaCashRate, nswRfs, vicEmv,
  ] = await Promise.all([
    // Existing signals
    fetchFuelReserves(),
    fetchFoodCpi(),
    fetchFoodBasket(),
    fetchWaDiesel(),
    fetchWaPetrol(),
    fetchNewsVolume(),
    fetchDemandPressure(),
    fetchFarmInputs(),
    // Layer 1: Upstream market signals
    fetchBrentCrude(),
    fetchAsxEnergy(),
    fetchAsxFood(),
    fetchAudUsd(),
    fetchCrackSpread(),
    // Layer 2: Supply position
    fetchAemoElectricity(),
    // Layer 3: Wholesale price transmission
    fetchAipDieselTgp(),
    fetchAipPetrolTgp(),
    // Layer 5: Macro indicators
    fetchRbaCashRate(),
    // Layer 6: Emergency feeds
    fetchNswRfs(),
    fetchVicEmv(),
  ]);

  // Assemble primary signals first
  const primarySignals: Record<string, Signal> = {
    // Existing signals
    reserves: reserves ?? FALLBACK_SIGNALS.reserves,
    ...(demandPressure ? { demandPressure } : {}),
    ...(waDiesel ? { waDiesel } : {}),
    ...(waPetrol ? { waPetrol } : {}),
    food: food ?? FALLBACK_SIGNALS.food,
    ...(foodBasket ? { foodBasket } : {}),
    ...(farmInputs ? { farmInputs } : {}),
    ...(newsVolume ? { newsVolume } : {}),
    // Layer 1: Upstream market signals
    ...(brentCrude ? { brentCrude } : {}),
    ...(asxEnergy ? { asxEnergy } : {}),
    ...(asxFood ? { asxFood } : {}),
    ...(audUsd ? { audUsd } : {}),
    ...(crackSpread ? { crackSpread } : {}),
    // Layer 2: Supply position
    ...(aemoElectricity ? { aemoElectricity } : {}),
    // Layer 3: Wholesale price transmission
    ...(dieselTgp ? { dieselTgp } : {}),
    ...(petrolTgp ? { petrolTgp } : {}),
    // Layer 5: Macro indicators
    ...(rbaCashRate ? { rbaCashRate } : {}),
    // Layer 6: Emergency feeds
    ...(nswRfs ? { nswRfs } : {}),
    ...(vicEmv ? { vicEmv } : {}),
  };

  // Derived signals — synthesised from primary signals
  const cascadePressure = computeCascadePressure(primarySignals);
  const retailMargin = computeRetailMargin(primarySignals);

  return {
    lastFetched: new Date().toISOString(),
    signals: {
      ...primarySignals,
      ...(retailMargin ? { retailMargin } : {}),
      ...(cascadePressure ? { cascadePressure } : {}),
    },
  };
}

export type { Signal, SignalSet } from "./types";
