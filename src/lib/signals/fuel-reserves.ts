/**
 * DCCEEW Australian Petroleum Statistics via data.gov.au CKAN API
 *
 * Monthly XLSX with national fuel stock data.
 * Key sheets: "Consumption cover" (days by product), "IEA days net import cover"
 *
 * Dates in the spreadsheet are Excel serial numbers.
 */

import ExcelJS from "exceljs";
import type { Signal } from "./types";

const CKAN_API = "https://data.gov.au/data/api/3/action";
const DATASET_ID = "d889484e-fb65-4190-a2e3-1739517cbf9b";

function excelDateToJS(serial: number): Date {
  // Excel epoch is 1900-01-01, with the 1900 leap year bug
  return new Date((serial - 25569) * 86400 * 1000);
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

interface ConsumptionRow {
  month: Date;
  crude: number;
  lpg: number;
  gasoline: number;
  aviationGas: number;
  aviationTurbine: number;
  diesel: number;
  fuelOil: number;
}

function parseConsumptionCover(wb: ExcelJS.Workbook): ConsumptionRow[] {
  const ws = wb.getWorksheet("Consumption cover");
  if (!ws) return [];

  const rows: ConsumptionRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const val = (col: number) => row.getCell(col).value;
    if (typeof val(1) !== "number") return;
    rows.push({
      month: excelDateToJS(val(1) as number),
      crude: val(2) as number,
      lpg: val(3) as number,
      gasoline: val(4) as number,
      aviationGas: val(5) as number,
      aviationTurbine: val(6) as number,
      diesel: val(7) as number,
      fuelOil: val(8) as number,
    });
  });
  return rows;
}

interface IeaRow {
  month: Date;
  dailyNetImports: number;
  ieaDays: number;
}

function parseIeaDays(wb: ExcelJS.Workbook): IeaRow[] {
  const ws = wb.getWorksheet("IEA days net import cover");
  if (!ws) return [];

  const rows: IeaRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const val = (col: number) => row.getCell(col).value;
    if (typeof val(1) !== "number") return;
    rows.push({
      month: excelDateToJS(val(1) as number),
      dailyNetImports: val(2) as number,
      ieaDays: val(3) as number,
    });
  });
  return rows;
}

export async function fetchFuelReserves(): Promise<Signal | null> {
  try {
    // Get dataset metadata from CKAN
    const pkgRes = await fetch(`${CKAN_API}/package_show?id=${DATASET_ID}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!pkgRes.ok) return null;

    const pkg = await pkgRes.json();
    if (!pkg.success) return null;

    // Find the XLSX resource — format string is "excel (.xlsx)" not "XLSX"
    const xlsResource = pkg.result.resources?.find(
      (r: { format: string }) =>
        r.format?.toUpperCase().includes("XLS") ||
        r.format?.toUpperCase().includes("EXCEL")
    );
    if (!xlsResource?.url) return null;

    // Download and parse
    const xlsRes = await fetch(xlsResource.url, {
      cache: "no-store", // XLSX can be large
      signal: AbortSignal.timeout(30000),
    });
    if (!xlsRes.ok) return null;

    const buf = await xlsRes.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(Buffer.from(buf) as any);

    // Parse consumption cover (days by product type)
    const consumption = parseConsumptionCover(wb);
    const ieaDays = parseIeaDays(wb);

    if (consumption.length === 0) return null;

    const latest = consumption[consumption.length - 1];
    const previous = consumption.length > 1 ? consumption[consumption.length - 2] : null;
    const latestIea = ieaDays.length > 0 ? ieaDays[ieaDays.length - 1] : null;
    const reportMonth = formatMonth(latest.month);

    // Weighted average of key transport fuels (diesel + gasoline)
    const avgDays = Math.round((latest.diesel + latest.gasoline) / 2);

    // Determine trend
    const trend = avgDays < 20 ? "critical" as const : avgDays < 30 ? "down" as const : "stable" as const;

    // Build context
    let context = `${reportMonth}: diesel ${latest.diesel} days, gasoline ${latest.gasoline} days of consumption cover.`;

    if (previous) {
      const dieselDiff = latest.diesel - previous.diesel;
      const direction = dieselDiff > 0 ? "up" : "down";
      context += ` Diesel ${direction} ${Math.abs(dieselDiff)} days from ${formatMonth(previous.month)}.`;
    }

    if (latestIea) {
      context += ` IEA net import cover: ${latestIea.ieaDays} days (minimum obligation: 90 days).`;
    }

    context += " Australia's net import dependency ~90%. Only two domestic refineries remain (Ampol Lytton, Viva Geelong).";

    // Controllable reserves disclosure — MSO headline includes fuel on water,
    // in pipelines, in EEZ vessels, and crude at refineries converted to product
    // equivalent. Actual onshore controllable stocks are materially lower.
    context +=
      " IMPORTANT: These are Minimum Stockholding Obligation (MSO) headline figures." +
      " They include fuel on coastal vessels, in pipelines, and within Australia's exclusive economic zone" +
      " — fuel over which Australia may have limited sovereign control in a crisis." +
      " Actual onshore controllable reserves (fuel physically held in terminals and depots)" +
      " are below these headline figures and falling.";

    return {
      label: "Fuel reserves (headline)",
      value: `~${avgDays} days`,
      trend,
      source: `DCCEEW Petroleum Statistics — ${reportMonth}`,
      sourceUrl: "https://www.energy.gov.au/government-priorities/energy-data/australian-petroleum-statistics",
      context,
      lastUpdated: latest.month.toISOString(),
      automated: true,
      layer: 2,
      layerLabel: "Supply position",
      propagatesTo: "Days of buffer before supply disruption hits retail",
    };
  } catch {
    return null;
  }
}
