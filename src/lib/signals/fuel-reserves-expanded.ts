/**
 * DCCEEW Australian Petroleum Statistics — Expanded Signals
 *
 * Three signals extracted from the same XLSX the headline reserves module uses:
 *
 * 1. Product-level reserves — diesel, gasoline, jet fuel days separately
 *    (Sheet: "Consumption cover")
 *
 * 2. IEA compliance gap — onshore days vs 90-day obligation, with the
 *    "on the way" breakdown that reveals the MSO accounting gap
 *    (Sheets: "IEA days net import cover" + "Stock IEA days incl. on the way")
 *
 * 3. Onshore vs headline stock volumes — the transparency disclosure
 *    (Sheets: "Stock volume by product" + "Stock volume incl. on the way")
 *
 * These share the XLSX download with fuel-reserves.ts. Next.js revalidation
 * means the file is only fetched once per 24h regardless of how many
 * signal modules read it.
 */

import ExcelJS from "exceljs";
import type { Signal, SignalComponent } from "./types";

const CKAN_API = "https://data.gov.au/data/api/3/action";
const DATASET_ID = "d889484e-fb65-4190-a2e3-1739517cbf9b";

// --- Shared XLSX fetching with in-process cache ---
// The DCCEEW XLSX is 3.6MB — exceeds Next.js 2MB fetch cache limit.
// In-process cache avoids re-downloading on every request within the same worker.

let cachedWb: ExcelJS.Workbook | null = null;

