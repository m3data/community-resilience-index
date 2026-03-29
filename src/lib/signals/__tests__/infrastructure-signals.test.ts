import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAemoElectricity } from "../aemo-electricity";
import { fetchRbaCashRate } from "../rba-cash-rate";
import { fetchNswRfs } from "../nsw-rfs";
import { fetchVicEmv } from "../vic-emv";
import { fetchFoodBasket } from "../food-basket";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchJson(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockFetchText(body: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(body),
  });
}

function mockFetchNotOk() {
  return vi.fn().mockResolvedValue({ ok: false, status: 503 });
}

function mockFetchError() {
  return vi.fn().mockRejectedValue(new Error("network"));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// AEMO Electricity (Layer 2)
// ---------------------------------------------------------------------------

const AEMO_RESPONSE = {
  ELEC_NEM_SUMMARY: [
    { REGIONID: "NSW1", PRICE: 85.5, TOTALDEMAND: 7500, SETTLEMENTDATE: "2026-03-29T12:00:00" },
    { REGIONID: "VIC1", PRICE: 72.3, TOTALDEMAND: 5200, SETTLEMENTDATE: "2026-03-29T12:00:00" },
    { REGIONID: "QLD1", PRICE: 95.0, TOTALDEMAND: 6100, SETTLEMENTDATE: "2026-03-29T12:00:00" },
    { REGIONID: "SA1", PRICE: 110.0, TOTALDEMAND: 1800, SETTLEMENTDATE: "2026-03-29T12:00:00" },
    { REGIONID: "TAS1", PRICE: 55.0, TOTALDEMAND: 1200, SETTLEMENTDATE: "2026-03-29T12:00:00" },
  ],
};

describe("fetchAemoElectricity", () => {
  it("returns a valid Signal with regions on success", async () => {
    vi.stubGlobal("fetch", mockFetchJson(AEMO_RESPONSE));

    const signal = await fetchAemoElectricity();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("NEM wholesale electricity");
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(2);
    expect(signal!.regions).toBeDefined();
    expect(signal!.regions!.length).toBe(5);
    // All prices below 150 => stable
    expect(signal!.trend).toBe("stable");
    // Check region labels
    const regionNames = signal!.regions!.map((r) => r.region);
    expect(regionNames).toContain("NSW");
    expect(regionNames).toContain("VIC");
  });

  it("returns critical trend when a region price >= 300", async () => {
    const spikeData = {
      ELEC_NEM_SUMMARY: [
        { REGIONID: "NSW1", PRICE: 350, TOTALDEMAND: 8000, SETTLEMENTDATE: "2026-03-29T12:00:00" },
        { REGIONID: "VIC1", PRICE: 90, TOTALDEMAND: 5000, SETTLEMENTDATE: "2026-03-29T12:00:00" },
      ],
    };
    vi.stubGlobal("fetch", mockFetchJson(spikeData));

    const signal = await fetchAemoElectricity();

    expect(signal).not.toBeNull();
    expect(signal!.trend).toBe("critical");
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    expect(await fetchAemoElectricity()).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetchNotOk());
    expect(await fetchAemoElectricity()).toBeNull();
  });

  it("returns null when summary array is empty", async () => {
    vi.stubGlobal("fetch", mockFetchJson({ ELEC_NEM_SUMMARY: [] }));
    expect(await fetchAemoElectricity()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// RBA Cash Rate (Layer 5)
// ---------------------------------------------------------------------------

const RBA_CSV = `Title,Cash Rate Target
Series ID,FIRMMCRTD
Frequency,Daily
Type,Original
Units,Per cent per annum
Source,RBA
01-Jan-2025,4.35
01-Feb-2025,4.35
01-Mar-2026,4.10
15-Mar-2026,4.10`;

describe("fetchRbaCashRate", () => {
  it("returns a valid Signal with current rate", async () => {
    vi.stubGlobal("fetch", mockFetchText(RBA_CSV));

    const signal = await fetchRbaCashRate();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("RBA cash rate target");
    expect(signal!.value).toBe("4.10%");
    expect(signal!.trend).toBe("down"); // 4.10 < 4.35
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(5);
    expect(signal!.context).toContain("4.10%");
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    expect(await fetchRbaCashRate()).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetchNotOk());
    expect(await fetchRbaCashRate()).toBeNull();
  });

  it("returns null on empty CSV", async () => {
    vi.stubGlobal("fetch", mockFetchText(""));
    expect(await fetchRbaCashRate()).toBeNull();
  });

  it("returns null on CSV without cash rate column", async () => {
    vi.stubGlobal("fetch", mockFetchText("Title,Something Else\n01-Jan-2025,99"));
    expect(await fetchRbaCashRate()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// NSW RFS (Layer 6)
// ---------------------------------------------------------------------------

const RFS_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        title: "Katoomba Fire",
        category: "Watch and Act",
        description:
          '<b>STATUS:</b>&nbsp;Going<br /><b>TYPE:</b>&nbsp;Bush Fire<br /><b>FIRE:</b>&nbsp;Yes<br /><b>SIZE:</b>&nbsp;100 ha<br /><b>COUNCIL AREA:</b>&nbsp;Blue Mountains',
      },
      geometry: { type: "Point", coordinates: [150.3, -33.7] },
    },
    {
      type: "Feature",
      properties: {
        title: "Richmond Grass Fire",
        category: "Advice",
        description:
          '<b>STATUS:</b>&nbsp;Under Control<br /><b>TYPE:</b>&nbsp;Grass Fire<br /><b>FIRE:</b>&nbsp;Yes<br /><b>SIZE:</b>&nbsp;5 ha<br /><b>COUNCIL AREA:</b>&nbsp;Hawkesbury',
      },
      geometry: { type: "Point", coordinates: [150.75, -33.6] },
    },
  ],
};

describe("fetchNswRfs", () => {
  it("returns a valid Signal with incident count", async () => {
    vi.stubGlobal("fetch", mockFetchJson(RFS_GEOJSON));

    const signal = await fetchNswRfs();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("NSW bushfire incidents");
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(6);
    expect(signal!.value).toContain("2 incidents");
    expect(signal!.value).toContain("2 fires");
    // Watch and Act present => trend "up"
    expect(signal!.trend).toBe("up");
    expect(signal!.context).toContain("Blue Mountains");
  });

  it("returns critical trend with Emergency Warning", async () => {
    const emergencyGeo = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            title: "Major Fire",
            category: "Emergency Warning",
            description:
              '<b>STATUS:</b>&nbsp;Going<br /><b>TYPE:</b>&nbsp;Bush Fire<br /><b>FIRE:</b>&nbsp;Yes<br /><b>SIZE:</b>&nbsp;500 ha<br /><b>COUNCIL AREA:</b>&nbsp;Shoalhaven',
          },
          geometry: { type: "Point", coordinates: [150.5, -34.9] },
        },
      ],
    };
    vi.stubGlobal("fetch", mockFetchJson(emergencyGeo));

    const signal = await fetchNswRfs();

    expect(signal).not.toBeNull();
    expect(signal!.trend).toBe("critical");
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    expect(await fetchNswRfs()).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetchNotOk());
    expect(await fetchNswRfs()).toBeNull();
  });

  it("handles empty features array gracefully", async () => {
    vi.stubGlobal("fetch", mockFetchJson({ type: "FeatureCollection", features: [] }));

    const signal = await fetchNswRfs();

    expect(signal).not.toBeNull();
    expect(signal!.value).toBe("No major incidents");
    expect(signal!.trend).toBe("down");
  });
});

