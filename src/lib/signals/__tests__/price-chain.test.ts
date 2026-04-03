import { describe, it, expect } from "vitest";
import { computePriceChain } from "../price-chain";
import type { Signal } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Signal with the given value (and optional components/regions). */
function sig(
  value: string,
  opts?: {
    components?: Signal["components"];
    regions?: Signal["regions"];
  },
): Signal {
  return {
    label: "test",
    value,
    trend: "stable",
    source: "test",
    context: "",
    lastUpdated: new Date().toISOString(),
    automated: true,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// Reference values for the "standard scenario"
//
//   Brent crude:   US$72.50/bbl
//   AUD/USD:       0.6250
//   Crack spread:  US$28.50/bbl
//   Perth TGP:     190.5 c/L (inc GST+excise)
//   Perth retail:  199.9 c/L (inc GST)
//
// Derived (constants: DIESEL_EXCISE = 52.6, SHIPPING = 8, LITRES_PER_BARREL = 158.987):
//
//   crudeAudCpl  = (72.50 / 0.6250) / 158.987 * 100 ≈ 72.962
//   refiningCpl  = (28.50 / 0.6250) / 158.987 * 100 ≈ 28.682
//   tgpExGst     = 190.5 / 1.1                       ≈ 173.182
//   productSupply= 173.182 - 52.6                     ≈ 120.582
//   retailerMarg = (199.9 - 190.5) / 1.1              ≈   8.545
//   totalGst     = 199.9 / 11                         ≈  18.173
//   importerMarg = 120.582 - 72.962 - 28.682 - 8      ≈  10.938
//
//   Sum: 72.962 + 28.682 + 8 + 10.938 + 52.6 + 8.545 + 18.173 ≈ 199.9
// ---------------------------------------------------------------------------

function standardSignals(): Record<string, Signal> {
  return {
    dieselTgp: sig("190.5 c/L", {
      regions: [
        { region: "Perth", value: "190.5" },
        { region: "Sydney", value: "192.0" },
      ],
    }),
    waFuel: sig("$1.999/L", {
      components: [{ label: "Perth metro diesel", value: "199.9" }],
    }),
    nswFuel: sig("$2.039/L", {
      components: [{ label: "Sydney metro diesel", value: "203.9" }],
    }),
    brentCrude: sig("US$72.50/bbl"),
    audUsd: sig("0.6250"),
    crackSpread: sig("$28.50/bbl"),
  };
}

// ---------------------------------------------------------------------------
// 1. Core arithmetic — full breakdown with known inputs
// ---------------------------------------------------------------------------

describe("computePriceChain — arithmetic with known inputs", () => {
  it("produces a valid signal with the expected label and metadata", () => {
    const result = computePriceChain(standardSignals());

    expect(result).not.toBeNull();
    expect(result!.label).toBe("Fuel price chain (diesel)");
    expect(result!.automated).toBe(true);
    expect(result!.layer).toBe(4);
    expect(result!.source).toContain("AIP");
  });

  it("reports the importer margin in the headline value when full breakdown is available", () => {
    const result = computePriceChain(standardSignals());

    expect(result).not.toBeNull();
    // The headline should mention importer margin
    expect(result!.value).toContain("Fuel importers taking an estimated");
    expect(result!.value).toContain("c/L");
  });

  it("computes crude oil cost accurately from Brent and AUD/USD", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    // crudeAudCpl = (72.50 / 0.6250) / 158.987 * 100 ≈ 72.96
    const crudeComp = result!.components!.find((c) => c.label.includes("crude oil"));
    expect(crudeComp).toBeDefined();

    const crudeValue = parseFloat(crudeComp!.value);
    expect(crudeValue).toBeCloseTo(72.96, 0); // within ~1 c/L
  });

  it("computes refining margin accurately from crack spread and AUD/USD", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    // refiningCpl = (28.50 / 0.6250) / 158.987 * 100 ≈ 28.68
    const refComp = result!.components!.find((c) => c.label.includes("refining"));
    expect(refComp).toBeDefined();

    const refValue = parseFloat(refComp!.value);
    expect(refValue).toBeCloseTo(28.68, 0);
  });

  it("uses the ACCC shipping benchmark (8 c/L)", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    const shipComp = result!.components!.find((c) => c.label.includes("shipping"));
    expect(shipComp).toBeDefined();
    expect(shipComp!.value).toBe("8.0 c/L");
  });

  it("computes excise at the legislated rate (52.6 c/L)", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    const excComp = result!.components!.find((c) => c.label.includes("excise"));
    expect(excComp).toBeDefined();
    expect(excComp!.value).toBe("52.6 c/L");
  });

  it("computes GST as retail price / 11", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    // totalGst = 199.9 / 11 ≈ 18.17
    const gstComp = result!.components!.find((c) => c.label.includes("GST"));
    expect(gstComp).toBeDefined();

    const gstValue = parseFloat(gstComp!.value);
    expect(gstValue).toBeCloseTo(18.17, 0);
  });

  it("computes retailer margin as (retail - tgp) / 1.1", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    // retailerMargin = (199.9 - 190.5) / 1.1 ≈ 8.55
    const retComp = result!.components!.find((c) => c.label.includes("retailer"));
    expect(retComp).toBeDefined();

    const retValue = parseFloat(retComp!.value);
    expect(retValue).toBeCloseTo(8.55, 0);
  });

  it("computes importer margin as the residual", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    // importerMargin = productSupply - crude - refining - shipping
    //                = 120.582 - 72.962 - 28.682 - 8 ≈ 10.94
    const impComp = result!.components!.find((c) => c.label.includes("importer"));
    expect(impComp).toBeDefined();

    const impValue = parseFloat(impComp!.value);
    expect(impValue).toBeCloseTo(10.94, 0);
  });
});

