import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchDieselPrice } from "../diesel-price";

beforeEach(() => {
  vi.restoreAllMocks();
});

function stubFetchSequence(...responses: Array<{ ok: boolean; body?: unknown; text?: string }>) {
  const fn = vi.fn();
  for (const [i, r] of responses.entries()) {
    fn.mockResolvedValueOnce({
      ok: r.ok,
      json: () => Promise.resolve(r.body),
      text: () => Promise.resolve(r.text ?? ""),
    });
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("fetchDieselPrice", () => {
  it("returns a valid Signal from AIP data", async () => {
    const aipData = [
      { State: "NSW", Diesel: 2.85 },
      { State: "VIC", Diesel: 2.79 },
      { State: "QLD", Diesel: 2.91 },
    ];
    stubFetchSequence({ ok: true, body: aipData });

    const signal = await fetchDieselPrice();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("Diesel terminal gate price");
    expect(signal!.value).toMatch(/^\$[\d.]+\/L$/);
    expect(signal!.source).toBe("AIP Terminal Gate Prices");
    expect(signal!.automated).toBe(true);
    expect(signal!.trend).toBe("critical"); // avg ~2.85 > 2.5
  });

  it("falls back to QLD CKAN when AIP fails", async () => {
    const qldPkg = {
      success: true,
      result: {
        resources: [
          { format: "CSV", url: "https://example.com/fuel.csv" },
        ],
      },
    };
    const qldCsv = [
      "date,fuel_type,price",
      "2025-12-01,Diesel,1950",
      "2025-12-01,Diesel,1980",
      "2025-12-01,Diesel,1960",
    ].join("\n");

    // AIP fails, then QLD package_show succeeds, then CSV succeeds
    stubFetchSequence(
      { ok: false },
      { ok: true, body: qldPkg },
      { ok: true, text: qldCsv }
    );

    const signal = await fetchDieselPrice();

    expect(signal).not.toBeNull();
    expect(signal!.source).toBe("QLD Fuel Price Reporting");
    expect(signal!.value).toMatch(/^\$[\d.]+\/L$/);
  });

  it("returns null when both AIP and QLD fail", async () => {
    stubFetchSequence({ ok: false }, { ok: false });

    const signal = await fetchDieselPrice();
    expect(signal).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    const signal = await fetchDieselPrice();
    expect(signal).toBeNull();
  });

  it("returns critical trend for prices above $2.50", async () => {
    stubFetchSequence({ ok: true, body: [{ State: "NSW", Diesel: 3.10 }] });

    const signal = await fetchDieselPrice();
    expect(signal!.trend).toBe("critical");
  });

  it("returns up trend for prices between $2.00 and $2.50", async () => {
    stubFetchSequence({ ok: true, body: [{ State: "NSW", Diesel: 2.25 }] });

    const signal = await fetchDieselPrice();
    expect(signal!.trend).toBe("up");
  });

  it("returns stable trend for prices at or below $2.00", async () => {
    stubFetchSequence({ ok: true, body: [{ State: "NSW", Diesel: 1.85 }] });

    const signal = await fetchDieselPrice();
    expect(signal!.trend).toBe("stable");
  });
});