// ---------------------------------------------------------------------------
// VIC EMV (Layer 6)
// ---------------------------------------------------------------------------

const EMV_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "inc-001",
        feedType: "incident",
        category1: "Fire",
        category2: "Bushfire",
        status: "Going",
        location: "Healesville",
        size: 200,
        created: "2026-03-29T08:00:00Z",
        updated: "2026-03-29T10:00:00Z",
        action: "Watch and Act",
      },
    },
    {
      type: "Feature",
      properties: {
        id: "inc-002",
        feedType: "incident",
        category1: "Flood",
        category2: "Riverine",
        status: "Responding",
        location: "Echuca",
        created: "2026-03-29T09:00:00Z",
        updated: "2026-03-29T10:30:00Z",
      },
    },
    {
      type: "Feature",
      properties: {
        id: "burn-001",
        feedType: "burn-area",
        category1: "Fire",
        category2: "Planned Burn",
        status: "Going",
        location: "Warburton",
        created: "2026-03-29T06:00:00Z",
        updated: "2026-03-29T07:00:00Z",
      },
    },
  ],
};

describe("fetchVicEmv", () => {
  it("returns a valid Signal filtering out burn-areas", async () => {
    vi.stubGlobal("fetch", mockFetchJson(EMV_GEOJSON));

    const signal = await fetchVicEmv();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("VIC emergency incidents");
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(6);
    // 2 active incidents (burn-area excluded)
    expect(signal!.value).toContain("2 active");
    expect(signal!.value).toContain("watch & act");
  });

  it("returns critical trend with Emergency Warning", async () => {
    const emergencyData = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "ew-001",
            feedType: "warning",
            category1: "Fire",
            category2: "Bushfire",
            status: "Warning",
            location: "Kinglake",
            action: "Emergency Warning",
            created: "2026-03-29T08:00:00Z",
            updated: "2026-03-29T10:00:00Z",
          },
        },
      ],
    };
    vi.stubGlobal("fetch", mockFetchJson(emergencyData));

    const signal = await fetchVicEmv();

    expect(signal).not.toBeNull();
    expect(signal!.trend).toBe("critical");
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    expect(await fetchVicEmv()).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetchNotOk());
    expect(await fetchVicEmv()).toBeNull();
  });

  it("returns stable trend with no features", async () => {
    vi.stubGlobal("fetch", mockFetchJson({ type: "FeatureCollection", features: [] }));

    const signal = await fetchVicEmv();

    expect(signal).not.toBeNull();
    expect(signal!.value).toContain("0 active");
    expect(signal!.trend).toBe("stable");
  });
});

