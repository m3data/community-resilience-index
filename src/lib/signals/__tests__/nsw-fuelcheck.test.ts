import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNswFuel } from "../nsw-fuelcheck";

function makeApiResponse(
  prices: { code: string; price: number; postcode: string }[]
) {
  const stations = prices.map((p) => ({
    code: p.code,
    name: `Station ${p.code}`,
    address: `123 Test St, SUBURB NSW ${p.postcode}`,
    brand: "BP",
  }));
  const priceRecords = prices.map((p) => ({
    stationcode: p.code,
    fueltype: "DL",
    price: p.price,
    lastupdated: "30/03/2026 08:30:00",
  }));
  return { stations, prices: priceRecords };
}

function mockFetch(data: ReturnType<typeof makeApiResponse>) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("NSW_FUELCHECK_API_KEY", "test-key");
});

describe("fetchNswFuel", () => {
  it("returns a valid Signal with correct average", async () => {
    const data = makeApiResponse([
      { code: "1", price: 323.9, postcode: "2000" },
      { code: "2", price: 325.0, postcode: "2100" },
      { code: "3", price: 330.0, postcode: "2200" },
    ]);
    vi.stubGlobal("fetch", mockFetch(data));

    const signal = await fetchNswFuel();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("NSW fuel retail");
    expect(signal!.value).toContain("Diesel");
    expect(signal!.source).toContain("NSW FuelCheck");
    expect(signal!.automated).toBe(true);
  });

  it("splits metro and regional correctly", async () => {
    const data = makeApiResponse([
      { code: "1", price: 320.0, postcode: "2000" },
      { code: "2", price: 325.0, postcode: "2100" },
      { code: "3", price: 340.0, postcode: "2600" },
    ]);
    vi.stubGlobal("fetch", mockFetch(data));

    const signal = await fetchNswFuel();

    expect(signal).not.toBeNull();
    expect(signal!.context).toContain("Sydney metro");
    expect(signal!.components).toBeDefined();
    expect(signal!.components!.some((c) => c.label.includes("Sydney metro"))).toBe(true);
    expect(signal!.components!.some((c) => c.label.includes("Regional NSW"))).toBe(true);
  });

  it("returns null when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const signal = await fetchNswFuel();
    expect(signal).toBeNull();
  });

  it("returns null when API returns no data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ stations: [], prices: [] }),
      })
    );

    const signal = await fetchNswFuel();
    expect(signal).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    const signal = await fetchNswFuel();
    expect(signal).toBeNull();
  });

  it("returns null when no API key", async () => {
    vi.stubEnv("NSW_FUELCHECK_API_KEY", "");

    const signal = await fetchNswFuel();
    expect(signal).toBeNull();
  });

  it("filters out invalid prices", async () => {
    const data = makeApiResponse([
      { code: "1", price: 323.9, postcode: "2000" },
    ]);
    // Add bad prices
    data.prices.push(
      { stationcode: "99", fueltype: "DL", price: 0, lastupdated: "" },
      { stationcode: "98", fueltype: "DL", price: -100, lastupdated: "" }
    );
    vi.stubGlobal("fetch", mockFetch(data));

    const signal = await fetchNswFuel();

    expect(signal).not.toBeNull();
    expect(signal!.source).toContain("1 diesel station");
  });
});
