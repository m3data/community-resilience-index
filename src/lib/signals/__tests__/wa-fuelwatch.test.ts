import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWaDiesel } from "../wa-fuelwatch";

// Full RSS with brand, location, lat, lng — required by parseStations()
const VALID_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>FuelWatch Diesel Prices</title>
  <date>2025-12-15</date>
  <item>
    <title>Station A</title>
    <price>259.5</price>
    <brand>BP</brand>
    <location>123 Main St, Perth</location>
    <latitude>-31.95</latitude>
    <longitude>115.86</longitude>
    <date>2025-12-15</date>
  </item>
  <item>
    <title>Station B</title>
    <price>265.0</price>
    <brand>Shell</brand>
    <location>456 High St, Perth</location>
    <latitude>-31.93</latitude>
    <longitude>115.87</longitude>
    <date>2025-12-15</date>
  </item>
  <item>
    <title>Station C</title>
    <price>272.3</price>
    <brand>United</brand>
    <location>789 Country Rd, Bunbury</location>
    <latitude>-33.33</latitude>
    <longitude>115.64</longitude>
    <date>2025-12-15</date>
  </item>
</channel>
</rss>`;

function mockFetchOk(body: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchWaDiesel", () => {
  it("returns a valid Signal with correct median price", async () => {
    vi.stubGlobal("fetch", mockFetchOk(VALID_RSS));

    const signal = await fetchWaDiesel();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("WA diesel retail");
    // median of [259.5, 265.0, 272.3] = 265.0 cents => $2.65
    expect(signal!.value).toBe("$2.65/L");
    expect(signal!.trend).toBe("up"); // mean ~265.6: > 220 threshold but < 300
    expect(signal!.source).toContain("FuelWatch WA");
    expect(signal!.source).toContain("2025-12-15");
    expect(signal!.context).toContain("3 WA stations");
    expect(signal!.automated).toBe(true);
  });

  it("includes metro/regional breakdown in components", async () => {
    vi.stubGlobal("fetch", mockFetchOk(VALID_RSS));

    const signal = await fetchWaDiesel();

    expect(signal).not.toBeNull();
    // Station A and B are in Perth metro, Station C is regional
    expect(signal!.components).toBeDefined();
    expect(signal!.components!.length).toBeGreaterThanOrEqual(2);
    const metroComp = signal!.components!.find((c) => c.label.includes("metro"));
    expect(metroComp).toBeDefined();
  });

  it("returns null when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fail")));

    const signal = await fetchWaDiesel();
    expect(signal).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 })
    );

    const signal = await fetchWaDiesel();
    expect(signal).toBeNull();
  });

  it("returns null when RSS has no parseable stations", async () => {
    const emptyRss = `<rss><channel><item><title>No data</title></item></channel></rss>`;
    vi.stubGlobal("fetch", mockFetchOk(emptyRss));

    const signal = await fetchWaDiesel();
    expect(signal).toBeNull();
  });
});
