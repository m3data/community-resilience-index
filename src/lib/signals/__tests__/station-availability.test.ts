import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchStationAvailability } from "../station-availability";
import { readFileSync, readdirSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

const baseStation = {
  state: "WA",
  source: "fuelwatch",
  product: "diesel",
  brand: "BP",
  name: "Test Station",
  location: "123 Main St",
  lat: -31.95,
  lng: 115.86,
  price: 265.0,
};

function makeSnapshot(
  date: string,
  stationIds: string[],
  overrides: Record<string, Partial<typeof baseStation>> = {}
) {
  return JSON.stringify({
    date,
    generated: new Date().toISOString(),
    sources: {
      wa_fuelwatch: { diesel: stationIds.length, petrol: 0 },
      nsw_fuelcheck: { diesel: 0, petrol: 0 },
    },
    totalStations: stationIds.length,
    stations: stationIds.map((id) => ({
      ...baseStation,
      id,
      ...(overrides[id] ?? {}),
    })),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchStationAvailability", () => {
  it("returns null when no snapshots exist", () => {
    vi.mocked(readdirSync).mockReturnValue([]);

    const signal = fetchStationAvailability();
    expect(signal).toBeNull();
  });

  it("returns baseline signal with single snapshot", () => {
    vi.mocked(readdirSync).mockReturnValue(["2026-03-29.json"] as any);
    vi.mocked(readFileSync).mockReturnValue(
      makeSnapshot("2026-03-29", ["s1", "s2", "s3"])
    );

    const signal = fetchStationAvailability();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("Station availability");
    expect(signal!.value).toBe("3 reporting");
    expect(signal!.trend).toBe("stable");
    expect(signal!.context).toContain("first snapshot");
  });

  it("detects stations that stopped reporting", () => {
    vi.mocked(readdirSync).mockReturnValue([
      "2026-03-30.json",
      "2026-03-29.json",
    ] as any);

    vi.mocked(readFileSync).mockImplementation((filePath: any) => {
      if (filePath.includes("2026-03-30")) {
        return makeSnapshot("2026-03-30", ["s1", "s2"]); // s3 gone
      }
      return makeSnapshot("2026-03-29", ["s1", "s2", "s3"]);
    });

    const signal = fetchStationAvailability();

    expect(signal).not.toBeNull();
    expect(signal!.value).toBe("1 stopped reporting");
    expect(signal!.context).toContain("did not report");
  });

  it("reports stable when all stations still present", () => {
    vi.mocked(readdirSync).mockReturnValue([
      "2026-03-30.json",
      "2026-03-29.json",
    ] as any);

    vi.mocked(readFileSync).mockImplementation((filePath: any) => {
      if (filePath.includes("2026-03-30")) {
        return makeSnapshot("2026-03-30", ["s1", "s2", "s3"]);
      }
      return makeSnapshot("2026-03-29", ["s1", "s2", "s3"]);
    });

    const signal = fetchStationAvailability();

    expect(signal).not.toBeNull();
    expect(signal!.value).toBe("3 reporting");
    expect(signal!.trend).toBe("stable");
    expect(signal!.context).toContain("reporting normally");
  });

  it("detects newly reporting stations", () => {
    vi.mocked(readdirSync).mockReturnValue([
      "2026-03-30.json",
      "2026-03-29.json",
    ] as any);

    vi.mocked(readFileSync).mockImplementation((filePath: any) => {
      if (filePath.includes("2026-03-30")) {
        return makeSnapshot("2026-03-30", ["s1", "s2", "s3", "s4"]); // s4 new
      }
      return makeSnapshot("2026-03-29", ["s1", "s2", "s3"]);
    });

    const signal = fetchStationAvailability();

    expect(signal).not.toBeNull();
    expect(signal!.value).toBe("4 reporting");
    expect(signal!.trend).toBe("stable");
  });

  it("escalates trend when many stations disappear", () => {
    const yesterday = Array.from({ length: 100 }, (_, i) => `s${i}`);
    const today = yesterday.slice(0, 94); // 6 gone = 6%

    vi.mocked(readdirSync).mockReturnValue([
      "2026-03-30.json",
      "2026-03-29.json",
    ] as any);

    vi.mocked(readFileSync).mockImplementation((filePath: any) => {
      if (filePath.includes("2026-03-30")) {
        return makeSnapshot("2026-03-30", today);
      }
      return makeSnapshot("2026-03-29", yesterday);
    });

    const signal = fetchStationAvailability();

    expect(signal).not.toBeNull();
    expect(signal!.value).toBe("6 stopped reporting");
    expect(signal!.trend).toBe("critical"); // 6% > 5%
  });

  it("includes state breakdown in components", () => {
    vi.mocked(readdirSync).mockReturnValue([
      "2026-03-30.json",
      "2026-03-29.json",
    ] as any);

    const waStation = { state: "WA", source: "fuelwatch" };
    const nswStation = { state: "NSW", source: "fuelcheck" };

    vi.mocked(readFileSync).mockImplementation((filePath: any) => {
      if (filePath.includes("2026-03-30")) {
        // s2 (WA) and s4 (NSW) gone
        return makeSnapshot("2026-03-30", ["s1", "s3"], {
          s1: waStation,
          s3: nswStation,
        });
      }
      return makeSnapshot("2026-03-29", ["s1", "s2", "s3", "s4"], {
        s1: waStation,
        s2: waStation,
        s3: nswStation,
        s4: nswStation,
      });
    });

    const signal = fetchStationAvailability();

    expect(signal).not.toBeNull();
    expect(signal!.components).toBeDefined();
    expect(signal!.components!.length).toBeGreaterThanOrEqual(2);
  });
});
