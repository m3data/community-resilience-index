/**
 * Fuel Price Chain — Where Your Money Goes
 *
 * Breaks down the retail fuel price into its components so the public
 * can see exactly who takes what. The ACCC has this data. The Premier
 * points to the ACCC. Nobody shows it to the public. We do.
 *
 * AIP Terminal Gate Prices are quoted INCLUSIVE of excise and GST.
 * FuelWatch/FuelCheck retail prices are also inclusive of excise and GST.
 * Both are on the same basis — the difference is the retailer's take.
 *
 * Decomposition:
 *   tgp_ex_gst = tgp / 1.1
 *   product_and_supply = tgp_ex_gst - excise
 *   retailer_margin_ex_gst = (retail - tgp) / 1.1
 *   total_gst = retail / 11
 *   retail = product_and_supply + excise + retailer_margin_ex_gst + total_gst
 */

import type { Signal, SignalComponent } from "./types";

// Diesel excise rate: 50.6 c/L as at 1 February 2025
// Indexed to CPI twice yearly (February and August)
const DIESEL_EXCISE = 50.6;

// 1 barrel = 158.987 litres
const LITRES_PER_BARREL = 158.987;

// Typical retailer margin range (c/L, ex-GST) — ACCC quarterly report benchmarks
const MARGIN_NORMAL_LOW = 6;
const MARGIN_NORMAL_HIGH = 14;

interface ChainBreakdown {
  retailPrice: number; // c/L inc GST — what you pay at the pump
  tgp: number; // c/L inc GST — wholesale reference price
  productAndSupply: number; // c/L ex-GST — international product + refining + shipping + wholesale margin
  excise: number; // c/L — federal government fixed take
  retailerMargin: number; // c/L ex-GST — what the retailer keeps
  totalGst: number; // c/L — GST on the whole chain
  brentComponent: number | null; // c/L — estimated crude oil cost (subset of productAndSupply)
}

function computeChain(
  retailPrice: number,
  tgp: number,
  brentAudCentsPerLitre: number | null,
): ChainBreakdown | null {
  if (retailPrice <= 0 || tgp <= 0) return null;
  if (retailPrice < tgp) return null; // Retail below wholesale — bad data

  const tgpExGst = tgp / 1.1;
  const productAndSupply = tgpExGst - DIESEL_EXCISE;
  const retailerMargin = (retailPrice - tgp) / 1.1;
  const totalGst = retailPrice / 11;

  // Sanity: product cost should be positive
  if (productAndSupply <= 0) return null;

  return {
    retailPrice,
    tgp,
    productAndSupply,
    excise: DIESEL_EXCISE,
    retailerMargin,
    totalGst,
    brentComponent: brentAudCentsPerLitre,
  };
}

function formatCents(v: number): string {
  return `${v.toFixed(1)} c/L`;
}

function pctOf(part: number, total: number): string {
  return `${((part / total) * 100).toFixed(0)}%`;
}

function marginAssessment(margin: number): string {
  if (margin > 22) {
    return `Well above the typical ${MARGIN_NORMAL_LOW}-${MARGIN_NORMAL_HIGH} c/L range. This is where price gouging shows up.`;
  }
  if (margin > MARGIN_NORMAL_HIGH) {
    return `Above the typical ${MARGIN_NORMAL_LOW}-${MARGIN_NORMAL_HIGH} c/L range. Retailers are taking more than usual.`;
  }
  if (margin < MARGIN_NORMAL_LOW) {
    return `Below the typical ${MARGIN_NORMAL_LOW}-${MARGIN_NORMAL_HIGH} c/L range. Retailers are absorbing some cost, likely under competitive pressure.`;
  }
  return `Within the typical ${MARGIN_NORMAL_LOW}-${MARGIN_NORMAL_HIGH} c/L range. Wholesale costs are passing through normally.`;
}

/**
 * Compute the full fuel price chain transparency signal.
 * Requires: dieselTgp, waFuel or nswFuel. Optionally: brentCrude, audUsd.
 */