// ---------------------------------------------------------------------------
// 2. Percentage sum — components should approximate 100%
// ---------------------------------------------------------------------------

describe("computePriceChain — percentage sum", () => {
  it("component percentages sum to approximately 100% (integer rounding tolerance)", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    // Extract all Perth components (first city in the chain)
    const perthComps = result!.components!.filter((c) => c.label.startsWith("Perth"));
    expect(perthComps.length).toBeGreaterThanOrEqual(7); // crude, refining, shipping, importer, excise, retailer, GST

    // Each component's change string looks like "37% — description"
    let totalPct = 0;
    for (const comp of perthComps) {
      const pctMatch = comp.change?.match(/^(\d+)%/);
      if (pctMatch) {
        totalPct += parseInt(pctMatch[1], 10);
      }
    }

    // Integer rounding of 7 components can produce 97-103%. We accept that range.
    expect(totalPct).toBeGreaterThanOrEqual(97);
    expect(totalPct).toBeLessThanOrEqual(103);
  });

  it("sum of c/L values closely matches retail price", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    const perthComps = result!.components!.filter((c) => c.label.startsWith("Perth"));

    let totalCpl = 0;
    for (const comp of perthComps) {
      const valMatch = comp.value.match(/([\d.]+)/);
      if (valMatch) {
        totalCpl += parseFloat(valMatch[1]);
      }
    }

    // Should add up to the retail price (199.9 c/L) within rounding
    expect(totalCpl).toBeCloseTo(199.9, 0);
  });
});

// ---------------------------------------------------------------------------
// 3. Edge cases — null/missing upstream signals
// ---------------------------------------------------------------------------

