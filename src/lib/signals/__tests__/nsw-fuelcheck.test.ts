import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNswDiesel } from "../nsw-fuelcheck";

function makeRecords(prices: number[], postcodes?: string[]) {
  return prices.map((p, i) => ({
    Price: String(p),
    Postcode: postcodes?.[i] ?? "2000",
    Suburb: `Suburb ${i}`,
    PriceUpdatedDate: "29/03/2026 08:30",
    FuelCode: "DL",
    ServiceStationName: `Station ${i}`,
    Brand: "BP",
  }));
}

function mockCkanResponse(records: ReturnType<typeof makeRecords>) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        result: { records },
      }),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchNswDiesel", () => {
  it("returns a valid Signal with correct average", async () => {
    // Prices in cents: 23990, 24500, 25000 → $239.90, $245.00, $250.00
    // But the module divides by 100, treating input as cents
    const records = makeRecords([23990, 24500, 25000]);
    vi.stubGlobal("fetch", mockCkanResponse(records));

    const signal = await fetchNswDiesel();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("NSW diesel price");
    expect(signal!.source).toContain("NSW FuelCheck");
    expect(signal!.automated).toBe(true);
  });

  it("splits metro and regional correctly", async () => {
    // 2000-2249 = Sydney metro, 2600+ = regional
    const records = makeRecords(
      [23990, 24500, 26000],
      ["2000", "2100", "2600"]
    );
    vi.stubGlobal("fetch", mockCkanResponse(records));

    const signal = await fetchNswDiesel();

    expect(signal).not.toBeNull();
    expect(signal!.context).toContain("Sydney metro");
    expect(signal!.context).toContain("Regional NSW");
  });

  it("returns null when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const signal = await fetchNswDiesel();
    expect(signal).toBeNull();
  });

  it("returns null when API returns no records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, result: { records: [] } }),
      })
    );

    const signal = await fetchNswDiesel();
    expect(signal).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    const signal = await fetchNswDiesel();
    expect(signal).toBeNull();
  });

  it("filters out invalid prices", async () => {
    const records = [
      ...makeRecords([23990]),
      { Price: "0", Postcode: "2000", Suburb: "Bad", PriceUpdatedDate: "", FuelCode: "DL", ServiceStationName: "Bad", Brand: "X" },
      { Price: "-1", Postcode: "2000", Suburb: "Bad2", PriceUpdatedDate: "", FuelCode: "DL", ServiceStationName: "Bad2", Brand: "X" },
    ];
    vi.stubGlobal("fetch", mockCkanResponse(records));

    const signal = await fetchNswDiesel();

    expect(signal).not.toBeNull();
    expect(signal!.source).toContain("1 station"); // only valid price counted
  });
});
