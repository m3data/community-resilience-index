import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBrentCrude } from "../brent-crude";
import { fetchAsxEnergy } from "../asx-energy";
import { fetchAsxFood } from "../asx-food";
import { fetchAudUsd } from "../aud-usd";
import { fetchCrackSpread } from "../crack-spread";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock a successful fetch returning JSON. Supports multiple sequential calls. */
function mockFetchJson(...responses: unknown[]) {
  const fn = vi.fn();
  for (const body of responses) {
    fn.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(body),
    });
  }
  return fn;
}

/** Mock a fetch that rejects. */
function mockFetchError() {
  return vi.fn().mockRejectedValue(new Error("network error"));
}

/** Mock a fetch that returns ok: false. */
function mockFetchNotOk() {
  return vi.fn().mockResolvedValue({ ok: false });
}

// ---------------------------------------------------------------------------
// Chart API response factory (v8 — used by brent-crude)
// ---------------------------------------------------------------------------

function chartResponse(price: number, previousClose: number) {
  return {
    chart: {
      result: [
        {
          meta: {
            regularMarketPrice: price,
            previousClose,
            currency: "USD",
          },
        },
      ],
      error: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Quote API response factory (v7 — used by asx-energy, asx-food, aud-usd, crack-spread)
// ---------------------------------------------------------------------------

function quoteResponse(
  quotes: Array<{
    symbol: string;
    regularMarketPrice: number;
    regularMarketChangePercent: number;
    regularMarketTime?: number;
    regularMarketChange?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    regularMarketPreviousClose?: number;
    currency?: string;
    shortName?: string;
  }>
) {
  return {
    quoteResponse: {
      result: quotes.map((q) => ({
        regularMarketTime: 1711700000,
        ...q,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// Brent Crude
// ===========================================================================

describe("fetchBrentCrude", () => {
  it("returns a valid signal with correct label, value, and metadata", async () => {
    // Two chart calls: front-month BZ=F, then deferred contract
    vi.stubGlobal(
      "fetch",
      mockFetchJson(
        chartResponse(85.5, 84.0),
        chartResponse(87.0, 86.0)
      )
    );

    const signal = await fetchBrentCrude();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("Brent crude oil");
    expect(signal!.value).toBe("US$85.50/bbl");
    expect(signal!.trend).toBe("up"); // 85.50 > 80
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(1);
    // Deferred > front => contango
    expect(signal!.secondary).toBeDefined();
    expect(signal!.secondary!.label).toBe("Market outlook");
  });

  it("returns critical trend when price > 100", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJson(
        chartResponse(105.0, 100.0),
        chartResponse(107.0, 106.0)
      )
    );

    const signal = await fetchBrentCrude();
    expect(signal!.trend).toBe("critical");
  });

  it("returns down trend when price < 60", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJson(
        chartResponse(55.0, 56.0),
        chartResponse(54.0, 55.0)
      )
    );

    const signal = await fetchBrentCrude();
    expect(signal!.trend).toBe("down");
  });

  it("returns stable trend when price between 60 and 80", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJson(
        chartResponse(70.0, 69.0),
        chartResponse(72.0, 71.0)
      )
    );

    const signal = await fetchBrentCrude();
    expect(signal!.trend).toBe("stable");
  });

  it("detects backwardation when front > deferred", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJson(
        chartResponse(90.0, 88.0), // front
        chartResponse(86.0, 85.0) // deferred < front
      )
    );

    const signal = await fetchBrentCrude();
    expect(signal!.secondary!.value).toMatch(/stay high|rise/i);
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    const signal = await fetchBrentCrude();
    expect(signal).toBeNull();
  });

  it("returns null on empty chart result", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJson({ chart: { result: null, error: null } })
    );
    const signal = await fetchBrentCrude();
    expect(signal).toBeNull();
  });
});

// ===========================================================================
// ASX Energy
// ===========================================================================

