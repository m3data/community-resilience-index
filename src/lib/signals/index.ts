import type { Signal, SignalSet } from "./types";
import { fetchFoodCpi } from "./abs-cpi";
// AIP API broken (returns HTML), QLD CKAN is monthly historical (weeks behind).
// Neither gives near-real-time prices. Disabled until a live source is available.
// WA FuelWatch is the only reliable live diesel signal.
// import { fetchDieselPrice } from "./diesel-price";
import { fetchFuelReserves } from "./fuel-reserves";
import { fetchWaDiesel } from "./wa-fuelwatch";
import { fetchNewsVolume } from "./news-volume";
// NSW FuelCheck: real-time API requires OneGov API key (free registration).
// OAuth token endpoint currently returning empty responses (NSW govt issue).
// See nsw-fuelcheck.ts for implementation — ready to enable when auth works.
// import { fetchNswDiesel } from "./nsw-fuelcheck";
import { fetchDemandPressure } from "./demand-pressure";
import { fetchFarmInputs } from "./farm-inputs";

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
  // Fetch all signals in parallel
  const [reserves, food, waDiesel, newsVolume, demandPressure, farmInputs] =
    await Promise.all([
      fetchFuelReserves(),
      fetchFoodCpi(),
      fetchWaDiesel(),
      fetchNewsVolume(),
      fetchDemandPressure(),
      fetchFarmInputs(),
    ]);

  return {
    lastFetched: new Date().toISOString(),
    signals: {
      reserves: reserves ?? FALLBACK_SIGNALS.reserves,
      ...(demandPressure ? { demandPressure } : {}),
      ...(waDiesel ? { waDiesel } : {}),
      food: food ?? FALLBACK_SIGNALS.food,
      ...(farmInputs ? { farmInputs } : {}),
      ...(newsVolume ? { newsVolume } : {}),
    },
  };
}

export type { Signal, SignalSet } from "./types";
