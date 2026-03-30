import type { Signal, SignalSet } from "./types";
// Removed: fetchFoodCpi (redundant with foodBasket), fetchFuelReserves (redundant with per-product),
// fetchNewsVolume (redundant with energyPolicyNews)
import { fetchProductReserves, fetchIeaCompliance, fetchStockVolumes } from "./fuel-reserves-expanded";
import { fetchEnergyPolicyNews } from "./energy-policy-news";
import { fetchWaFuel, computeRetailMargin } from "./wa-fuelwatch";
import { fetchNswFuel } from "./nsw-fuelcheck";
// Station availability removed from signals page — gap detection needs more data before it's meaningful
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


/** Wrap a signal fetch so a rejected promise returns null instead of crashing the batch */
function safe<T>(p: Promise<T | null>): Promise<T | null> {
  return p.catch(() => null);
}

export async function fetchSignals(): Promise<SignalSet> {
  // Fetch all signals in parallel — each wrapped so failures degrade gracefully
  const [
    productReserves, ieaCompliance, stockVolumes, energyPolicyNews,
    foodBasket, supermarketPrices, waFuel, nswFuel, farmInputs,
    brentCrude, asxEnergy, asxFood, audUsd, crackSpread, aemoElectricity,
    dieselTgp, petrolTgp,
    rbaCashRate, nswRfs, vicEmv,
  ] = await Promise.all([
    // Layer 2: DCCEEW — product breakdown, IEA compliance, stock volumes
    safe(fetchProductReserves()),
    safe(fetchIeaCompliance()),
    safe(fetchStockVolumes()),
    safe(Promise.resolve(fetchEnergyPolicyNews())),
    // Layer 4: Retail impact — food
    safe(fetchFoodBasket()),
    safe(Promise.resolve(fetchSupermarketPrices())),
    // Layer 4: Retail impact — fuel
    safe(fetchWaFuel()),
    safe(fetchNswFuel()),
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

  // Assemble primary signals
  const primarySignals: Record<string, Signal> = {
    ...(waFuel ? { waFuel } : {}),
    ...(nswFuel ? { nswFuel } : {}),
    ...(foodBasket ? { foodBasket } : {}),
    ...(supermarketPrices ? { supermarketPrices } : {}),
    ...(farmInputs ? { farmInputs } : {}),
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