async function fetchWorkbook(): Promise<ExcelJS.Workbook | null> {
  if (cachedWb) return cachedWb;

  try {
    const pkgRes = await fetch(`${CKAN_API}/package_show?id=${DATASET_ID}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!pkgRes.ok) return null;

    const pkg = await pkgRes.json();
    if (!pkg.success) return null;

    const xlsResource = pkg.result.resources?.find(
      (r: { format: string }) =>
        r.format?.toUpperCase().includes("XLS") ||
        r.format?.toUpperCase().includes("EXCEL")
    );
    if (!xlsResource?.url) return null;

    const xlsRes = await fetch(xlsResource.url, {
      next: { revalidate: 21600 }, // hint — silently ignored for >2MB, but harmless
      signal: AbortSignal.timeout(30000),
    });
    if (!xlsRes.ok) return null;

    const buf = await xlsRes.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(Buffer.from(buf) as any);
    cachedWb = wb;
    return wb;
  } catch {
    return null;
  }
}

function getDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val);
  if (typeof val === "number") {
    // Excel serial date
    return new Date((val - 25569) * 86400 * 1000);
  }
  return null;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function num(val: unknown): number {
  return typeof val === "number" ? val : 0;
}

// --- Signal 1: Product-level reserves ---

export async function fetchProductReserves(): Promise<Signal | null> {
  try {
    const wb = await fetchWorkbook();
    if (!wb) return null;

    const ws = wb.getWorksheet("Consumption cover");
    if (!ws) return null;

    // Parse last two rows for trend
    const lastRow = ws.getRow(ws.rowCount);
    const prevRow = ws.rowCount > 2 ? ws.getRow(ws.rowCount - 1) : null;

    const month = getDate(lastRow.getCell(1).value);
    if (!month) return null;

    const diesel = num(lastRow.getCell(7).value);
    const gasoline = num(lastRow.getCell(4).value);
    const jetFuel = num(lastRow.getCell(6).value);
    const crude = num(lastRow.getCell(2).value);
    const lpg = num(lastRow.getCell(3).value);
    const total = num(lastRow.getCell(11).value);

    const prevDiesel = prevRow ? num(prevRow.getCell(7).value) : null;
    const prevGasoline = prevRow ? num(prevRow.getCell(4).value) : null;
    const prevJetFuel = prevRow ? num(prevRow.getCell(6).value) : null;

    const components: SignalComponent[] = [
      {
        label: "Diesel",
        value: `${diesel} days`,
        change: prevDiesel !== null ? `was ${prevDiesel} days` : undefined,
        trend: diesel < 20 ? "critical" : diesel < 30 ? "down" : "stable",
      },
      {
        label: "Gasoline (petrol)",
        value: `${gasoline} days`,
        change: prevGasoline !== null ? `was ${prevGasoline} days` : undefined,
        trend: gasoline < 20 ? "critical" : gasoline < 30 ? "down" : "stable",
      },
      {
        label: "Aviation turbine fuel",
        value: `${jetFuel} days`,
        change: prevJetFuel !== null ? `was ${prevJetFuel} days` : undefined,
        trend: jetFuel < 15 ? "critical" : jetFuel < 25 ? "down" : "stable",
      },
      {
        label: "Crude oil feedstock",
        value: `${crude} days`,
        trend: crude < 25 ? "down" : "stable",
      },
      {
        label: "LPG",
        value: `${lpg} days`,
        trend: lpg < 30 ? "down" : "stable",
      },
    ];

    // Most critical fuel
    const lowestFuel = [
      { name: "diesel", days: diesel },
      { name: "gasoline", days: gasoline },
      { name: "jet fuel", days: jetFuel },
    ].sort((a, b) => a.days - b.days)[0];

    const trend: Signal["trend"] =
      lowestFuel.days < 15 ? "critical" :
      lowestFuel.days < 25 ? "down" : "stable";

    let context = `${formatMonth(month)}: Australia holds ${diesel} days of diesel, ${gasoline} days of gasoline, and ${jetFuel} days of jet fuel. Total product stocks equivalent: ${total} days.`;

    if (lowestFuel.days < 25) {
      context += ` ${lowestFuel.name.charAt(0).toUpperCase() + lowestFuel.name.slice(1)} is the most constrained fuel at ${lowestFuel.days} days.`;
    }

    context += " Diesel matters most for cascading failure — it powers freight, agriculture, mining, and emergency services. A diesel shortage propagates through the entire supply chain within days.";

    if (jetFuel < 25) {
      context += ` Jet fuel at ${jetFuel} days is below comfortable margins — flight cancellations and route suspensions become likely below 15 days.`;
    }

    return {
      label: "Fuel reserves by product",
      value: `Diesel ${diesel}d · Petrol ${gasoline}d · Jet ${jetFuel}d`,
      trend,
      source: `DCCEEW Petroleum Statistics — ${formatMonth(month)}`,
      sourceUrl: "https://www.energy.gov.au/government-priorities/energy-data/australian-petroleum-statistics",
      context,
      lastUpdated: month.toISOString(),
      automated: true,
      layer: 2,
      layerLabel: "Supply position",
      propagatesTo: "Product-specific supply chains — diesel→freight→food; jet fuel→aviation; gasoline→commuters",
      components,
    };
  } catch {
    return null;
  }
}

// --- Signal 2: IEA compliance gap ---

export async function fetchIeaCompliance(): Promise<Signal | null> {
  try {
    const wb = await fetchWorkbook();
    if (!wb) return null;

    // IEA days — onshore only
    const ieaWs = wb.getWorksheet("IEA days net import cover");
    // IEA days — including on the way (MSO headline)
    const ieaOtwWs = wb.getWorksheet("Stock IEA days incl. on the way");

    if (!ieaWs || !ieaOtwWs) return null;

    const ieaRow = ieaWs.getRow(ieaWs.rowCount);
    const otwRow = ieaOtwWs.getRow(ieaOtwWs.rowCount);

    const month = getDate(ieaRow.getCell(1).value);
    if (!month) return null;

    const onshoreDays = num(ieaRow.getCell(3).value);
    const atSeaDays = num(otwRow.getCell(3).value);
    const overseasDays = num(otwRow.getCell(4).value);
    const headlineDays = num(otwRow.getCell(5).value);

    const IEA_OBLIGATION = 90;
    const gap = IEA_OBLIGATION - headlineDays;
    const onshoreGap = IEA_OBLIGATION - onshoreDays;
    const headlinePercent = Math.round((headlineDays / IEA_OBLIGATION) * 100);
    const onshorePercent = Math.round((onshoreDays / IEA_OBLIGATION) * 100);

    // Previous month for trend
    const prevRow = ieaWs.rowCount > 2 ? ieaWs.getRow(ieaWs.rowCount - 1) : null;
    const prevOnshore = prevRow ? num(prevRow.getCell(3).value) : null;

    const components: SignalComponent[] = [
      {
        label: "Onshore (physically in Australia)",
        value: `${onshoreDays} days (${onshorePercent}% of obligation)`,
        change: prevOnshore !== null ? `was ${prevOnshore} days` : undefined,
        trend: onshoreDays < 40 ? "critical" : onshoreDays < 60 ? "down" : "stable",
      },
      {
        label: "At sea (vessels destined for Australia)",
        value: `${atSeaDays} days`,
        trend: "stable",
      },
      {
        label: "Overseas (awaiting delivery)",
        value: `${overseasDays} days`,
        trend: "stable",
      },
      {
        label: "MSO headline total",
        value: `${headlineDays} days (${headlinePercent}% of obligation)`,
        trend: headlineDays < 60 ? "critical" : headlineDays < 75 ? "down" : "stable",
      },
    ];

    const trend: Signal["trend"] =
      onshoreDays < 40 ? "critical" :
      headlineDays < 60 ? "down" : "stable";

    let context = `${formatMonth(month)}: Australia holds ${onshoreDays} IEA days of fuel onshore. The government reports ${headlineDays} days by including ${atSeaDays} days on ships at sea and ${overseasDays} days of fuel overseas — fuel Australia counts but does not physically control.`;

    context += ` The IEA minimum obligation is ${IEA_OBLIGATION} days. Australia is ${gap} days short even by the headline figure, and ${onshoreGap} days short by what is physically in the country.`;

    context += " Australia has been below the 90-day IEA minimum since 2012 — the only IEA member nation failing this obligation continuously. The MSO headline methodology counts fuel on coastal vessels, in pipelines, and within the exclusive economic zone. In a sudden supply disruption (strait closure, shipping disruption, refinery incident), only the onshore figure represents fuel that is immediately available.";

    return {
      label: "IEA fuel reserve compliance",
      value: `${onshoreDays} days onshore (obligation: ${IEA_OBLIGATION})`,
      trend,
      source: `DCCEEW Petroleum Statistics — ${formatMonth(month)}`,
      sourceUrl: "https://www.energy.gov.au/government-priorities/energy-data/australian-petroleum-statistics",
      context,
      lastUpdated: month.toISOString(),
      automated: true,
      layer: 2,
      layerLabel: "Supply position",
      propagatesTo: "National energy security posture, diplomatic leverage, crisis response capacity",
      components,
      secondary: {
        label: "Accounting gap",
        value: `${headlineDays - onshoreDays} days of fuel counted but not in Australia`,
        detail: `MSO headline ${headlineDays}d minus onshore ${onshoreDays}d = ${headlineDays - onshoreDays}d at sea or overseas. This is ${Math.round(((headlineDays - onshoreDays) / headlineDays) * 100)}% of the headline figure.`,
      },
    };
  } catch {
    return null;
  }
}

// --- Signal 3: Stock volumes (onshore vs headline) ---

export async function fetchStockVolumes(): Promise<Signal | null> {
  try {
    const wb = await fetchWorkbook();
    if (!wb) return null;

    const onshoreWs = wb.getWorksheet("Stock volume by product");
    const headlineWs = wb.getWorksheet("Stock volume incl. on the way");

    if (!onshoreWs || !headlineWs) return null;

    const onshoreRow = onshoreWs.getRow(onshoreWs.rowCount);
    const headlineRow = headlineWs.getRow(headlineWs.rowCount);

    const month = getDate(onshoreRow.getCell(1).value);
    if (!month) return null;

    // Onshore volumes (ML)
    const onshoreDiesel = num(onshoreRow.getCell(7).value);
    const onshoreGasoline = num(onshoreRow.getCell(4).value);
    const onshoreJetFuel = num(onshoreRow.getCell(6).value);
    const onshoreTotal = num(onshoreRow.getCell(11).value);

    // Headline volumes (ML)
    const onLand = num(headlineRow.getCell(2).value);
    const atSea = num(headlineRow.getCell(3).value);
    const overseas = num(headlineRow.getCell(4).value);
    const headlineTotal = num(headlineRow.getCell(5).value);

    // The gap
    const gapML = headlineTotal - onLand;
    const gapPercent = headlineTotal > 0 ? Math.round((gapML / headlineTotal) * 100) : 0;

    const components: SignalComponent[] = [
      {
        label: "Diesel (onshore)",
        value: `${Math.round(onshoreDiesel)} ML`,
        trend: onshoreDiesel < 2000 ? "critical" : onshoreDiesel < 2500 ? "down" : "stable",
      },
      {
        label: "Gasoline (onshore)",
        value: `${Math.round(onshoreGasoline)} ML`,
        trend: onshoreGasoline < 1000 ? "critical" : onshoreGasoline < 1500 ? "down" : "stable",
      },
      {
        label: "Jet fuel (onshore)",
        value: `${Math.round(onshoreJetFuel)} ML`,
        trend: onshoreJetFuel < 400 ? "critical" : onshoreJetFuel < 600 ? "down" : "stable",
      },
      {
        label: "On vessels at sea",
        value: `${Math.round(atSea)} ML`,
        trend: "stable",
      },
      {
        label: "Held overseas",
        value: `${Math.round(overseas)} ML`,
        trend: "stable",
      },
    ];

    const trend: Signal["trend"] =
      onshoreDiesel < 2000 ? "critical" :
      onshoreDiesel < 2500 ? "down" : "stable";

    let context = `${formatMonth(month)}: ${Math.round(onLand)} ML of petroleum products physically in Australia. The MSO headline counts ${Math.round(headlineTotal)} ML — the additional ${Math.round(gapML)} ML (${gapPercent}% of headline) is on ships or held overseas.`;

    context += ` Onshore breakdown: diesel ${Math.round(onshoreDiesel)} ML, gasoline ${Math.round(onshoreGasoline)} ML, jet fuel ${Math.round(onshoreJetFuel)} ML. Total onshore product stocks (crude oil equivalent): ${Math.round(onshoreTotal)} ML.`;

    context += " Volume data complements the days-of-cover metric. A country can have stable days-of-cover while volumes fall if consumption falls — which may indicate economic contraction rather than improved supply security.";

    return {
      label: "Fuel stock volumes",
      value: `${Math.round(onLand)} ML onshore (${Math.round(headlineTotal)} ML headline)`,
      trend,
      source: `DCCEEW Petroleum Statistics — ${formatMonth(month)}`,
      sourceUrl: "https://www.energy.gov.au/government-priorities/energy-data/australian-petroleum-statistics",
      context,
      lastUpdated: month.toISOString(),
      automated: true,
      layer: 2,
      layerLabel: "Supply position",
      propagatesTo: "Physical supply buffer, crisis response capacity, import dependency exposure",
      components,
      secondary: {
        label: "Headline accounting gap",
        value: `${Math.round(gapML)} ML counted but not physically in Australia`,
        detail: `${gapPercent}% of the MSO headline (${Math.round(headlineTotal)} ML) is at sea (${Math.round(atSea)} ML) or overseas (${Math.round(overseas)} ML). Transit time from Asia-Pacific: 2-4 weeks.`,
      },
    };
  } catch {
    return null;
  }
}
