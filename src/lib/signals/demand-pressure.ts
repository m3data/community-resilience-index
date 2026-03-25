/**
 * Demand-side pressure — panic buying, station availability, retail price surge
 *
 * Reads from data/manual-signals.json — update that file and push to redeploy.
 * No automated API covers demand-side behaviour nationally yet.
 *
 * The demand signal is critical because government messaging frames shortages
 * as a demand problem ("higher demand, not supply disruption") while the
 * structural position (MSO headline vs onshore controllable) tells a
 * different story. Citizens need both sides.
 */

import { readFileSync } from "fs";
import path from "path";
import type { Signal } from "./types";

interface ManualData {
  demandPressure: {
    stationsDry: number;
    stationsDrySource: string;
    salesSpikePercent: string;
    panicBuyingActive: boolean;
    rationingInPlace: boolean;
    victoriaFuelPriceLock: boolean;
    msoReleasePercent: number;
    msoReleaseLitres: string;
    msoReleaseDate: string;
    sulphurRelaxation: boolean;
    sulphurRelaxationDays: number;
    retailPetrol: number;
    retailDiesel: number;
    retailWeekEnding: string;
    retailPetrolChange: number;
    retailDieselChange: number;
    baselinePetrol: number;
    baselineDiesel: number;
    sourceUrl?: string;
  };
}

function loadManualData(): ManualData["demandPressure"] | null {
  try {
    const filePath = path.join(process.cwd(), "src/data/manual-signals.json");
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as ManualData;
    return data.demandPressure;
  } catch {
    return null;
  }
}

export async function fetchDemandPressure(): Promise<Signal | null> {
  const d = loadManualData();
  if (!d) return null;

  try {
    const petrolIncrease =
      ((d.retailPetrol - d.baselinePetrol) / d.baselinePetrol) * 100;
    const dieselIncrease =
      ((d.retailDiesel - d.baselineDiesel) / d.baselineDiesel) * 100;

    const trend =
      d.panicBuyingActive && d.stationsDry > 100
        ? ("critical" as const)
        : d.stationsDry > 50
          ? ("up" as const)
          : ("stable" as const);

    const context =
      `${d.stationsDry} petrol stations have run dry nationally (${d.stationsDrySource}). ` +
      `Retail sales up ${d.salesSpikePercent}% from panic buying. ` +
      `National average: petrol $${d.retailPetrol.toFixed(2)}/L (+${petrolIncrease.toFixed(0)}% since Feb), ` +
      `diesel $${d.retailDiesel.toFixed(2)}/L (+${dieselIncrease.toFixed(0)}% since Feb). ` +
      `Government released ${d.msoReleasePercent}% of MSO reserves (${d.msoReleaseLitres} litres) on ${d.msoReleaseDate}` +
      (d.sulphurRelaxation
        ? ` and relaxed sulphur standards for ${d.sulphurRelaxationDays} days.`
        : ".") +
      ` The government says higher demand, not supply disruption, is causing shortages. ` +
      `But headline reserve figures include fuel on water and in pipelines — ` +
      `actual onshore controllable stocks are lower than reported.` +
      (d.victoriaFuelPriceLock
        ? " Victoria has mandated 24-hour fuel price locks."
        : "") +
      (!d.rationingInPlace
        ? " No formal rationing in place yet."
        : " Rationing measures are now active.");

    return {
      label: "Demand-side pressure",
      value: `${d.stationsDry} stations dry`,
      trend,
      source: `AIP / Energy Minister — week ending ${d.retailWeekEnding}`,
      sourceUrl: d.sourceUrl || "https://www.aip.com.au/pricing",
      context,
      lastUpdated: new Date(d.retailWeekEnding).toISOString(),
      automated: false,
    };
  } catch {
    return null;
  }
}
