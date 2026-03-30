import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Signal } from "../types";

// Mock all signal modules — default return resolves to null so safe() gets a Promise
vi.mock("../fuel-reserves-expanded", () => ({
  fetchProductReserves: vi.fn().mockResolvedValue(null),
  fetchIeaCompliance: vi.fn().mockResolvedValue(null),
  fetchStockVolumes: vi.fn().mockResolvedValue(null),
}));
vi.mock("../energy-policy-news", () => ({ fetchEnergyPolicyNews: vi.fn().mockReturnValue(null) }));
vi.mock("../wa-fuelwatch", () => ({
  fetchWaFuel: vi.fn().mockResolvedValue(null),
  computeRetailMargin: vi.fn().mockReturnValue(null),
}));
vi.mock("../nsw-fuelcheck", () => ({ fetchNswFuel: vi.fn().mockResolvedValue(null) }));
vi.mock("../farm-inputs", () => ({ fetchFarmInputs: vi.fn().mockResolvedValue(null) }));
vi.mock("../brent-crude", () => ({ fetchBrentCrude: vi.fn().mockResolvedValue(null) }));
vi.mock("../asx-energy", () => ({ fetchAsxEnergy: vi.fn().mockResolvedValue(null) }));
vi.mock("../asx-food", () => ({ fetchAsxFood: vi.fn().mockResolvedValue(null) }));
vi.mock("../aud-usd", () => ({ fetchAudUsd: vi.fn().mockResolvedValue(null) }));
vi.mock("../crack-spread", () => ({ fetchCrackSpread: vi.fn().mockResolvedValue(null) }));
vi.mock("../aemo-electricity", () => ({ fetchAemoElectricity: vi.fn().mockResolvedValue(null) }));
vi.mock("../aip-tgp", () => ({
  fetchAipDieselTgp: vi.fn().mockResolvedValue(null),
  fetchAipPetrolTgp: vi.fn().mockResolvedValue(null),
}));
vi.mock("../food-basket", () => ({ fetchFoodBasket: vi.fn().mockResolvedValue(null) }));
vi.mock("../supermarket-prices", () => ({ fetchSupermarketPrices: vi.fn().mockReturnValue(null) }));
vi.mock("../cascade-pressure", () => ({ computeCascadePressure: vi.fn().mockReturnValue(null) }));
vi.mock("../rba-cash-rate", () => ({ fetchRbaCashRate: vi.fn().mockResolvedValue(null) }));
vi.mock("../nsw-rfs", () => ({ fetchNswRfs: vi.fn().mockResolvedValue(null) }));
vi.mock("../vic-emv", () => ({ fetchVicEmv: vi.fn().mockResolvedValue(null) }));

import { fetchSignals } from "../index";
import { fetchWaFuel } from "../wa-fuelwatch";
import { fetchNswFuel } from "../nsw-fuelcheck";
import { fetchBrentCrude } from "../brent-crude";

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    label: "Test signal",
    value: "test",
    trend: "stable",
    source: "Test",
    context: "Test context",
    lastUpdated: new Date().toISOString(),
    automated: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchSignals aggregator", () => {
  it("returns a valid lastFetched ISO timestamp", async () => {
    const before = new Date().toISOString();
    const result = await fetchSignals();
    const after = new Date().toISOString();

    expect(result.lastFetched >= before).toBe(true);
    expect(result.lastFetched <= after).toBe(true);
  });

  it("includes live signals when fetchers succeed", async () => {
    const liveWa = makeSignal({ label: "WA fuel retail" });
    const liveBrent = makeSignal({ label: "Brent crude oil" });

    vi.mocked(fetchWaFuel).mockResolvedValue(liveWa);
    vi.mocked(fetchBrentCrude).mockResolvedValue(liveBrent);

    const result = await fetchSignals();

    expect(result.signals.waFuel).toBe(liveWa);
    expect(result.signals.brentCrude).toBe(liveBrent);
  });

  it("excludes optional signals when they return null", async () => {
    vi.mocked(fetchWaFuel).mockResolvedValue(null);
    vi.mocked(fetchNswFuel).mockResolvedValue(null);
    vi.mocked(fetchBrentCrude).mockResolvedValue(null);

    const result = await fetchSignals();

    expect(result.signals.waFuel).toBeUndefined();
    expect(result.signals.nswFuel).toBeUndefined();
    expect(result.signals.brentCrude).toBeUndefined();
  });

it("gracefully handles rejected promises via safe() wrapper", async () => {
    vi.mocked(fetchWaFuel).mockRejectedValue(new Error("timeout"));

    const result = await fetchSignals();

    // Should not throw — safe() converts rejections to null
    expect(result.lastFetched).toBeTruthy();
    expect(result.signals.waFuel).toBeUndefined();
  });
});
