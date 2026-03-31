/**
 * Fuel Price Chain — Where Your Money Goes
 *
 * Breaks down the retail fuel price into its components so the public
 * can see exactly who takes what.
 *
 * The key insight: the public debate focuses on retailer margins (~3%),
 * but the real margin is captured upstream by the fuel importers —
 * Ampol, Viva Energy, BP, ExxonMobil — who set their own wholesale
 * prices via the AIP Terminal Gate Price, which they self-report.
 *
 * We break open the "product + supply" bucket using:
 *   - Brent crude + AUD/USD → estimated crude oil cost per litre
 *   - Crack spread → estimated refining margin per litre
 *   - ACCC benchmarks → estimated shipping/terminal costs
 *   - The residual → importer margin (what the fuel companies keep)
 *
 * AIP TGP is quoted INCLUSIVE of excise and GST.
 * Retail prices are also inclusive of excise and GST.
 */

import type { Signal, SignalComponent } from "./types";

// Diesel excise rate: 50.6 c/L as at 1 February 2025
// Indexed to CPI twice yearly (February and August)
const DIESEL_EXCISE = 50.6;

// 1 barrel = 158.987 litres
const LITRES_PER_BARREL = 158.987;

// Estimated shipping + terminal + wharfage costs (c/L)
// ACCC quarterly fuel reports cite 5-10 c/L for import parity.
// We use 8 c/L as mid-range and label it as an estimate.
const SHIPPING_TERMINAL_EST = 8;

// Typical retailer margin range (c/L, ex-GST) — ACCC quarterly reports
const MARGIN_NORMAL_LOW = 6;
const MARGIN_NORMAL_HIGH = 14;

interface ChainBreakdown {
  retailPrice: number;       // c/L inc GST — what you pay
  tgp: number;               // c/L inc GST — wholesale reference
  excise: number;             // c/L — federal government fixed take
  retailerMargin: number;     // c/L ex-GST — what the retailer keeps
  totalGst: number;           // c/L — GST on the whole chain
  // The cracked-open wholesale breakdown (all ex-GST):
  crudeOilCost: number | null;      // c/L — from Brent + AUD/USD
  refiningMargin: number | null;    // c/L — from crack spread
  shippingTerminal: number;         // c/L — ACCC benchmark estimate
  importerMargin: number | null;    // c/L — the residual nobody publishes
  productAndSupply: number;         // c/L — total wholesale ex-tax (for fallback display)
}

function computeChain(
  retailPrice: number,
  tgp: number,
  crudeAudCpl: number | null,
  refiningCpl: number | null,
): ChainBreakdown | null {
  if (retailPrice <= 0 || tgp <= 0) return null;
  if (retailPrice < tgp) return null;

  const tgpExGst = tgp / 1.1;
  const productAndSupply = tgpExGst - DIESEL_EXCISE;
  const retailerMargin = (retailPrice - tgp) / 1.1;
  const totalGst = retailPrice / 11;

  if (productAndSupply <= 0) return null;

  // Compute importer margin as residual if we have crude + refining estimates
  let importerMargin: number | null = null;
  if (crudeAudCpl !== null && refiningCpl !== null) {
    importerMargin = productAndSupply - crudeAudCpl - refiningCpl - SHIPPING_TERMINAL_EST;
    // If negative, our estimates are off — don't show a misleading number
    if (importerMargin < 0) importerMargin = null;
  }

  return {
    retailPrice,
    tgp,
    excise: DIESEL_EXCISE,
    retailerMargin,
    totalGst,
    crudeOilCost: crudeAudCpl,
    refiningMargin: refiningCpl,
    shippingTerminal: SHIPPING_TERMINAL_EST,
    importerMargin,
    productAndSupply,
  };
}

function fmt(v: number): string {
  return `${v.toFixed(1)} c/L`;
}

function pct(part: number, total: number): string {
  return `${((part / total) * 100).toFixed(0)}%`;
}

