#!/usr/bin/env node
/**
 * snapshot-stations.mjs — Daily fuel station snapshot for gap detection
 *
 * Fetches the current station list from WA FuelWatch and NSW FuelCheck,
 * writes a dated JSON snapshot. The station-availability signal module
 * diffs consecutive snapshots to detect stations that stopped reporting
 * (proxy for "possibly dry").
 *
 * Usage:
 *   node scripts/snapshot-stations.mjs
 *   node scripts/snapshot-stations.mjs --output /custom/path
 *
 * Output: app/src/data/station-snapshots/YYYY-MM-DD.json
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(__dirname, "..", "app");
const SNAPSHOT_DIR = path.join(APP_DIR, "src", "data", "station-snapshots");

// --- WA FuelWatch ---

const FUELWATCH_URL =
  "https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS";

async function fetchFuelWatchStations(product) {
  const label = product === 4 ? "diesel" : "petrol";
  try {
    const res = await fetch(
      `${FUELWATCH_URL}?Product=${product}&Day=today`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) {
      console.warn(`[snapshot] FuelWatch ${label}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const stations = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const brand = block.match(/<brand>([^<]+)<\/brand>/)?.[1];
      const location = block.match(/<location>([^<]+)<\/location>/)?.[1];
      const tradingName =
        block.match(/<trading-name>([^<]+)<\/trading-name>/)?.[1];
      const price = block.match(/<price>([\d.]+)<\/price>/)?.[1];
      const lat = block.match(/<latitude>([-\d.]+)<\/latitude>/)?.[1];
      const lng = block.match(/<longitude>([-\d.]+)<\/longitude>/)?.[1];

      if (location && price) {
        // ID includes trading name to distinguish multiple stations in same suburb.
        // Previously used location only, causing 47% collision rate. (SPEC-005 R2)
        const stationName = tradingName ?? brand ?? location;
        stations.push({
          id: `wa:${location}:${stationName}:${label}`,
          state: "WA",
          source: "fuelwatch",
          product: label,
          brand: brand ?? null,
          name: stationName,
          location,
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
          price: parseFloat(price),
        });
      }
    }

    console.log(`[snapshot] FuelWatch ${label}: ${stations.length} stations`);
    return stations;
  } catch (e) {
    console.warn(`[snapshot] FuelWatch ${label} failed:`, e.message);
    return [];
  }
}

// --- NSW FuelCheck ---

const NSW_CKAN_API =
  "https://data.nsw.gov.au/data/api/action/datastore_search";
const NSW_RESOURCE_ID = "df5c9553-433c-4a90-a5a9-de19ecc543f6";

async function fetchNswStations(fuelCode, label) {
  try {
    const filters = JSON.stringify({ FuelCode: fuelCode });
    const url = `${NSW_CKAN_API}?resource_id=${NSW_RESOURCE_ID}&filters=${encodeURIComponent(filters)}&limit=5000`;

    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      console.warn(`[snapshot] NSW FuelCheck ${label}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.success || !data.result?.records?.length) {
      console.warn(`[snapshot] NSW FuelCheck ${label}: no records`);
      return [];
    }

    // CKAN datastore returns historical records — deduplicate by station+product,
    // keeping only the most recent price per station. Without this, a single
    // station appears 60-75 times (one per historical price observation),
    // inflating the count ~4.3x. (SPEC-005 R2)
    const byId = new Map();
    for (const r of data.result.records) {
      if (!r.Price || parseFloat(r.Price) <= 0) continue;
      const id = `nsw:${r.ServiceStationName ?? r.Suburb}:${r.Postcode}:${label}`;
      // Keep the record — Map.set overwrites, so last record wins.
      // CKAN returns records in insertion order; latest price is last.
      byId.set(id, r);
    }

    const stations = Array.from(byId.entries()).map(([id, r]) => ({
      id,
      state: "NSW",
      source: "fuelcheck",
      product: label,
      brand: r.Brand ?? null,
      name: r.ServiceStationName ?? r.Suburb,
      location: `${r.Suburb} ${r.Postcode}`,
      lat: null,
      lng: null,
      price: parseFloat(r.Price),
      postcode: r.Postcode,
    }));

    console.log(
      `[snapshot] NSW FuelCheck ${label}: ${stations.length} stations`
    );
    return stations;
  } catch (e) {
    console.warn(`[snapshot] NSW FuelCheck ${label} failed:`, e.message);
    return [];
  }
}

// --- Main ---

async function main() {
  const today = new Date().toISOString().split("T")[0];

  // Parse --output flag
  const outputIdx = process.argv.indexOf("--output");
  const outputDir =
    outputIdx !== -1 && process.argv[outputIdx + 1]
      ? process.argv[outputIdx + 1]
      : SNAPSHOT_DIR;

  mkdirSync(outputDir, { recursive: true });

  console.log(`[snapshot] Collecting station data for ${today}...`);

  // Fetch all sources in parallel
  const [waDiesel, waPetrol, nswDiesel, nswPetrol] = await Promise.all([
    fetchFuelWatchStations(4),
    fetchFuelWatchStations(1),
    fetchNswStations("DL", "diesel"),
    fetchNswStations("P98", "petrol"),
  ]);

  const allStations = [...waDiesel, ...waPetrol, ...nswDiesel, ...nswPetrol];

  // totalStations counts unique station-product pairs, not raw records.
  // After deduplication this should match allStations.length, but verify
  // by counting unique IDs as a sanity check. (SPEC-005 R2)
  const uniqueIds = new Set(allStations.map((s) => s.id));

  const snapshot = {
    date: today,
    generated: new Date().toISOString(),
    sources: {
      wa_fuelwatch: {
        diesel: waDiesel.length,
        petrol: waPetrol.length,
      },
      nsw_fuelcheck: {
        diesel: nswDiesel.length,
        petrol: nswPetrol.length,
      },
    },
    totalStations: uniqueIds.size,
    stations: allStations,
  };

  const outputFile = path.join(outputDir, `${today}.json`);
  writeFileSync(outputFile, JSON.stringify(snapshot, null, 2));

  console.log(
    `[snapshot] Written ${allStations.length} stations → ${outputFile}`
  );
  console.log(
    `[snapshot]   WA: ${waDiesel.length} diesel + ${waPetrol.length} petrol`
  );
  console.log(
    `[snapshot]   NSW: ${nswDiesel.length} diesel + ${nswPetrol.length} petrol`
  );
}

main().catch((e) => {
  console.error("[snapshot] Fatal:", e);
  process.exit(1);
});