describe("fetchAsxEnergy", () => {
  const standardQuotes = quoteResponse([
    { symbol: "ALD.AX", regularMarketPrice: 30.5, regularMarketChangePercent: -2.3 },
    { symbol: "VEA.AX", regularMarketPrice: 3.15, regularMarketChangePercent: -1.8 },
    { symbol: "XEJ.AX", regularMarketPrice: 9500, regularMarketChangePercent: -0.5 },
  ]);

  it("returns a valid composite signal", async () => {
    vi.stubGlobal("fetch", mockFetchJson(standardQuotes));

    const signal = await fetchAsxEnergy();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("ASX energy & fuel equities");
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(1);
    expect(signal!.components).toBeDefined();
    expect(signal!.components!.length).toBe(3);
  });

  it("returns critical trend on large move (>= 5%)", async () => {
    const quotes = quoteResponse([
      { symbol: "ALD.AX", regularMarketPrice: 30.5, regularMarketChangePercent: -6.0 },
      { symbol: "VEA.AX", regularMarketPrice: 3.15, regularMarketChangePercent: -5.5 },
      { symbol: "XEJ.AX", regularMarketPrice: 9500, regularMarketChangePercent: -4.0 },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchAsxEnergy();
    expect(signal!.trend).toBe("critical");
  });

  it("detects divergence between refiners (>= 3pp gap)", async () => {
    const quotes = quoteResponse([
      { symbol: "ALD.AX", regularMarketPrice: 30.5, regularMarketChangePercent: 4.0 },
      { symbol: "VEA.AX", regularMarketPrice: 3.15, regularMarketChangePercent: 0.5 },
      { symbol: "XEJ.AX", regularMarketPrice: 9500, regularMarketChangePercent: 0.2 },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchAsxEnergy();
    expect(signal!.value).toBe("Refiners diverging");
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    const signal = await fetchAsxEnergy();
    expect(signal).toBeNull();
  });

  it("returns null on empty response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJson({ quoteResponse: { result: [] } })
    );
    const signal = await fetchAsxEnergy();
    expect(signal).toBeNull();
  });
});

// ===========================================================================
// ASX Food & Agriculture
// ===========================================================================

describe("fetchAsxFood", () => {
  const standardQuotes = quoteResponse([
    { symbol: "COL.AX", regularMarketPrice: 18.5, regularMarketChangePercent: 0.8 },
    { symbol: "WOW.AX", regularMarketPrice: 32.1, regularMarketChangePercent: 0.5 },
    { symbol: "ELD.AX", regularMarketPrice: 7.2, regularMarketChangePercent: -0.3 },
    { symbol: "NUF.AX", regularMarketPrice: 4.8, regularMarketChangePercent: -0.5 },
    { symbol: "XSJ.AX", regularMarketPrice: 14200, regularMarketChangePercent: 0.3 },
  ]);

  it("returns a valid signal with XSJ headline value", async () => {
    vi.stubGlobal("fetch", mockFetchJson(standardQuotes));

    const signal = await fetchAsxFood();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("ASX food & agriculture");
    expect(signal!.value).toContain("$14200.00");
    expect(signal!.value).toContain("+0.30%");
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(1);
  });

  it("returns critical when ag inputs crash while retailers stable", async () => {
    const quotes = quoteResponse([
      { symbol: "COL.AX", regularMarketPrice: 18.5, regularMarketChangePercent: 1.0 },
      { symbol: "WOW.AX", regularMarketPrice: 32.1, regularMarketChangePercent: 0.5 },
      { symbol: "ELD.AX", regularMarketPrice: 7.2, regularMarketChangePercent: -4.0 },
      { symbol: "NUF.AX", regularMarketPrice: 4.8, regularMarketChangePercent: -5.0 },
      { symbol: "XSJ.AX", regularMarketPrice: 14200, regularMarketChangePercent: -0.2 },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchAsxFood();
    // agAvg = -4.5, retailAvg = 0.75, retailAvg - agAvg = 5.25 > 2 and agAvg < -3
    expect(signal!.trend).toBe("critical");
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    const signal = await fetchAsxFood();
    expect(signal).toBeNull();
  });

  it("returns null on invalid response shape", async () => {
    vi.stubGlobal("fetch", mockFetchJson({ unexpected: true }));
    const signal = await fetchAsxFood();
    expect(signal).toBeNull();
  });
});

// ===========================================================================
// AUD/USD
// ===========================================================================

describe("fetchAudUsd", () => {
  it("returns a valid signal with correct value format", async () => {
    const quotes = quoteResponse([
      {
        symbol: "AUDUSD=X",
        regularMarketPrice: 0.6534,
        regularMarketChangePercent: 0.15,
        regularMarketChange: 0.001,
        fiftyTwoWeekHigh: 0.69,
        fiftyTwoWeekLow: 0.62,
      },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchAudUsd();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("AUD/USD exchange rate");
    expect(signal!.value).toBe("0.6534 (+0.15%)");
    expect(signal!.trend).toBe("stable"); // |0.15| < 0.3
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(1);
  });

  it("returns up trend when changePct >= 0.3", async () => {
    const quotes = quoteResponse([
      {
        symbol: "AUDUSD=X",
        regularMarketPrice: 0.66,
        regularMarketChangePercent: 0.5,
        regularMarketChange: 0.003,
      },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchAudUsd();
    expect(signal!.trend).toBe("up");
  });

  it("returns down trend when changePct <= -0.3", async () => {
    const quotes = quoteResponse([
      {
        symbol: "AUDUSD=X",
        regularMarketPrice: 0.64,
        regularMarketChangePercent: -0.5,
        regularMarketChange: -0.003,
      },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchAudUsd();
    expect(signal!.trend).toBe("down");
  });

  it("returns critical trend when |changePct| >= 2", async () => {
    const quotes = quoteResponse([
      {
        symbol: "AUDUSD=X",
        regularMarketPrice: 0.62,
        regularMarketChangePercent: -2.5,
        regularMarketChange: -0.016,
      },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchAudUsd();
    expect(signal!.trend).toBe("critical");
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    const signal = await fetchAudUsd();
    expect(signal).toBeNull();
  });

  it("returns null on empty quote result", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJson({ quoteResponse: { result: [] } })
    );
    const signal = await fetchAudUsd();
    expect(signal).toBeNull();
  });
});

// ===========================================================================
// Crack Spread
// ===========================================================================

describe("fetchCrackSpread", () => {
  // HO=F in $/gallon, BZ=F in $/barrel
  // spread = (HO * 42) - BZ

  it("returns a valid signal with computed spread", async () => {
    // HO = 2.50/gal => 105/bbl, BZ = 75 => spread = 30
    const quotes = quoteResponse([
      { symbol: "BZ=F", regularMarketPrice: 75.0, regularMarketChangePercent: -0.5 },
      { symbol: "HO=F", regularMarketPrice: 2.5, regularMarketChangePercent: 0.3 },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchCrackSpread();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("Crack spread (proxy)");
    expect(signal!.value).toBe("$30.00/bbl");
    expect(signal!.trend).toBe("stable"); // 25 <= 30 <= 40
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(1);
  });

  it("returns critical trend when spread < 15", async () => {
    // HO = 2.0/gal => 84/bbl, BZ = 75 => spread = 9
    const quotes = quoteResponse([
      { symbol: "BZ=F", regularMarketPrice: 75.0, regularMarketChangePercent: 0 },
      { symbol: "HO=F", regularMarketPrice: 2.0, regularMarketChangePercent: 0 },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchCrackSpread();
    expect(signal!.trend).toBe("critical");
  });

  it("returns down trend when spread between 15 and 25", async () => {
    // HO = 2.2/gal => 92.4/bbl, BZ = 75 => spread = 17.4
    const quotes = quoteResponse([
      { symbol: "BZ=F", regularMarketPrice: 75.0, regularMarketChangePercent: 0 },
      { symbol: "HO=F", regularMarketPrice: 2.2, regularMarketChangePercent: 0 },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchCrackSpread();
    expect(signal!.trend).toBe("down");
  });

  it("returns up trend when spread > 40", async () => {
    // HO = 3.0/gal => 126/bbl, BZ = 75 => spread = 51
    const quotes = quoteResponse([
      { symbol: "BZ=F", regularMarketPrice: 75.0, regularMarketChangePercent: 0 },
      { symbol: "HO=F", regularMarketPrice: 3.0, regularMarketChangePercent: 0 },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchCrackSpread();
    expect(signal!.trend).toBe("up");
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    const signal = await fetchCrackSpread();
    expect(signal).toBeNull();
  });

  it("returns null when one ticker is missing", async () => {
    // Only BZ=F returned, no HO=F
    const quotes = quoteResponse([
      { symbol: "BZ=F", regularMarketPrice: 75.0, regularMarketChangePercent: 0 },
    ]);
    vi.stubGlobal("fetch", mockFetchJson(quotes));

    const signal = await fetchCrackSpread();
    expect(signal).toBeNull();
  });
});