export function computePriceChain(
  signals: Record<string, Signal>,
): Signal | null {
  const dieselTgp = signals.dieselTgp;
  const waFuel = signals.waFuel;
  const nswFuel = signals.nswFuel;
  const brentCrude = signals.brentCrude;
  const audUsd = signals.audUsd;

  if (!dieselTgp) return null;
  if (!waFuel && !nswFuel) return null;

  // ── Estimate Brent crude in AUD c/L ────────────────────────────────────────
  let brentAudCentsPerLitre: number | null = null;
  if (brentCrude && audUsd) {
    const brentMatch = brentCrude.value.match(/([\d.]+)/);
    const audMatch = audUsd.value.match(/([\d.]+)/);
    if (brentMatch && audMatch) {
      const brentUsd = parseFloat(brentMatch[1]);
      const audRate = parseFloat(audMatch[1]);
      if (brentUsd > 0 && audRate > 0) {
        const brentAudPerBarrel = brentUsd / audRate;
        brentAudCentsPerLitre = (brentAudPerBarrel / LITRES_PER_BARREL) * 100;
      }
    }
  }

  // ── Extract TGP values ─────────────────────────────────────────────────────
  const tgpMatch = dieselTgp.value.match(/([\d.]+)/);
  if (!tgpMatch) return null;
  const tgpNational = parseFloat(tgpMatch[1]);

  const perthTgpRegion = dieselTgp.regions?.find((r) => r.region === "Perth");
  const perthTgp = perthTgpRegion ? parseFloat(perthTgpRegion.value) : null;

  const sydneyTgpRegion = dieselTgp.regions?.find((r) => r.region === "Sydney");
  const sydneyTgp = sydneyTgpRegion ? parseFloat(sydneyTgpRegion.value) : null;

  // ── Extract retail prices ──────────────────────────────────────────────────
  let waRetail: number | null = null;
  if (waFuel) {
    const metroComp = waFuel.components?.find((c) => c.label.includes("Perth metro"));
    if (metroComp) waRetail = parseFloat(metroComp.value);
  }

  let nswRetail: number | null = null;
  if (nswFuel) {
    const metroComp = nswFuel.components?.find((c) =>
      c.label.includes("Sydney metro") || c.label.includes("metro"),
    );
    if (metroComp) nswRetail = parseFloat(metroComp.value);
    if (!nswRetail || isNaN(nswRetail)) {
      const valMatch = nswFuel.value.match(/\$([\d.]+)/);
      if (valMatch) nswRetail = parseFloat(valMatch[1]) * 100;
    }
  }

  // ── Compute chains ─────────────────────────────────────────────────────────
  const chains: { city: string; chain: ChainBreakdown }[] = [];

  if (waRetail && !isNaN(waRetail) && perthTgp && !isNaN(perthTgp)) {
    const chain = computeChain(waRetail, perthTgp, brentAudCentsPerLitre);
    if (chain) chains.push({ city: "Perth", chain });
  }

  if (nswRetail && !isNaN(nswRetail) && sydneyTgp && !isNaN(sydneyTgp)) {
    const chain = computeChain(nswRetail, sydneyTgp, brentAudCentsPerLitre);
    if (chain) chains.push({ city: "Sydney", chain });
  }

  if (chains.length === 0 && waRetail && !isNaN(waRetail)) {
    const chain = computeChain(waRetail, tgpNational, brentAudCentsPerLitre);
    if (chain) chains.push({ city: "National avg", chain });
  }

  if (chains.length === 0) return null;

  const primary = chains[0].chain;
  const primaryCity = chains[0].city;

  // ── Trend: based on retailer margin ────────────────────────────────────────
  const trend: Signal["trend"] =
    primary.retailerMargin > 22
      ? "critical"
      : primary.retailerMargin > MARGIN_NORMAL_HIGH
        ? "up"
        : primary.retailerMargin < MARGIN_NORMAL_LOW
          ? "down"
          : "stable";

  // ── Components: the price breakdown ────────────────────────────────────────
  const components: SignalComponent[] = [];

  for (const { city, chain } of chains) {
    // The four slices of every litre
    components.push({
      label: `${city} product + supply`,
      value: formatCents(chain.productAndSupply),
      change: `${pctOf(chain.productAndSupply, chain.retailPrice)} — oil, refining, shipping, wholesale`,
      trend: "stable",
    });

    components.push({
      label: `${city} excise`,
      value: formatCents(chain.excise),
      change: `${pctOf(chain.excise, chain.retailPrice)} — federal government`,
      trend: "stable",
    });

    components.push({
      label: `${city} retailer margin`,
      value: formatCents(chain.retailerMargin),
      change: `${pctOf(chain.retailerMargin, chain.retailPrice)} of pump price`,
      trend: chain.retailerMargin > MARGIN_NORMAL_HIGH ? "up" : chain.retailerMargin > 22 ? "critical" : "stable",
    });

    components.push({
      label: `${city} GST`,
      value: formatCents(chain.totalGst),
      change: `${pctOf(chain.totalGst, chain.retailPrice)} — federal government`,
      trend: "stable",
    });
  }

  // Brent context if available
  if (brentAudCentsPerLitre !== null && primary.brentComponent !== null) {
    const brentShare = pctOf(primary.brentComponent, primary.productAndSupply);
    components.push({
      label: "Crude oil cost (est.)",
      value: formatCents(primary.brentComponent),
      change: `~${brentShare} of product + supply cost`,
      trend: "stable",
    });
  }

  // ── Value: headline ────────────────────────────────────────────────────────
  const value =
    primary.retailerMargin > MARGIN_NORMAL_HIGH
      ? `Retailers taking ${formatCents(primary.retailerMargin)} per litre above cost`
      : primary.retailerMargin < MARGIN_NORMAL_LOW
        ? `Retailer margins compressed to ${formatCents(primary.retailerMargin)}`
        : `Retailer margin ${formatCents(primary.retailerMargin)} per litre`;

  // ── Context narrative ──────────────────────────────────────────────────────
  let context =
    `Every litre of diesel in ${primaryCity} at $${(primary.retailPrice / 100).toFixed(2)}/L breaks down like this. ` +
    `Product and supply: ${formatCents(primary.productAndSupply)} (${pctOf(primary.productAndSupply, primary.retailPrice)}). ` +
    `Federal excise: ${formatCents(primary.excise)} (${pctOf(primary.excise, primary.retailPrice)}). ` +
    `GST: ${formatCents(primary.totalGst)} (${pctOf(primary.totalGst, primary.retailPrice)}). ` +
    `What the retailer keeps: ${formatCents(primary.retailerMargin)} (${pctOf(primary.retailerMargin, primary.retailPrice)}). ` +
    `${marginAssessment(primary.retailerMargin)}`;

  // Cross-city comparison
  if (chains.length > 1) {
    const other = chains[1];
    const diff = other.chain.retailerMargin - primary.retailerMargin;
    if (Math.abs(diff) > 0.5) {
      context +=
        ` In ${other.city}, the retailer margin is ${formatCents(other.chain.retailerMargin)}` +
        ` (${Math.abs(diff).toFixed(1)} c/L ${diff > 0 ? "more" : "less"} than ${primaryCity}).`;
    }
  }

  context +=
    ` Excise is set by the federal government and indexed to CPI twice yearly (currently ${formatCents(DIESEL_EXCISE)}).` +
    ` The terminal gate price is published daily by the Australian Institute of Petroleum.` +
    ` The ACCC monitors fuel pricing conduct but does not publish this breakdown for the public.`;

  return {
    label: "Fuel price chain (diesel)",
    value,
    trend,
    source: "Derived: AIP TGP + FuelWatch/FuelCheck + ATO excise rates",
    sourceUrl: "https://www.aip.com.au/pricing/terminal-gate-prices",
    context,
    lastUpdated: new Date().toISOString(),
    automated: true,
    layer: 4,
    layerLabel: "Retail impact — price transparency",
    propagatesTo:
      "Public understanding of fuel pricing. When margins widen beyond the typical range, it signals that retailers are pricing above cost-justified levels.",
    components,
  };
}
