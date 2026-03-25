/**
 * Census ETL — SPEC-001
 *
 * Downloads ABS Census 2021 General Community Profile DataPack (POA),
 * extracts postcode-keyed indicators, and writes postcode-census.json.
 *
 * Correct 2021 GCP table mappings (differ from 2016 numbering):
 *   G02  — Selected Medians and Averages
 *   G23  — Voluntary Work for an Organisation or Group
 *   G43  — Labour Force Status
 *   G49B — Non-School Qualification: Level of Education (Persons)
 *   G54C/D — Industry of Employment by Age (Persons totals)
 *   G62  — Method of Travel to Work
 *
 * Internet connection was dropped from the 2021 Census → internet_pct = null.
 */

import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PostcodeCensus {
  car_dependency: number | null;
  housing_stress: number | null;
  industry_counts: Record<string, number> | null;
  education_pct: number | null;
  internet_pct: null; // not collected in 2021
  volunteering_pct: number | null;
  commute_mode_counts: Record<string, number> | null;
  median_income: number | null;
  unemployment_rate: number | null;
}

export type CensusOutput = Record<string, PostcodeCensus>;

type CsvRow = Record<string, string>;

// ── Constants ──────────────────────────────────────────────────────────────

const DATAPACK_URL =
  'https://www.abs.gov.au/census/find-census-data/datapacks/download/2021_GCP_POA_for_AUS_short-header.zip';

const ZIP_DIR = '2021 Census GCP Postal Areas for AUS';

const CSV_FILES = {
  G02: `${ZIP_DIR}/2021Census_G02_AUST_POA.csv`,
  G23: `${ZIP_DIR}/2021Census_G23_AUST_POA.csv`,
  G43: `${ZIP_DIR}/2021Census_G43_AUST_POA.csv`,
  G49B: `${ZIP_DIR}/2021Census_G49B_AUST_POA.csv`,
  G54C: `${ZIP_DIR}/2021Census_G54C_AUST_POA.csv`,
  G54D: `${ZIP_DIR}/2021Census_G54D_AUST_POA.csv`,
  G62: `${ZIP_DIR}/2021Census_G62_AUST_POA.csv`,
} as const;

// Industry column prefixes → human-readable ANZSIC 1-digit names
const INDUSTRY_MAP: Record<string, string> = {
  P_Ag_For_Fshg_Tot: 'Agriculture, Forestry and Fishing',
  P_Mining_Tot: 'Mining',
  P_Manufact_Tot: 'Manufacturing',
  P_El_Gas_Wt_Waste_Tot: 'Electricity, Gas, Water and Waste Services',
  P_Constru_Tot: 'Construction',
  P_WhlesaleTde_Tot: 'Wholesale Trade',
  P_RetTde_Tot: 'Retail Trade',
  P_Accom_food_Tot: 'Accommodation and Food Services',
  P_Trans_post_wrehsg_Tot: 'Transport, Postal and Warehousing',
  P_Info_media_teleco_Tot: 'Information Media and Telecommunications',
  P_Fin_Insur_Tot: 'Financial and Insurance Services',
  P_RtnHir_REst_Tot: 'Rental, Hiring and Real Estate Services',
  P_Pro_scien_tec_Tot: 'Professional, Scientific and Technical Services',
  P_Admin_supp_Tot: 'Administrative and Support Services',
  P_Public_admin_sfty_Tot: 'Public Administration and Safety',
  P_Educ_trng_Tot: 'Education and Training',
  P_HlthCare_SocAs_Tot: 'Health Care and Social Assistance',
  P_Art_recn_Tot: 'Arts and Recreation Services',
  P_Oth_scs_Tot: 'Other Services',
};

