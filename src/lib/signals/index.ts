import type { Signal, SignalSet } from "./types";
// Removed: fetchFoodCpi (redundant with foodBasket), fetchFuelReserves (redundant with per-product),
// fetchNewsVolume (redundant with energyPolicyNews)
import { fetchProductReserves, fetchIeaCompliance, fetchStockVolumes } from "./fuel-reserves-expanded";
import { fetchEnergyPolicyNews } from "./energy-policy-news";
import { fetchWaFuel, computeRetailMargin } from "./wa-fuelwatch";
import { fetchNswFuel } from "./nsw-fuelcheck";
import { fetchStationAvailability } from "./station-availability";
import { fetchFarmInputs } from "./farm-inputs";
import { fetchAbaresFertiliser } from "./abares-fertiliser";

// Tier 1 signal modules — direct API integrations (no scraping)
import { fetchBrentCrude } from "./brent-crude";
import { fetchAsxEnergy } from "./asx-energy";
import { fetchAsxFood } from "./asx-food";
import { fetchAudUsd } from "./aud-usd";
import { fetchCrackSpread } from "./crack-spread";
import { fetchFreightIndex } from "./freight-index";
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

// Derived: Price chain transparency (where your fuel money goes)
import { computePriceChain } from "./price-chain";


/** Wrap a signal fetch so a rejected promise returns null instead of crashing the batch */
function safe<T>(p: Promise<T | null>): Promise<T | null> {
  return p.catch(() => null);
}

export async function fetchSignals(): Promise<SignalSet> {
  // Fetch all signals in parallel — each wrapped so failures degrade gracefully
  const [
    productReserves, ieaCompliance, stockVolumes, energyPolicyNews,
    foodBasket, supermarketPrices, waFuel, nswFuel, stationAvailability, farmInputs,
    abaresFertiliser,
    brentCrude, asxEnergy, asxFood, audUsd, crackSpread, freightIndex, aemoElectricity,
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
    safe(Promise.resolve(fetchStationAvailability())),
    safe(fetchFarmInputs()),
    // Layer 5: ABARES farm commodity prices
    safe(fetchAbaresFertiliser()),
    // Layer 1: Upstream market signals
    safe(fetchBrentCrude()),
    safe(fetchAsxEnergy()),
    safe(fetchAsxFood()),
    safe(fetchAudUsd()),
    safe(fetchCrackSpread()),
    safe(fetchFreightIndex()),
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
    ...(stationAvailability ? { stationAvailability } : {}),
    ...(foodBasket ? { foodBasket } : {}),
    ...(supermarketPrices ? { supermarketPrices } : {}),
    ...(farmInputs ? { farmInputs } : {}),
    ...(abaresFertiliser ? { abaresFertiliser } : {}),
    // Layer 1: Upstream market signals
    ...(brentCrude ? { brentCrude } : {}),
    ...(asxEnergy ? { asxEnergy } : {}),
    ...(asxFood ? { asxFood } : {}),
    ...(audUsd ? { audUsd } : {}),
    ...(crackSpread ? { crackSpread } : {}),
    ...(freightIndex ? { freightIndex } : {}),
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
  const priceChain = computePriceChain(primarySignals);

  return {
    lastFetched: new Date().toISOString(),
    signals: {
      ...primarySignals,
      ...(retailMargin ? { retailMargin } : {}),
      ...(priceChain ? { priceChain } : {}),
      ...(cascadePressure ? { cascadePressure } : {}),
    },
  };
}

export type { Signal, SignalSet } from "./types";