// ---------------------------------------------------------------------------
// Food Basket (Layer 4)
// ---------------------------------------------------------------------------

const FOOD_CSV = [
  "DATAFLOW,MEASURE,INDEX,TSEST,REGION,FREQ,TIME_PERIOD,OBS_VALUE",
  "ABS:CPI,3,20001,10,50,Q,2025-Q3,2.8",
  "ABS:CPI,3,20002,10,50,Q,2025-Q3,1.5",
  "ABS:CPI,3,20003,10,50,Q,2025-Q3,4.2",
  "ABS:CPI,3,20001,10,50,Q,2025-Q4,3.2",
  "ABS:CPI,3,20002,10,50,Q,2025-Q4,2.1",
  "ABS:CPI,3,20003,10,50,Q,2025-Q4,5.8",
].join("\n");

describe("fetchFoodBasket", () => {
  it("returns a valid Signal on success", async () => {
    vi.stubGlobal("fetch", mockFetchText(FOOD_CSV));

    const signal = await fetchFoodBasket();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("Food basket price pressure");
    expect(signal!.automated).toBe(true);
    expect(signal!.layer).toBe(4);
    expect(signal!.value).toContain("3.2");
    expect(signal!.value).toContain("YoY");
    expect(signal!.trend).toBe("up"); // 3.2 > 2
    expect(signal!.components).toBeDefined();
    expect(signal!.components!.length).toBeGreaterThan(0);
  });

  it("returns null on fetch error", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    expect(await fetchFoodBasket()).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetchNotOk());
    expect(await fetchFoodBasket()).toBeNull();
  });

  it("returns null on empty CSV body", async () => {
    vi.stubGlobal("fetch", mockFetchText(""));
    expect(await fetchFoodBasket()).toBeNull();
  });

  it("returns null on CSV with no valid data rows", async () => {
    vi.stubGlobal("fetch", mockFetchText("DATAFLOW,MEASURE,INDEX,TSEST,REGION,FREQ,TIME_PERIOD,OBS_VALUE"));
    expect(await fetchFoodBasket()).toBeNull();
  });
});