// Commute mode column → human-readable name
const COMMUTE_MODE_MAP: Record<string, string> = {
  One_method_Train_P: 'Train',
  One_method_Bus_P: 'Bus',
  One_method_Ferry_P: 'Ferry',
  One_met_Tram_or_lt_rail_P: 'Tram',
  One_met_Taxi_or_Rideshare_P: 'Taxi/Rideshare',
  One_method_Car_as_driver_P: 'Car (driver)',
  One_method_Car_as_passenger_P: 'Car (passenger)',
  One_method_Truck_P: 'Truck',
  One_method_Motorbike_scootr_P: 'Motorbike',
  One_method_Bicycle_P: 'Bicycle',
  One_method_Walked_only_P: 'Walked',
  One_method_Other_P: 'Other',
  Worked_home_P: 'Worked at home',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractPostcode(poaCode: string): string | null {
  // POA_CODE_2021 values look like "POA2000" → extract "2000"
  const match = poaCode.match(/^POA(\d{4})$/);
  return match ? match[1] : null;
}

function num(val: string | undefined): number | null {
  if (val === undefined || val === '' || val === '..' || val === 'np') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function safeDivide(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 10000; // 4 decimal places
}

function parseCsv(buffer: Buffer): CsvRow[] {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

// ── Download ────────────────────────────────────────────────────────────────

export function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (reqUrl: string) => {
      https.get(reqUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const location = res.headers.location;
          if (!location) return reject(new Error('Redirect without Location header'));
          request(location);
          return;
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} downloading ${reqUrl}`));
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    };
    request(url);
  });
}

// ── ZIP extraction ──────────────────────────────────────────────────────────

export function extractCsv(zip: AdmZip, entryName: string): CsvRow[] {
  const entry = zip.getEntry(entryName);
  if (!entry) throw new Error(`Missing ZIP entry: ${entryName}`);
  return parseCsv(entry.getData());
}

// ── Parsers ─────────────────────────────────────────────────────────────────

export function parseG02(rows: CsvRow[]): Map<string, {
  median_mortgage_monthly: number | null;
  median_rent_weekly: number | null;
  median_hhd_income_weekly: number | null;
  median_personal_income_weekly: number | null;
}> {
  const result = new Map<string, {
    median_mortgage_monthly: number | null;
    median_rent_weekly: number | null;
    median_hhd_income_weekly: number | null;
    median_personal_income_weekly: number | null;
  }>();
  for (const row of rows) {
    const pc = extractPostcode(row.POA_CODE_2021);
    if (!pc) continue;
    result.set(pc, {
      median_mortgage_monthly: num(row.Median_mortgage_repay_monthly),
      median_rent_weekly: num(row.Median_rent_weekly),
      median_hhd_income_weekly: num(row.Median_tot_hhd_inc_weekly),
      median_personal_income_weekly: num(row.Median_tot_prsnl_inc_weekly),
    });
  }
  return result;
}

export function parseG23(rows: CsvRow[]): Map<string, { volunteers: number | null; total: number | null }> {
  const result = new Map<string, { volunteers: number | null; total: number | null }>();
  for (const row of rows) {
    const pc = extractPostcode(row.POA_CODE_2021);
    if (!pc) continue;
    result.set(pc, {
      volunteers: num(row.P_Tot_Volunteer),
      total: num(row.P_Tot_Tot),
    });
  }
  return result;
}

export function parseG43(rows: CsvRow[]): Map<string, { unemployed: number | null; labour_force: number | null }> {
  const result = new Map<string, { unemployed: number | null; labour_force: number | null }>();
  for (const row of rows) {
    const pc = extractPostcode(row.POA_CODE_2021);
    if (!pc) continue;
    result.set(pc, {
      unemployed: num(row.lfs_Unmplyed_lookng_for_wrk_P),
      labour_force: num(row.lfs_Tot_LF_P),
    });
  }
  return result;
}

export function parseG49B(rows: CsvRow[]): Map<string, { qualified: number | null; total: number | null }> {
  const qualCols = [
    'P_PGrad_Deg_Total',
    'P_GradDip_and_GradCert_Total',
    'P_BachDeg_Total',
    'P_AdvDip_and_Dip_Total',
    'P_Cert_III_IV_Total',
    'P_Cert_I_II_Total',
    'P_Cert_Levl_nfd_Total',
  ];
  const result = new Map<string, { qualified: number | null; total: number | null }>();
  for (const row of rows) {
    const pc = extractPostcode(row.POA_CODE_2021);
    if (!pc) continue;
    const vals = qualCols.map((c) => num(row[c]));
    const allValid = vals.every((v) => v !== null);
    result.set(pc, {
      qualified: allValid ? (vals as number[]).reduce((a, b) => a + b, 0) : null,
      total: num(row.P_Tot_Total),
    });
  }
  return result;
}

export function parseIndustry(rowsC: CsvRow[], rowsD: CsvRow[]): Map<string, Record<string, number>> {
  // G54C has most P_ industry totals; G54D has P_Oth_scs_Tot and P_ID_NS_Tot
  const result = new Map<string, Record<string, number>>();

  // Columns split across G54C and G54D
  const colsInC = [
    'P_Ag_For_Fshg_Tot', 'P_Mining_Tot', 'P_Manufact_Tot',
    'P_El_Gas_Wt_Waste_Tot', 'P_Constru_Tot', 'P_WhlesaleTde_Tot',
    'P_RetTde_Tot', 'P_Accom_food_Tot', 'P_Trans_post_wrehsg_Tot',
    'P_Info_media_teleco_Tot', 'P_Fin_Insur_Tot', 'P_RtnHir_REst_Tot',
    'P_Pro_scien_tec_Tot', 'P_Admin_supp_Tot', 'P_Public_admin_sfty_Tot',
    'P_Educ_trng_Tot', 'P_HlthCare_SocAs_Tot', 'P_Art_recn_Tot',
  ];
  const colsInD = ['P_Oth_scs_Tot'];

  // Index G54D rows by postcode
  const dByPc = new Map<string, CsvRow>();
  for (const row of rowsD) {
    const pc = extractPostcode(row.POA_CODE_2021);
    if (pc) dByPc.set(pc, row);
  }

  for (const row of rowsC) {
    const pc = extractPostcode(row.POA_CODE_2021);
    if (!pc) continue;

    const counts: Record<string, number> = {};
    let valid = true;

    for (const col of colsInC) {
      const v = num(row[col]);
      if (v === null) { valid = false; break; }
      counts[INDUSTRY_MAP[col]] = v;
    }

    if (valid) {
      const dRow = dByPc.get(pc);
      if (dRow) {
        for (const col of colsInD) {
          const v = num(dRow[col]);
          if (v === null) { valid = false; break; }
          counts[INDUSTRY_MAP[col]] = v;
        }
      } else {
        valid = false;
      }
    }

    if (valid) result.set(pc, counts);
  }
  return result;
}

export function parseG62(rows: CsvRow[]): Map<string, {
  car_driver: number | null;
  total_employed: number | null;
  modes: Record<string, number>;
}> {
  const result = new Map<string, {
    car_driver: number | null;
    total_employed: number | null;
    modes: Record<string, number>;
  }>();

  for (const row of rows) {
    const pc = extractPostcode(row.POA_CODE_2021);
    if (!pc) continue;

    const modes: Record<string, number> = {};
    for (const [col, label] of Object.entries(COMMUTE_MODE_MAP)) {
      const v = num(row[col]);
      if (v !== null) modes[label] = v;
    }

    result.set(pc, {
      car_driver: num(row.One_method_Car_as_driver_P),
      total_employed: num(row.Tot_P),
      modes,
    });
  }
  return result;
}

// ── Assembly ────────────────────────────────────────────────────────────────

export function assembleOutput(
  g02: ReturnType<typeof parseG02>,
  g23: ReturnType<typeof parseG23>,
  g43: ReturnType<typeof parseG43>,
  g49b: ReturnType<typeof parseG49B>,
  industry: ReturnType<typeof parseIndustry>,
  g62: ReturnType<typeof parseG62>,
): CensusOutput {
  // Collect all postcodes
  const postcodes = new Set<string>();
  for (const map of [g02, g23, g43, g49b, industry, g62]) {
    for (const key of map.keys()) postcodes.add(key);
  }

  const output: CensusOutput = {};
  for (const pc of [...postcodes].sort()) {
    const medians = g02.get(pc);
    const vol = g23.get(pc);
    const lf = g43.get(pc);
    const edu = g49b.get(pc);
    const ind = industry.get(pc);
    const travel = g62.get(pc);

    // Housing stress: higher of (monthly mortgage, monthly-equivalent rent) / monthly household income
    let housing_stress: number | null = null;
    if (medians) {
      const mortgage = medians.median_mortgage_monthly;
      const rentMonthly = medians.median_rent_weekly !== null
        ? medians.median_rent_weekly * (52 / 12)
        : null;
      const incomeMonthly = medians.median_hhd_income_weekly !== null
        ? medians.median_hhd_income_weekly * (52 / 12)
        : null;

      if (incomeMonthly && incomeMonthly > 0) {
        const costs: number[] = [];
        if (mortgage !== null) costs.push(mortgage);
        if (rentMonthly !== null) costs.push(rentMonthly);
        if (costs.length > 0) {
          housing_stress = Math.round((Math.max(...costs) / incomeMonthly) * 10000) / 10000;
        }
      }
    }

    output[pc] = {
      car_dependency: travel
        ? safeDivide(travel.car_driver, travel.total_employed)
        : null,
      housing_stress,
      industry_counts: ind ?? null,
      education_pct: edu ? safeDivide(edu.qualified, edu.total) : null,
      internet_pct: null,
      volunteering_pct: vol ? safeDivide(vol.volunteers, vol.total) : null,
      commute_mode_counts: travel?.modes
        ? (Object.keys(travel.modes).length > 0 ? travel.modes : null)
        : null,
      median_income: medians?.median_personal_income_weekly ?? null,
      unemployment_rate: lf ? safeDivide(lf.unemployed, lf.labour_force) : null,
    };
  }
  return output;
}

// ── Main ────────────────────────────────────────────────────────────────────

export async function run(zipPath?: string): Promise<CensusOutput> {
  const cachePath = zipPath ?? path.resolve(__dirname, '../../../.cache/2021_GCP_POA_for_AUS_short-header.zip');

  // Download if not cached
  if (!fs.existsSync(cachePath)) {
    console.log(`Downloading DataPack to ${cachePath}...`);
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    await download(DATAPACK_URL, cachePath);
    console.log('Download complete.');
  } else {
    console.log(`Using cached DataPack: ${cachePath}`);
  }

  console.log('Extracting CSV tables...');
  const zip = new AdmZip(cachePath);

  const g02 = parseG02(extractCsv(zip, CSV_FILES.G02));
  const g23 = parseG23(extractCsv(zip, CSV_FILES.G23));
  const g43 = parseG43(extractCsv(zip, CSV_FILES.G43));
  const g49b = parseG49B(extractCsv(zip, CSV_FILES.G49B));
  const industryC = extractCsv(zip, CSV_FILES.G54C);
  const industryD = extractCsv(zip, CSV_FILES.G54D);
  const industry = parseIndustry(industryC, industryD);
  const g62 = parseG62(extractCsv(zip, CSV_FILES.G62));

  console.log(`Parsed postcodes: G02=${g02.size}, G23=${g23.size}, G43=${g43.size}, G49B=${g49b.size}, Industry=${industry.size}, G62=${g62.size}`);

  const output = assembleOutput(g02, g23, g43, g49b, industry, g62);
  console.log(`Output: ${Object.keys(output).length} postcodes`);

  return output;
}

// CLI entry point
if (require.main === module) {
  const outPath = path.resolve(__dirname, '../data/postcode-census.json');
  run().then((output) => {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Written to ${outPath}`);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
