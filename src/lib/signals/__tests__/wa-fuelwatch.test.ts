import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWaDiesel } from "../wa-fuelwatch";

const VALID_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>FuelWatch Diesel Prices</title>
  <item>
    <title>Station A</title>
    <price>259.5</price>
    <date>2025-12-15</date>
  </item>
  <item>
    <title>Station B</title>
    <price>265.0</price>
    <date>2025-12-15</date>
  </item>
  <item>
    <title>Station C</title>
    <price>272.3</price>
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
  it("returns a valid Signal with correct average price", async () => {
    vi.stubGlobal("fetch", mockFetchOk(VALID_RSS));

    const signal = await fetchWaDiesel();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("WA diesel price");
    // avg = (259.5 + 265.0 + 272.3) / 3 = 265.6 cents => Math.round = 266 => $2.66
    expect(signal!.value).toBe("$2.66/L");
    expect(signal!.trend).toBe("critical"); // 2.66 > 2.5
    expect(signal!.source).toContain("FuelWatch WA");
    expect(signal!.source).toContain("2025-12-15");
    expect(signal!.context).toContain("3 WA stations");
    expect(signal!.automated).toBe(true);
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

  it("returns null when RSS has no price elements", async () => {
    const emptyRss = `<rss><channel><item><title>No price</title></item></channel></rss>`;
    vi.stubGlobal("fetch", mockFetchOk(emptyRss));

    const signal = await fetchWaDiesel();
    expect(signal).toBeNull();
  });
});
