import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFoodCpi } from "../abs-cpi";

const VALID_CSV = [
  "DATAFLOW,MEASURE,INDEX,TSEST,REGION,FREQ,TIME_PERIOD,OBS_VALUE",
  "ABS:CPI,3,20001,10,50,Q,2025-Q2,3.8",
  "ABS:CPI,3,20001,10,50,Q,2025-Q3,4.2",
  "ABS:CPI,3,20001,10,50,Q,2025-Q4,6.1",
].join("\n");

function mockFetchOk(body: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchFoodCpi", () => {
  it("returns a valid Signal on success with realistic CSV", async () => {
    vi.stubGlobal("fetch", mockFetchOk(VALID_CSV));

    const signal = await fetchFoodCpi();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("Food price pressure");
    expect(signal!.value).toContain("6.1");
    expect(signal!.value).toContain("YoY");
    expect(signal!.trend).toBe("up"); // 6.1 > 5
    expect(signal!.source).toContain("ABS CPI");
    expect(signal!.source).toContain("2025-Q4");
    expect(signal!.automated).toBe(true);
    expect(signal!.lastUpdated).toBeTruthy();
    expect(signal!.context).toContain("Accelerating"); // 6.1 - 4.2 = 1.9 > 0.5
  });

  it("classifies trend as stable when YoY is between 2 and 5", async () => {
    const csv = [
      "TIME_PERIOD,OBS_VALUE",
      "2025-Q3,3.0",
      "2025-Q4,3.5",
    ].join("\n");
    vi.stubGlobal("fetch", mockFetchOk(csv));

    const signal = await fetchFoodCpi();
    expect(signal).not.toBeNull();
    expect(signal!.trend).toBe("stable");
  });

  it("classifies trend as down when YoY <= 2", async () => {
    const csv = [
      "TIME_PERIOD,OBS_VALUE",
      "2025-Q4,1.5",
    ].join("\n");
    vi.stubGlobal("fetch", mockFetchOk(csv));

    const signal = await fetchFoodCpi();
    expect(signal).not.toBeNull();
    expect(signal!.trend).toBe("down");
  });

  it("returns null when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const signal = await fetchFoodCpi();
    expect(signal).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    const signal = await fetchFoodCpi();
    expect(signal).toBeNull();
  });

  it("returns null on malformed CSV with no valid headers", async () => {
    vi.stubGlobal("fetch", mockFetchOk("garbage,data\nfoo,bar"));

    const signal = await fetchFoodCpi();
    expect(signal).toBeNull();
  });

  it("returns null on empty CSV body", async () => {
    vi.stubGlobal("fetch", mockFetchOk(""));

    const signal = await fetchFoodCpi();
    expect(signal).toBeNull();
  });
});
