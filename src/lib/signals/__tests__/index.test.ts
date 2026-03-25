import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Signal } from "../types";

// Mock all 5 signal modules before importing the aggregator
vi.mock("../abs-cpi", () => ({
  fetchFoodCpi: vi.fn(),
}));
vi.mock("../diesel-price", () => ({
  fetchDieselPrice: vi.fn(),
}));
vi.mock("../fuel-reserves", () => ({
  fetchFuelReserves: vi.fn(),
}));
vi.mock("../wa-fuelwatch", () => ({
  fetchWaDiesel: vi.fn(),
}));
vi.mock("../news-volume", () => ({
  fetchNewsVolume: vi.fn(),
}));

import { fetchSignals } from "../index";
import { fetchFoodCpi } from "../abs-cpi";
import { fetchDieselPrice } from "../diesel-price";
import { fetchFuelReserves } from "../fuel-reserves";
import { fetchWaDiesel } from "../wa-fuelwatch";
import { fetchNewsVolume } from "../news-volume";

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
  it("includes all live signals when all fetchers succeed", async () => {
    const liveReserves = makeSignal({ label: "Fuel reserves" });
    const liveDiesel = makeSignal({ label: "Diesel terminal gate price" });
    const liveFood = makeSignal({ label: "Food price pressure" });
    const liveWa = makeSignal({ label: "WA diesel price" });
    const liveNews = makeSignal({ label: "News coverage volume" });

    vi.mocked(fetchFuelReserves).mockResolvedValue(liveReserves);
    vi.mocked(fetchDieselPrice).mockResolvedValue(liveDiesel);
    vi.mocked(fetchFoodCpi).mockResolvedValue(liveFood);
    vi.mocked(fetchWaDiesel).mockResolvedValue(liveWa);
    vi.mocked(fetchNewsVolume).mockResolvedValue(liveNews);

    const result = await fetchSignals();

    expect(result.lastFetched).toBeTruthy();
    expect(result.signals.reserves).toBe(liveReserves);
    expect(result.signals.diesel).toBe(liveDiesel);
    expect(result.signals.food).toBe(liveFood);
    expect(result.signals.waDiesel).toBe(liveWa);
    expect(result.signals.newsVolume).toBe(liveNews);
    // Only automated signals — no manual signals in output
    expect(result.signals.strait).toBeUndefined();
    expect(result.signals.freight).toBeUndefined();
    expect(result.signals.social).toBeUndefined();
  });

  it("substitutes fallbacks for all null signals", async () => {
    vi.mocked(fetchFuelReserves).mockResolvedValue(null);
    vi.mocked(fetchDieselPrice).mockResolvedValue(null);
    vi.mocked(fetchFoodCpi).mockResolvedValue(null);
    vi.mocked(fetchWaDiesel).mockResolvedValue(null);
    vi.mocked(fetchNewsVolume).mockResolvedValue(null);

    const result = await fetchSignals();

    // Fallback signals are not automated
    expect(result.signals.reserves.automated).toBe(false);
    expect(result.signals.reserves.value).toBe("~24 days");
    expect(result.signals.diesel.automated).toBe(false);
    expect(result.signals.diesel.value).toBe("Unavailable");
    expect(result.signals.food.automated).toBe(false);
    expect(result.signals.food.value).toBe("Unavailable");
    // waDiesel and newsVolume are excluded entirely when null (not in fallbacks)
    expect(result.signals.waDiesel).toBeUndefined();
    expect(result.signals.newsVolume).toBeUndefined();
    // No manual signals in output
    expect(result.signals.strait).toBeUndefined();
    expect(result.signals.freight).toBeUndefined();
    expect(result.signals.social).toBeUndefined();
  });

  it("uses mix of live and fallback signals", async () => {
    const liveDiesel = makeSignal({ label: "Diesel terminal gate price", automated: true });
    const liveWa = makeSignal({ label: "WA diesel price", automated: true });

    vi.mocked(fetchFuelReserves).mockResolvedValue(null);
    vi.mocked(fetchDieselPrice).mockResolvedValue(liveDiesel);
    vi.mocked(fetchFoodCpi).mockResolvedValue(null);
    vi.mocked(fetchWaDiesel).mockResolvedValue(liveWa);
    vi.mocked(fetchNewsVolume).mockResolvedValue(null);

    const result = await fetchSignals();

    // Live signals used where available
    expect(result.signals.diesel).toBe(liveDiesel);
    expect(result.signals.diesel.automated).toBe(true);
    expect(result.signals.waDiesel).toBe(liveWa);

    // Fallbacks used where fetch returned null
    expect(result.signals.reserves.automated).toBe(false);
    expect(result.signals.food.automated).toBe(false);

    // Optional signals excluded when null
    expect(result.signals.newsVolume).toBeUndefined();
  });

  it("only includes automated signals and their fallbacks", async () => {
    vi.mocked(fetchFuelReserves).mockResolvedValue(null);
    vi.mocked(fetchDieselPrice).mockResolvedValue(null);
    vi.mocked(fetchFoodCpi).mockResolvedValue(null);
    vi.mocked(fetchWaDiesel).mockResolvedValue(null);
    vi.mocked(fetchNewsVolume).mockResolvedValue(null);

    const result = await fetchSignals();

    // Core signals fall back gracefully
    expect(result.signals.reserves).toBeDefined();
    expect(result.signals.diesel).toBeDefined();
    expect(result.signals.food).toBeDefined();
    // No manual/crisis-specific signals
    expect(result.signals.strait).toBeUndefined();
    expect(result.signals.freight).toBeUndefined();
    expect(result.signals.social).toBeUndefined();
  });

  it("returns a valid lastFetched ISO timestamp", async () => {
    vi.mocked(fetchFuelReserves).mockResolvedValue(null);
    vi.mocked(fetchDieselPrice).mockResolvedValue(null);
    vi.mocked(fetchFoodCpi).mockResolvedValue(null);
    vi.mocked(fetchWaDiesel).mockResolvedValue(null);
    vi.mocked(fetchNewsVolume).mockResolvedValue(null);

    const before = new Date().toISOString();
    const result = await fetchSignals();
    const after = new Date().toISOString();

    expect(result.lastFetched >= before).toBe(true);
    expect(result.lastFetched <= after).toBe(true);
  });
});