describe("computePriceChain — missing signal handling", () => {
  it("returns null when dieselTgp is missing", () => {
    const signals = standardSignals();
    delete signals.dieselTgp;

    expect(computePriceChain(signals)).toBeNull();
  });

  it("returns null when both waFuel and nswFuel are missing", () => {
    const signals = standardSignals();
    delete signals.waFuel;
    delete signals.nswFuel;

    expect(computePriceChain(signals)).toBeNull();
  });

  it("returns a signal when waFuel is present but nswFuel is missing", () => {
    const signals = standardSignals();
    delete signals.nswFuel;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();
    // Should only have Perth components
    const cities = new Set(result!.components!.map((c) => c.label.split(" ")[0]));
    expect(cities.has("Perth")).toBe(true);
    expect(cities.has("Sydney")).toBe(false);
  });

  it("returns a signal when nswFuel is present but waFuel is missing", () => {
    const signals = standardSignals();
    delete signals.waFuel;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();
    // Should only have Sydney components
    const cities = new Set(result!.components!.map((c) => c.label.split(" ")[0]));
    expect(cities.has("Sydney")).toBe(true);
    expect(cities.has("Perth")).toBe(false);
  });

  it("falls back to product+supply bucket when brentCrude is missing", () => {
    const signals = standardSignals();
    delete signals.brentCrude;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();

    // Without crude data, should show combined "product + supply" instead of separate components
    const prodSupply = result!.components!.find((c) => c.label.includes("product + supply"));
    expect(prodSupply).toBeDefined();

    // Should NOT have separate crude/refining/importer components
    const crude = result!.components!.find((c) => c.label.includes("crude"));
    expect(crude).toBeUndefined();
    const importer = result!.components!.find((c) => c.label.includes("importer"));
    expect(importer).toBeUndefined();
  });

  it("falls back to product+supply bucket when audUsd is missing", () => {
    const signals = standardSignals();
    delete signals.audUsd;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();

    const prodSupply = result!.components!.find((c) => c.label.includes("product + supply"));
    expect(prodSupply).toBeDefined();
  });

  it("falls back to product+supply bucket when crackSpread is missing", () => {
    const signals = standardSignals();
    delete signals.crackSpread;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();

    // Without crack spread, refining margin is null, so importer margin is null too
    const prodSupply = result!.components!.find((c) => c.label.includes("product + supply"));
    expect(prodSupply).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. computeChain guard rails (tested via computePriceChain)
// ---------------------------------------------------------------------------

describe("computePriceChain — guard rails", () => {
  it("returns null when TGP value cannot be parsed from signal", () => {
    const signals = standardSignals();
    signals.dieselTgp = sig("unavailable", {
      regions: [{ region: "Perth", value: "190.5" }],
    });

    expect(computePriceChain(signals)).toBeNull();
  });

  it("returns null when retail price is below TGP (negative retailer margin)", () => {
    const signals = standardSignals();
    // Set retail below TGP — computeChain rejects retailPrice < tgp
    signals.waFuel = sig("$1.80/L", {
      components: [{ label: "Perth metro diesel", value: "180.0" }],
    });
    // Remove NSW to force Perth-only path
    delete signals.nswFuel;

    // 180.0 < 190.5 → computeChain returns null
    expect(computePriceChain(signals)).toBeNull();
  });

  it("handles negative importer margin by nullifying it (estimate off)", () => {
    // If crude + refining + shipping exceeds product & supply, importer margin
    // would be negative. The code sets it to null in that case.
    const signals = standardSignals();

    // Very high Brent → crude cost exceeds product & supply bucket
    signals.brentCrude = sig("US$200.00/bbl");
    // Remove NSW to simplify
    delete signals.nswFuel;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();

    // Should fall back to product + supply since importer margin is null
    const prodSupply = result!.components!.find((c) => c.label.includes("product + supply"));
    expect(prodSupply).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Trend classification
// ---------------------------------------------------------------------------

describe("computePriceChain — trend classification", () => {
  it("reports 'stable' when importer margin is under 30 c/L", () => {
    // Standard scenario has importer margin ~10.9 c/L
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("stable");
  });

  it("reports 'up' when importer margin is between 30 and 50 c/L", () => {
    const signals = standardSignals();
    // Raise TGP to push importer margin into 30-50 range
    // We need productSupply - crude - refining - shipping ∈ [30, 50]
    // crude ≈ 72.96, refining ≈ 28.68, shipping = 8
    // Need productSupply ≈ 72.96 + 28.68 + 8 + 40 = 149.64
    // tgpExGst = productSupply + 52.6 = 202.24
    // tgp = 202.24 * 1.1 = 222.46
    // retail must be > tgp, say 232.0
    signals.dieselTgp = sig("222.5 c/L", {
      regions: [{ region: "Perth", value: "222.5" }],
    });
    signals.waFuel = sig("$2.32/L", {
      components: [{ label: "Perth metro diesel", value: "232.0" }],
    });
    delete signals.nswFuel;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("up");
  });

  it("reports 'critical' when importer margin exceeds 50 c/L", () => {
    const signals = standardSignals();
    // Need productSupply - crude - refining - shipping > 50
    // Need productSupply > 72.96 + 28.68 + 8 + 50 = 159.64
    // tgpExGst = 159.64 + 52.6 = 212.24
    // tgp = 212.24 * 1.1 = 233.46
    // retail must be > tgp
    signals.dieselTgp = sig("256.0 c/L", {
      regions: [{ region: "Perth", value: "256.0" }],
    });
    signals.waFuel = sig("$2.66/L", {
      components: [{ label: "Perth metro diesel", value: "266.0" }],
    });
    delete signals.nswFuel;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("critical");
  });

  it("falls back to retailer margin for trend when importer data is unavailable", () => {
    const signals = standardSignals();
    delete signals.brentCrude;
    // Normal retailer margin ~8.5 c/L → stable
    const result = computePriceChain(signals);
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("stable");
  });

  it("reports 'up' on high retailer margin when importer data is unavailable", () => {
    const signals = standardSignals();
    delete signals.brentCrude;
    // Retailer margin > MARGIN_NORMAL_HIGH (14) but <= 22
    // retailerMargin = (retail - tgp) / 1.1
    // Need (retail - 190.5) / 1.1 > 14 → retail > 190.5 + 15.4 = 205.9
    // And (retail - 190.5) / 1.1 <= 22 → retail <= 190.5 + 24.2 = 214.7
    signals.waFuel = sig("$2.10/L", {
      components: [{ label: "Perth metro diesel", value: "210.0" }],
    });
    delete signals.nswFuel;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("up");
  });
});

// ---------------------------------------------------------------------------
// 6. Multi-city chains
// ---------------------------------------------------------------------------

describe("computePriceChain — multi-city output", () => {
  it("produces components for both Perth and Sydney when both are available", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    const labels = result!.components!.map((c) => c.label);
    const hasPerthCrude = labels.some((l) => l.includes("Perth") && l.includes("crude"));
    const hasSydneyCrude = labels.some((l) => l.includes("Sydney") && l.includes("crude"));
    expect(hasPerthCrude).toBe(true);
    expect(hasSydneyCrude).toBe(true);
  });

  it("includes cross-city importer margin comparison in context when margins differ", () => {
    const signals = standardSignals();
    // Perth TGP 190.5, Sydney TGP 192.0 — different product & supply
    // Perth retail 199.9, Sydney retail 203.9
    const result = computePriceChain(signals);
    expect(result).not.toBeNull();

    // The context should mention both cities if importer margins differ by > 1 c/L
    // Sydney has higher TGP → higher product & supply → higher importer margin
    // Let's check: Sydney tgpExGst = 192/1.1 = 174.545, prodSupply = 174.545 - 52.6 = 121.945
    // Sydney importerMargin = 121.945 - 72.962 - 28.682 - 8 = 12.301
    // Perth importerMargin ≈ 10.938
    // Diff ≈ 1.36 > 1, so comparison should appear
    expect(result!.context).toContain("Sydney");
    expect(result!.context).toContain("Perth");
  });

  it("uses Perth as primary city (first in chain order)", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    // The first component should be for Perth
    expect(result!.components![0].label).toMatch(/^Perth/);
  });
});

// ---------------------------------------------------------------------------
// 7. Headline value variants
// ---------------------------------------------------------------------------

describe("computePriceChain — headline value", () => {
  it("leads with importer margin when full breakdown is available", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();
    expect(result!.value).toMatch(/Fuel importers taking an estimated [\d.]+ c\/L/);
  });

  it("leads with retailer margin when it exceeds normal range and no importer data", () => {
    const signals = standardSignals();
    delete signals.brentCrude;
    // Push retailer margin above 14 (MARGIN_NORMAL_HIGH)
    signals.waFuel = sig("$2.10/L", {
      components: [{ label: "Perth metro diesel", value: "210.0" }],
    });
    delete signals.nswFuel;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();
    expect(result!.value).toMatch(/Retailers taking [\d.]+ c\/L/);
  });

  it("shows neutral retailer/wholesale message when margin is normal and no importer data", () => {
    const signals = standardSignals();
    delete signals.brentCrude;
    delete signals.nswFuel;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();
    // Normal retailer margin (~8.5 c/L) → "Retailer margin X c/L — wholesale cost Y before tax"
    expect(result!.value).toMatch(/Retailer margin/);
    expect(result!.value).toMatch(/wholesale cost/);
  });
});

// ---------------------------------------------------------------------------
// 8. Context narrative content
// ---------------------------------------------------------------------------

describe("computePriceChain — context narrative", () => {
  it("includes ACCC and AIP attribution in context", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    expect(result!.context).toContain("ACCC");
    expect(result!.context).toContain("Australian Institute of Petroleum");
  });

  it("includes the four importer names when full breakdown is available", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    expect(result!.context).toContain("Ampol");
    expect(result!.context).toContain("Viva Energy");
    expect(result!.context).toContain("BP");
    expect(result!.context).toContain("ExxonMobil");
  });

  it("includes estimation methodology caveat", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    expect(result!.context).toContain("Brent crude");
    expect(result!.context).toContain("crack spread");
    expect(result!.context).toContain("approximate");
  });

  it("formats retail price as dollars in context", () => {
    const result = computePriceChain(standardSignals());
    expect(result).not.toBeNull();

    // Retail 199.9 c/L = $2.00/L (rounded)
    expect(result!.context).toMatch(/\$[\d.]+\/L/);
  });
});

// ---------------------------------------------------------------------------
// 9. National average fallback
// ---------------------------------------------------------------------------

describe("computePriceChain — national TGP fallback", () => {
  it("falls back to national TGP when Perth TGP region is missing", () => {
    const signals = standardSignals();
    // Remove regional TGPs but keep national value
    signals.dieselTgp = sig("190.5 c/L");
    // Remove NSW
    delete signals.nswFuel;

    const result = computePriceChain(signals);
    expect(result).not.toBeNull();

    // Should use "National avg" label
    const labels = result!.components!.map((c) => c.label);
    expect(labels.some((l) => l.includes("National avg"))).toBe(true);
  });
});
