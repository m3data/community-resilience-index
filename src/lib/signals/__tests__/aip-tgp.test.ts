import { describe, it, expect, vi, beforeEach } from "vitest";
import { toDate, parseTgpSheet, computeTrend } from "../aip-tgp";
import type ExcelJS from "exceljs";

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// toDate — ExcelJS date cell handling
// ---------------------------------------------------------------------------
describe("toDate", () => {
  it("returns the same Date when given a Date object", () => {
    const d = new Date("2026-04-01T00:00:00Z");
    expect(toDate(d)).toBe(d); // identity, not just equality
  });

  it("converts Excel serial number 45658 to 2025-01-01", () => {
    // Excel serial 45658 = 2025-01-01 (days since 1900-01-00, adjusted by epoch offset 25569)
    const result = toDate(45658);
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("converts Excel serial number 46113 to 2026-04-01", () => {
    const result = toDate(46113);
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("converts Excel serial number 44927 to 2023-01-01", () => {
    // Verify the formula works across a wider range
    const result = toDate(44927);
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe("2023-01-01T00:00:00.000Z");
  });

  it("parses ISO date string correctly", () => {
    const result = toDate("2026-04-01");
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("parses ISO datetime string correctly", () => {
    const result = toDate("2026-04-01T10:30:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe("2026-04-01T10:30:00.000Z");
  });

  // Locale-ambiguous date strings: dd/mm/yyyy vs mm/dd/yyyy
  // JavaScript's Date constructor interprets "01/04/2026" as Jan 4, not Apr 1.
  // For Australian data (dd/mm/yyyy convention), this produces an incorrect date.
  // The current toDate implementation relies on native Date parsing and does NOT
  // handle dd/mm/yyyy — this test documents that known limitation.
  it("parses locale-ambiguous dd/mm/yyyy string using JS native (US-biased) rules", () => {
    const result = toDate("01/04/2026");
    expect(result).toBeInstanceOf(Date);
    // JS parses "01/04/2026" as January 4, 2026 (mm/dd/yyyy), NOT April 1.
    // An Australian user would expect April 1. This is a known limitation.
    expect(result!.getMonth()).toBe(0); // January (0-indexed)
    expect(result!.getDate()).toBe(4);
  });

  it("returns null for null input", () => {
    expect(toDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(toDate(undefined)).toBeNull();
  });

  it("returns null for invalid string", () => {
    expect(toDate("not-a-date")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(toDate("")).toBeNull();
  });

  it("returns null for boolean input", () => {
    expect(toDate(true)).toBeNull();
    expect(toDate(false)).toBeNull();
  });

  it("returns null for object input (non-Date)", () => {
    expect(toDate({ year: 2026 })).toBeNull();
  });

  it("returns null for array input", () => {
    expect(toDate([2026, 4, 1])).toBeNull();
  });

  it("handles serial number 0 (Excel epoch)", () => {
    // Serial 0 = 1900-01-00, which via the formula gives 1899-12-30
    const result = toDate(0);
    expect(result).toBeInstanceOf(Date);
    // (0 - 25569) * 86400000 = -2209161600000
    expect(result!.getFullYear()).toBe(1899);
  });
});

// ---------------------------------------------------------------------------
// computeTrend
// ---------------------------------------------------------------------------
describe("computeTrend", () => {
  it("returns 'critical' when price increase > 5%", () => {
    // Strictly greater than 5%, so 210/200 = exactly 5% is NOT critical
    expect(computeTrend(211, 200)).toBe("critical"); // +5.5%
    expect(computeTrend(220, 200)).toBe("critical"); // +10%
  });

  it("returns 'up' when price increase is between 1% and 5%", () => {
    expect(computeTrend(203, 200)).toBe("up"); // +1.5%
    expect(computeTrend(208, 200)).toBe("up"); // +4%
  });

  it("returns 'down' when price decreases more than 1%", () => {
    expect(computeTrend(197, 200)).toBe("down"); // -1.5%
    expect(computeTrend(190, 200)).toBe("down"); // -5%
  });

  it("returns 'stable' when price change is within +/-1%", () => {
    expect(computeTrend(200, 200)).toBe("stable"); // 0%
    expect(computeTrend(201, 200)).toBe("stable"); // +0.5%
    expect(computeTrend(199, 200)).toBe("stable"); // -0.5%
  });

  it("returns 'stable' when weekAgo is undefined", () => {
    expect(computeTrend(200, undefined)).toBe("stable");
  });

  // Boundary: exactly 5% increase — uses strict > so 5.0% is 'up', not 'critical'
  it("boundary: exactly 5% returns 'up' (strict greater-than)", () => {
    // (210-200)/200*100 = 5.0 — NOT > 5, so falls through to > 1 check
    expect(computeTrend(210, 200)).toBe("up");
  });

  // Boundary: exactly 1% increase
  it("boundary: exactly 1% returns 'stable'", () => {
    // (202-200)/200*100 = 1.0 — NOT > 1, so stable
    expect(computeTrend(202, 200)).toBe("stable");
  });
});

// ---------------------------------------------------------------------------
// parseTgpSheet — with mocked ExcelJS worksheet
// ---------------------------------------------------------------------------
describe("parseTgpSheet", () => {
  function mockWorkbook(
    sheetName: string,
    rows: Array<Array<unknown>>
  ): ExcelJS.Workbook {
    const mockRows = rows.map((cells, idx) => ({
      getCell: (col: number) => ({ value: cells[col - 1] ?? null }),
      rowNumber: idx + 1,
    }));

    const mockWorksheet = {
      eachRow: (
        opts: { includeEmpty: boolean },
        callback: (row: { getCell: (col: number) => { value: unknown } }, rowNumber: number) => void
      ) => {
        for (const row of mockRows) {
          callback(row, row.rowNumber);
        }
      },
    };

    return {
      getWorksheet: (name: string) =>
        name === sheetName ? mockWorksheet : undefined,
    } as unknown as ExcelJS.Workbook;
  }

  it("parses rows with Date object dates", () => {
    const wb = mockWorkbook("Diesel TGP", [
      // Row 1: header (skipped)
      ["Date", "Sydney", "Melbourne", "Brisbane", "Adelaide", "Perth", "Darwin", "Hobart", "National"],
      // Row 2: data
      [new Date("2026-03-31T00:00:00Z"), 180.5, 178.2, 182.1, 179.0, 185.3, 190.1, 188.0, 183.3],
      // Row 3: data
      [new Date("2026-04-01T00:00:00Z"), 181.0, 179.0, 183.0, 180.0, 186.0, 191.0, 189.0, 184.1],
    ]);

    const rows = parseTgpSheet(wb, "Diesel TGP");

    expect(rows).toHaveLength(2);
    expect(rows[0].date.toISOString()).toBe("2026-03-31T00:00:00.000Z");
    expect(rows[0].national).toBe(183.3);
    expect(rows[0].cities.Sydney).toBe(180.5);
    expect(rows[0].cities.Perth).toBe(185.3);
    expect(rows[1].date.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(rows[1].national).toBe(184.1);
  });

  it("parses rows with Excel serial number dates", () => {
    const wb = mockWorkbook("Diesel TGP", [
      ["Date", "Sydney", "Melbourne", "Brisbane", "Adelaide", "Perth", "Darwin", "Hobart", "National"],
      [46113, 180.5, 178.2, 182.1, 179.0, 185.3, 190.1, 188.0, 183.3], // 46113 = 2026-04-01
    ]);

    const rows = parseTgpSheet(wb, "Diesel TGP");

    expect(rows).toHaveLength(1);
    expect(rows[0].date.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(rows[0].national).toBe(183.3);
  });

  it("skips rows where the date cell is invalid", () => {
    const wb = mockWorkbook("Diesel TGP", [
      ["Date", "Sydney", "Melbourne", "Brisbane", "Adelaide", "Perth", "Darwin", "Hobart", "National"],
      ["not-a-date", 180.5, 178.2, 182.1, 179.0, 185.3, 190.1, 188.0, 183.3],
      [new Date("2026-04-01T00:00:00Z"), 181.0, 179.0, 183.0, 180.0, 186.0, 191.0, 189.0, 184.1],
    ]);

    const rows = parseTgpSheet(wb, "Diesel TGP");

    expect(rows).toHaveLength(1);
    expect(rows[0].date.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("skips rows where date cell is null", () => {
    const wb = mockWorkbook("Diesel TGP", [
      ["Date", "Sydney", "Melbourne", "Brisbane", "Adelaide", "Perth", "Darwin", "Hobart", "National"],
      [null, 180.5, 178.2, 182.1, 179.0, 185.3, 190.1, 188.0, 183.3],
    ]);

    const rows = parseTgpSheet(wb, "Diesel TGP");
    expect(rows).toHaveLength(0);
  });

  it("handles missing city price (non-number) gracefully", () => {
    const wb = mockWorkbook("Diesel TGP", [
      ["Date", "Sydney", "Melbourne", "Brisbane", "Adelaide", "Perth", "Darwin", "Hobart", "National"],
      [new Date("2026-04-01T00:00:00Z"), 180.5, null, "N/A", 179.0, 185.3, undefined, 188.0, 183.3],
    ]);

    const rows = parseTgpSheet(wb, "Diesel TGP");

    expect(rows).toHaveLength(1);
    // Cities with valid numbers are included
    expect(rows[0].cities.Sydney).toBe(180.5);
    expect(rows[0].cities.Adelaide).toBe(179.0);
    expect(rows[0].cities.Perth).toBe(185.3);
    expect(rows[0].cities.Hobart).toBe(188.0);
    // Cities with non-number values are omitted
    expect(rows[0].cities.Melbourne).toBeUndefined();
    expect(rows[0].cities.Brisbane).toBeUndefined();
    expect(rows[0].cities.Darwin).toBeUndefined();
  });

  it("handles non-number national average gracefully", () => {
    const wb = mockWorkbook("Diesel TGP", [
      ["Date", "Sydney", "Melbourne", "Brisbane", "Adelaide", "Perth", "Darwin", "Hobart", "National"],
      [new Date("2026-04-01T00:00:00Z"), 180.5, 178.2, 182.1, 179.0, 185.3, 190.1, 188.0, "N/A"],
    ]);

    const rows = parseTgpSheet(wb, "Diesel TGP");

    expect(rows).toHaveLength(1);
    expect(rows[0].national).toBe(0); // defaults to 0 when not a number
  });

  it("returns empty array for non-existent sheet", () => {
    const wb = mockWorkbook("Diesel TGP", []);

    const rows = parseTgpSheet(wb, "Nonexistent Sheet");
    expect(rows).toEqual([]);
  });

  it("returns empty array when sheet has only a header row", () => {
    const wb = mockWorkbook("Diesel TGP", [
      ["Date", "Sydney", "Melbourne", "Brisbane", "Adelaide", "Perth", "Darwin", "Hobart", "National"],
    ]);

    const rows = parseTgpSheet(wb, "Diesel TGP");
    expect(rows).toEqual([]);
  });

  it("extracts 30 trading days for sparkline data", () => {
    // Build 35 rows (1 header + 34 data) to verify slice(-30) logic happens in caller
    const dataRows: Array<Array<unknown>> = [
      ["Date", "Sydney", "Melbourne", "Brisbane", "Adelaide", "Perth", "Darwin", "Hobart", "National"],
    ];
    for (let i = 0; i < 34; i++) {
      const d = new Date("2026-02-15T00:00:00Z");
      d.setDate(d.getDate() + i);
      dataRows.push([d, 180 + i * 0.5, 178, 182, 179, 185, 190, 188, 183 + i * 0.3]);
    }
    const wb = mockWorkbook("Diesel TGP", dataRows);

    const rows = parseTgpSheet(wb, "Diesel TGP");

    expect(rows).toHaveLength(34);

    // Replicate sparkline extraction from fetchAipDieselTgp
    const sparklineSlice = rows.slice(-30).map((r) => r.national).filter((v) => v > 0);
    expect(sparklineSlice).toHaveLength(30);
    // Verify monotonically increasing national prices
    for (let i = 1; i < sparklineSlice.length; i++) {
      expect(sparklineSlice[i]).toBeGreaterThan(sparklineSlice[i - 1]);
    }
  });
});