/**
 * Compute the full fuel price chain transparency signal.
 * Requires: dieselTgp + (waFuel or nswFuel).
 * Enhanced with: brentCrude, audUsd, crackSpread.
 */
export function computePriceChain(
  signals: Record<string, Signal>,
): Signal | null {
  const dieselTgp = signals.dieselTgp;
  const waFuel = signals.waFuel;
  const nswFuel = signals.nswFuel;
  const brentCrude = signals.brentCrude;
  const audUsd = signals.audUsd;
  const crackSpread = signals.crackSpread;

  if (!dieselTgp) return null;
  if (!waFuel && !nswFuel) return null;

  // ── Estimate crude oil cost in AUD c/L ─────────────────────────────────────
  let crudeAudCpl: number | null = null;
  let audRate: number | null = null;

  if (brentCrude && audUsd) {
    const brentMatch = brentCrude.value.match(/([\d.]+)/);
    const audMatch = audUsd.value.match(/([\d.]+)/);
    if (brentMatch && audMatch) {
      const brentUsd = parseFloat(brentMatch[1]);
      audRate = parseFloat(audMatch[1]);
      if (brentUsd > 0 && audRate > 0) {
        const brentAudPerBarrel = brentUsd / audRate;
        crudeAudCpl = (brentAudPerBarrel / LITRES_PER_BARREL) * 100;
      }
    }
  }

  // ── Estimate refining margin in AUD c/L ────────────────────────────────────
  // Crack spread is in USD/barrel — convert to AUD c/L
  let refiningCpl: number | null = null;
  if (crackSpread && audRate) {
    // Crack spread value is like "$28.50/bbl"
    const spreadMatch = crackSpread.value.match(/([\d.]+)/);
    if (spreadMatch) {
      const spreadUsd = parseFloat(spreadMatch[1]);
      if (spreadUsd > 0) {
        const spreadAudPerBarrel = spreadUsd / audRate;
        refiningCpl = (spreadAudPerBarrel / LITRES_PER_BARREL) * 100;
      }
    }
  }

  // ── Extract TGP values ─────────────────────────────────────────────────────
  const tgpMatch = dieselTgp.value.match(/([\d.]+)/);
  if (!tgpMatch) return null;
  const tgpNational = parseFloat(tgpMatch[1]);

  const perthTgp = dieselTgp.regions?.find((r) => r.region === "Perth");
  const perthTgpVal = perthTgp ? parseFloat(perthTgp.value) : null;

  const sydneyTgp = dieselTgp.regions?.find((r) => r.region === "Sydney");
  const sydneyTgpVal = sydneyTgp ? parseFloat(sydneyTgp.value) : null;

  // ── Extract retail prices ──────────────────────────────────────────────────
  let waRetail: number | null = null;
  if (waFuel) {
    const comp = waFuel.components?.find((c) => c.label.includes("Perth metro"));
    if (comp) waRetail = parseFloat(comp.value);
  }

  let nswRetail: number | null = null;
  if (nswFuel) {
    const comp = nswFuel.components?.find((c) =>
      c.label.includes("Sydney metro") || c.label.includes("metro"),
    );
    if (comp) nswRetail = parseFloat(comp.value);
    if (!nswRetail || isNaN(nswRetail)) {
      const m = nswFuel.value.match(/\$([\d.]+)/);
      if (m) nswRetail = parseFloat(m[1]) * 100;
    }
  }

  // ── Compute chains ─────────────────────────────────────────────────────────
  const chains: { city: string; chain: ChainBreakdown }[] = [];

  if (waRetail && !isNaN(waRetail) && perthTgpVal && !isNaN(perthTgpVal)) {
    const chain = computeChain(waRetail, perthTgpVal, crudeAudCpl, refiningCpl);
    if (chain) chains.push({ city: "Perth", chain });
  }

  if (nswRetail && !isNaN(nswRetail) && sydneyTgpVal && !isNaN(sydneyTgpVal)) {
    const chain = computeChain(nswRetail, sydneyTgpVal, crudeAudCpl, refiningCpl);
    if (chain) chains.push({ city: "Sydney", chain });
  }

  if (chains.length === 0 && waRetail && !isNaN(waRetail)) {
    const chain = computeChain(waRetail, tgpNational, crudeAudCpl, refiningCpl);
    if (chain) chains.push({ city: "National avg", chain });
  }

  if (chains.length === 0) return null;

  const primary = chains[0].chain;
  const primaryCity = chains[0].city;

  // ── Trend: based on importer margin if available, else retailer margin ─────
  const hasImporterData = primary.importerMargin !== null;
  const trend: Signal["trend"] = hasImporterData
    ? (primary.importerMargin! > 50
      ? "critical"
      : primary.importerMargin! > 30
        ? "up"
        : "stable")
    : (primary.retailerMargin > 22
      ? "critical"
      : primary.retailerMargin > MARGIN_NORMAL_HIGH
        ? "up"
        : "stable");

  // ── Components: the full price breakdown ───────────────────────────────────
  const components: SignalComponent[] = [];

  for (const { city, chain } of chains) {
    // If we have the full breakdown, show all five slices
    if (chain.crudeOilCost !== null && chain.refiningMargin !== null && chain.importerMargin !== null) {
      components.push({
        label: `${city} crude oil`,
        value: fmt(chain.crudeOilCost),
        change: `${pct(chain.crudeOilCost, chain.retailPrice)} — international markets`,
        trend: "stable",
      });

      components.push({
        label: `${city} refining`,
        value: fmt(chain.refiningMargin),
        change: `${pct(chain.refiningMargin, chain.retailPrice)} — mostly offshore refineries`,
        trend: "stable",
      });

      components.push({
        label: `${city} shipping + terminal`,
        value: fmt(chain.shippingTerminal),
        change: `${pct(chain.shippingTerminal, chain.retailPrice)} — est. ACCC benchmark`,
        trend: "stable",
      });

      components.push({
        label: `${city} importer margin`,
        value: fmt(chain.importerMargin),
        change: `${pct(chain.importerMargin, chain.retailPrice)} — Ampol, Viva, BP, ExxonMobil`,
        trend: chain.importerMargin > 50 ? "critical" : chain.importerMargin > 30 ? "up" : "stable",
      });
    } else {
      // Fallback: show product + supply as one bucket
      components.push({
        label: `${city} product + supply`,
        value: fmt(chain.productAndSupply),
        change: `${pct(chain.productAndSupply, chain.retailPrice)} — oil, refining, shipping, importer`,
        trend: "stable",
      });
    }

    components.push({
      label: `${city} excise`,
      value: fmt(chain.excise),
      change: `${pct(chain.excise, chain.retailPrice)} — federal government`,
      trend: "stable",
    });

    components.push({
      label: `${city} retailer margin`,
      value: fmt(chain.retailerMargin),
      change: `${pct(chain.retailerMargin, chain.retailPrice)} — service station`,
      trend: chain.retailerMargin > MARGIN_NORMAL_HIGH ? "up" : "stable",
    });

    components.push({
      label: `${city} GST`,
      value: fmt(chain.totalGst),
      change: `${pct(chain.totalGst, chain.retailPrice)} — federal government`,
      trend: "stable",
    });
  }

  // ── Headline: lead with the most important finding ─────────────────────────
  let value: string;
  if (hasImporterData) {
    value = `Fuel importers taking an estimated ${fmt(primary.importerMargin!)} per litre`;
  } else if (primary.retailerMargin > MARGIN_NORMAL_HIGH) {
    value = `Retailers taking ${fmt(primary.retailerMargin)} per litre above cost`;
  } else {
    value = `Retailer margin ${fmt(primary.retailerMargin)} — importers take ${fmt(primary.productAndSupply)}`;
  }

  // ── Context narrative ──────────────────────────────────────────────────────
  let context: string;

  if (hasImporterData && primary.crudeOilCost !== null && primary.refiningMargin !== null) {
    context =
      `Every litre of diesel in ${primaryCity} at $${(primary.retailPrice / 100).toFixed(2)}/L. ` +
      `Crude oil costs about ${fmt(primary.crudeOilCost)} per litre. ` +
      `Refining adds roughly ${fmt(primary.refiningMargin)}. ` +
      `Shipping and terminal costs are around ${fmt(primary.shippingTerminal)}. ` +
      `The fuel importers — Ampol, Viva Energy, BP, and ExxonMobil — keep an estimated ${fmt(primary.importerMargin!)} (${pct(primary.importerMargin!, primary.retailPrice)} of the pump price). ` +
      `The retailer at the bowser keeps ${fmt(primary.retailerMargin)} (${pct(primary.retailerMargin, primary.retailPrice)}). ` +
      `The federal government takes ${fmt(primary.excise + primary.totalGst)} in excise and GST (${pct(primary.excise + primary.totalGst, primary.retailPrice)}).`;

    context +=
      ` The public debate about price gouging focuses on the bowser, but the retailer takes ${pct(primary.retailerMargin, primary.retailPrice)}. ` +
      `The fuel importers take ${pct(primary.importerMargin!, primary.retailPrice)}. ` +
      `These same companies set the wholesale price via the Australian Institute of Petroleum — a body they fund and control. ` +
      `The ACCC has this data but does not publish this breakdown.`;
  } else {
    context =
      `Every litre of diesel in ${primaryCity} at $${(primary.retailPrice / 100).toFixed(2)}/L breaks down like this. ` +
      `Product and supply: ${fmt(primary.productAndSupply)} (${pct(primary.productAndSupply, primary.retailPrice)}). ` +
      `Federal excise: ${fmt(primary.excise)} (${pct(primary.excise, primary.retailPrice)}). ` +
      `GST: ${fmt(primary.totalGst)} (${pct(primary.totalGst, primary.retailPrice)}). ` +
      `What the retailer keeps: ${fmt(primary.retailerMargin)} (${pct(primary.retailerMargin, primary.retailPrice)}). ` +
      `The terminal gate price is set by Ampol, Viva Energy, BP, and ExxonMobil via the Australian Institute of Petroleum. ` +
      `The ACCC monitors fuel pricing conduct but does not publish this breakdown for the public.`;
  }

  // Cross-city comparison on importer margin
  if (chains.length > 1) {
    const other = chains[1];
    if (other.chain.importerMargin !== null && primary.importerMargin !== null) {
      const diff = other.chain.importerMargin - primary.importerMargin;
      if (Math.abs(diff) > 1) {
        context +=
          ` In ${other.city}, the estimated importer margin is ${fmt(other.chain.importerMargin)}` +
          ` (${Math.abs(diff).toFixed(1)} c/L ${diff > 0 ? "more" : "less"} than ${primaryCity}).`;
      }
    }
  }

  context +=
    ` Estimates use Brent crude, the US distillate crack spread (proxy for Singapore refining margin), ` +
    `and ACCC shipping benchmarks. Individual figures are approximate; the overall picture is structurally sound.`;

  return {
    label: "Fuel price chain (diesel)",
    value,
    trend,
    source: "Derived: AIP, FuelWatch, FuelCheck, Yahoo Finance, ACCC",
    sourceUrl: "https://www.aip.com.au/pricing/terminal-gate-prices",
    context,
    lastUpdated: new Date().toISOString(),
    automated: true,
    layer: 4,
    layerLabel: "Retail impact — price transparency",
    propagatesTo:
      "Public understanding of fuel pricing. The gap between crude oil cost and the terminal gate price is where the largest margin is captured — by the same companies that set the wholesale price.",
    components,
  };
}
