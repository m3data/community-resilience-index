import type { Signal, SignalSet } from "./types";
import { fetchFoodCpi } from "./abs-cpi";
// AIP API broken (returns HTML), QLD CKAN is monthly historical (weeks behind).
// Neither gives near-real-time prices. Disabled until a live source is available.
// WA FuelWatch is the only reliable live diesel signal.
// import { fetchDieselPrice } from "./diesel-price";
import { fetchFuelReserves } from "./fuel-reserves";
import { fetchProductReserves, fetchIeaCompliance, fetchStockVolumes } from "./fuel-reserves-expanded";
import { fetchEnergyPolicyNews } from "./energy-policy-news";
import { fetchWaDiesel, fetchWaPetrol, computeRetailMargin } from "./wa-fuelwatch";
import { fetchNewsVolume } from "./news-volume";
import { fetchNswDiesel } from "./nsw-fuelcheck";
import { fetchStationAvailability } from "./station-availability";
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
import { fetchSupermarketPrices } from "./supermarket-prices";

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

/** Wrap a signal fetch so a rejected promise returns null instead of crashing the batch */
function safe<T>(p: Promise<T | null>): Promise<T | null> {
  return p.catch(() => null);
}

export async function fetchSignals(): Promise<SignalSet> {
  // Fetch all signals in parallel — each wrapped so failures degrade gracefully
  // Station availability is sync (reads local files) — call outside Promise.all
  const stationAvailability = fetchStationAvailability();

  const [
    reserves, productReserves, ieaCompliance, stockVolumes, energyPolicyNews,
    food, foodBasket, supermarketPrices, waDiesel, waPetrol, nswDiesel, newsVolume, farmInputs,
    brentCrude, asxEnergy, asxFood, audUsd, crackSpread, aemoElectricity,
    dieselTgp, petrolTgp,
    rbaCashRate, nswRfs, vicEmv,
  ] = await Promise.all([
    // Existing signals
    safe(fetchFuelReserves()),
    // Layer 2: DCCEEW expanded — product breakdown, IEA compliance, stock volumes
    safe(fetchProductReserves()),
    safe(fetchIeaCompliance()),
    safe(fetchStockVolumes()),
    safe(Promise.resolve(fetchEnergyPolicyNews())),
    safe(fetchFoodCpi()),
    safe(fetchFoodBasket()),
    safe(Promise.resolve(fetchSupermarketPrices())),
    safe(fetchWaDiesel()),
    safe(fetchWaPetrol()),
    safe(fetchNswDiesel()),
    safe(fetchNewsVolume()),
    safe(fetchFarmInputs()),
    // Layer 1: Upstream market signals
    safe(fetchBrentCrude()),
    safe(fetchAsxEnergy()),
    safe(fetchAsxFood()),
    safe(fetchAudUsd()),
    safe(fetchCrackSpread()),
    // Layer 2: Supply position
    safe(fetchAemoElectricity()),
    // Layer 3: Wholesale price transmission
    safe(fetchAipDieselTgp()),
    safe(fetchAipPetrolTgp()),
    // Layer 5: Macro indicators
    safe(fetchRbaCashRate()),
    // Layer 6: Emergency feeds
    safe(fetchNswRfs()),
    safe(fetchVicEmv()),
  ]);

  // Assemble primary signals first
  const primarySignals: Record<string, Signal> = {
    // Existing signals
    reserves: reserves ?? FALLBACK_SIGNALS.reserves,
    ...(stationAvailability ? { stationAvailability } : {}),
    ...(waDiesel ? { waDiesel } : {}),
    ...(waPetrol ? { waPetrol } : {}),
    ...(nswDiesel ? { nswDiesel } : {}),
    food: food ?? FALLBACK_SIGNALS.food,
    ...(foodBasket ? { foodBasket } : {}),
    ...(supermarketPrices ? { supermarketPrices } : {}),
    ...(farmInputs ? { farmInputs } : {}),
    ...(newsVolume ? { newsVolume } : {}),
    // Layer 1: Upstream market signals
    ...(brentCrude ? { brentCrude } : {}),
    ...(asxEnergy ? { asxEnergy } : {}),
    ...(asxFood ? { asxFood } : {}),
    ...(audUsd ? { audUsd } : {}),
    ...(crackSpread ? { crackSpread } : {}),
    // Layer 2: Supply position
    ...(productReserves ? { productReserves } : {}),
    ...(ieaCompliance ? { ieaCompliance } : {}),
    ...(stockVolumes ? { stockVolumes } : {}),
    ...(energyPolicyNews ? { energyPolicyNews } : {}),
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
