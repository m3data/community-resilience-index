/**
 * TEST-024 — Census ETL parsers (SPEC-001)
 */
import { describe, it, expect } from 'vitest';
import {
  parseG02,
  parseG23,
  parseG43,
  parseG49B,
  parseIndustry,
  parseG62,
  assembleOutput,
} from './census-etl.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

const makeG02Row = (pc: string, overrides: Record<string, string> = {}) => ({
  POA_CODE_2021: `POA${pc}`,
  Median_age_persons: '32',
  Median_mortgage_repay_monthly: '2800',
  Median_tot_prsnl_inc_weekly: '941',
  Median_rent_weekly: '625',
  Median_tot_fam_inc_weekly: '2367',
  Average_num_psns_per_bedroom: '1.3',
  Median_tot_hhd_inc_weekly: '2225',
  Average_household_size: '2.1',
  ...overrides,
});

const makeG23Row = (pc: string, vol: string, notVol: string, ns: string, tot: string) => ({
  POA_CODE_2021: `POA${pc}`,
  P_Tot_Volunteer: vol,
  P_Tot_N_a_volunteer: notVol,
  P_Tot_Voluntary_work_ns: ns,
  P_Tot_Tot: tot,
});

const makeG43Row = (pc: string, unemp: string, totLf: string) => ({
  POA_CODE_2021: `POA${pc}`,
  lfs_Unmplyed_lookng_for_wrk_P: unemp,
  lfs_Tot_LF_P: totLf,
  // Other columns omitted — not used by parser
});

const makeG49BRow = (pc: string, vals: Record<string, string> = {}) => ({
  POA_CODE_2021: `POA${pc}`,
  P_PGrad_Deg_Total: '100',
  P_GradDip_and_GradCert_Total: '50',
  P_BachDeg_Total: '200',
  P_AdvDip_and_Dip_Total: '150',
  P_Cert_III_IV_Total: '300',
  P_Cert_I_II_Total: '20',
  P_Cert_Levl_nfd_Total: '10',
  P_Tot_Total: '2000',
  ...vals,
});

const makeG54CRow = (pc: string) => ({
  POA_CODE_2021: `POA${pc}`,
  P_Ag_For_Fshg_Tot: '50',
  P_Mining_Tot: '30',
  P_Manufact_Tot: '200',
  P_El_Gas_Wt_Waste_Tot: '40',
  P_Constru_Tot: '100',
  P_WhlesaleTde_Tot: '60',
  P_RetTde_Tot: '150',
  P_Accom_food_Tot: '120',
  P_Trans_post_wrehsg_Tot: '80',
  P_Info_media_teleco_Tot: '70',
  P_Fin_Insur_Tot: '90',
  P_RtnHir_REst_Tot: '30',
  P_Pro_scien_tec_Tot: '110',
  P_Admin_supp_Tot: '50',
  P_Public_admin_sfty_Tot: '60',
  P_Educ_trng_Tot: '140',
  P_HlthCare_SocAs_Tot: '180',
  P_Art_recn_Tot: '40',
});

const makeG54DRow = (pc: string) => ({
  POA_CODE_2021: `POA${pc}`,
  P_Oth_scs_Tot: '55',
  P_Tot_Tot: '1655',
});

const makeG62Row = (pc: string) => ({
  POA_CODE_2021: `POA${pc}`,
  One_method_Train_P: '500',
  One_method_Bus_P: '200',
  One_method_Ferry_P: '10',
  One_met_Tram_or_lt_rail_P: '50',
  One_met_Taxi_or_Rideshare_P: '15',
  One_method_Car_as_driver_P: '3000',
  One_method_Car_as_passenger_P: '400',
  One_method_Truck_P: '20',
  One_method_Motorbike_scootr_P: '30',
  One_method_Bicycle_P: '60',
  One_method_Walked_only_P: '300',
  One_method_Other_P: '25',
  Worked_home_P: '800',
  Tot_P: '6000',
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('parseG02', () => {
  it('extracts medians keyed by postcode', () => {
    const result = parseG02([makeG02Row('2000')]);
    expect(result.get('2000')).toEqual({
      median_mortgage_monthly: 2800,
      median_rent_weekly: 625,
      median_hhd_income_weekly: 2225,
      median_personal_income_weekly: 941,
    });
  });

  it('handles suppressed values (..)', () => {
    const result = parseG02([makeG02Row('9999', { Median_mortgage_repay_monthly: '..' })]);
    expect(result.get('9999')!.median_mortgage_monthly).toBeNull();
  });

  it('skips non-POA rows', () => {
    const row = makeG02Row('2000');
    row.POA_CODE_2021 = 'AUST';
    expect(parseG02([row]).size).toBe(0);
  });
});

describe('parseG23', () => {
  it('computes volunteering counts', () => {
    const result = parseG23([makeG23Row('2000', '1200', '3000', '300', '4500')]);
    const data = result.get('2000')!;
    expect(data.volunteers).toBe(1200);
    expect(data.total).toBe(4500);
  });
});

describe('parseG43', () => {
  it('extracts unemployment data', () => {
    const result = parseG43([makeG43Row('2000', '600', '10000')]);
    const data = result.get('2000')!;
    expect(data.unemployed).toBe(600);
    expect(data.labour_force).toBe(10000);
  });
});

describe('parseG49B', () => {
  it('sums qualification totals', () => {
    const result = parseG49B([makeG49BRow('2000')]);
    const data = result.get('2000')!;
    // 100+50+200+150+300+20+10 = 830
    expect(data.qualified).toBe(830);
    expect(data.total).toBe(2000);
  });

  it('returns null qualified if any value is suppressed', () => {
    const result = parseG49B([makeG49BRow('2000', { P_BachDeg_Total: '..' })]);
    expect(result.get('2000')!.qualified).toBeNull();
  });
});

describe('parseIndustry', () => {
  it('merges G54C and G54D into industry counts', () => {
    const result = parseIndustry([makeG54CRow('2000')], [makeG54DRow('2000')]);
    const counts = result.get('2000')!;
    expect(counts['Mining']).toBe(30);
    expect(counts['Other Services']).toBe(55);
    expect(Object.keys(counts)).toHaveLength(19);
  });

  it('skips postcode if G54D row is missing', () => {
    const result = parseIndustry([makeG54CRow('2000')], []);
    expect(result.has('2000')).toBe(false);
  });
});

describe('parseG62', () => {
  it('extracts commute mode counts and car driver total', () => {
    const result = parseG62([makeG62Row('2000')]);
    const data = result.get('2000')!;
    expect(data.car_driver).toBe(3000);
    expect(data.total_employed).toBe(6000);
    expect(data.modes['Train']).toBe(500);
    expect(data.modes['Worked at home']).toBe(800);
  });
});

describe('assembleOutput', () => {
  it('combines all parsers into output format', () => {
    const g02 = parseG02([makeG02Row('2000')]);
    const g23 = parseG23([makeG23Row('2000', '1200', '3000', '300', '4500')]);
    const g43 = parseG43([makeG43Row('2000', '600', '10000')]);
    const g49b = parseG49B([makeG49BRow('2000')]);
    const industry = parseIndustry([makeG54CRow('2000')], [makeG54DRow('2000')]);
    const g62 = parseG62([makeG62Row('2000')]);

    const output = assembleOutput(g02, g23, g43, g49b, industry, g62);

    expect(output['2000']).toBeDefined();
    const pc = output['2000'];

    // car_dependency = 3000 / 6000 = 0.5
    expect(pc.car_dependency).toBe(0.5);

    // housing_stress = max(2800, 625*52/12) / (2225*52/12)
    //   rent_monthly = 625 * 4.3333 = 2708.33
    //   income_monthly = 2225 * 4.3333 = 9641.67
    //   stress = 2800 / 9641.67 = 0.2904
    expect(pc.housing_stress).toBeCloseTo(0.2904, 3);

    // education_pct = 830 / 2000 = 0.415
    expect(pc.education_pct).toBe(0.415);

    // internet_pct is always null
    expect(pc.internet_pct).toBeNull();

    // volunteering_pct = 1200 / 4500 = 0.2667
    expect(pc.volunteering_pct).toBeCloseTo(0.2667, 3);

    // median_income = 941
    expect(pc.median_income).toBe(941);

    // unemployment_rate = 600 / 10000 = 0.06
    expect(pc.unemployment_rate).toBe(0.06);

    // industry_counts
    expect(pc.industry_counts).toBeDefined();
    expect(Object.keys(pc.industry_counts!)).toHaveLength(19);

    // commute_mode_counts
    expect(pc.commute_mode_counts).toBeDefined();
    expect(pc.commute_mode_counts!['Train']).toBe(500);
  });

  it('handles missing data gracefully', () => {
    const output = assembleOutput(
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
    );
    expect(Object.keys(output)).toHaveLength(0);
  });

  it('returns null for indicators when source data is missing for a postcode', () => {
    // Only G02 has data for 2000
    const g02 = parseG02([makeG02Row('2000')]);
    const output = assembleOutput(g02, new Map(), new Map(), new Map(), new Map(), new Map());
    const pc = output['2000'];
    expect(pc.car_dependency).toBeNull();
    expect(pc.unemployment_rate).toBeNull();
    expect(pc.education_pct).toBeNull();
    expect(pc.volunteering_pct).toBeNull();
    expect(pc.internet_pct).toBeNull();
    expect(pc.median_income).toBe(941);
  });
});
