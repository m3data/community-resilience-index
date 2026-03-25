import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFuelReserves } from "../fuel-reserves";

// We need to mock exceljs since tests should not parse real XLSX files.
// The module uses ExcelJS.Workbook, so we mock the whole module.
vi.mock("exceljs", () => {
  // Factory returns a mock ExcelJS module
  return {
    default: {
      Workbook: class MockWorkbook {
        xlsx = {
          load: vi.fn(),
        };
        _sheets: Map<string, { rows: unknown[][] }> = new Map();

        // Test helper to set up sheet data
        _addSheet(name: string, rows: unknown[][]) {
          this._sheets.set(name, { rows });
        }

        getWorksheet(name: string) {
          const sheet = this._sheets.get(name);
          if (!sheet) return undefined;
          return {
            eachRow(
              _opts: { includeEmpty: boolean },
              callback: (row: { getCell: (col: number) => { value: unknown } }, rowNumber: number) => void
            ) {
              for (let i = 0; i < sheet.rows.length; i++) {
                const rowData = sheet.rows[i];
                callback(
                  {
                    getCell: (col: number) => ({ value: rowData[col - 1] }),
                  },
                  i + 1 // 1-indexed
                );
              }
            },
          };
        }
      },
    },
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
});

// Helper to get the mock workbook instance after load
async function setupMockWorkbook(consumptionRows: unknown[][], ieaRows: unknown[][] = []) {
  const ExcelJS = await import("exceljs");
  const WBClass = ExcelJS.default.Workbook as unknown as {
    new (): {
      xlsx: { load: ReturnType<typeof vi.fn> };
      _addSheet: (name: string, rows: unknown[][]) => void;
      getWorksheet: (name: string) => unknown;
    };
  };

  // Capture the instance that will be created
  let capturedWb: ReturnType<InstanceType<typeof WBClass>["_addSheet"]> extends void
    ? InstanceType<typeof WBClass>
    : never;

  const origProto = WBClass.prototype;
  const origLoad = origProto.xlsx?.load;

  // We need to intercept construction. Simpler approach: mock fetch to trigger creation,
  // then the mock class itself handles sheet data via prototype.
  // Actually — the mock class constructor runs fresh each time. We set up _sheets
  // in the xlsx.load mock via closure.

  return { consumptionRows, ieaRows, WBClass };
}

describe("fetchFuelReserves", () => {
  it("returns null when CKAN package fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    const signal = await fetchFuelReserves();
    expect(signal).toBeNull();
  });

  it("returns null when CKAN package has no XLSX resource", async () => {
    const fn = vi.fn();
    fn.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          result: { resources: [{ format: "CSV", url: "https://example.com/data.csv" }] },
        }),
    });
    vi.stubGlobal("fetch", fn);

    const signal = await fetchFuelReserves();
    expect(signal).toBeNull();
  });

  it("returns null when XLSX download fails", async () => {
    const fn = vi.fn();
    // CKAN package_show
    fn.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          result: {
            resources: [{ format: "XLSX", url: "https://example.com/data.xlsx" }],
          },
        }),
    });
    // XLSX download
    fn.mockResolvedValueOnce({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fn);

    const signal = await fetchFuelReserves();
    expect(signal).toBeNull();
  });

  it("returns null when fetch throws entirely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const signal = await fetchFuelReserves();
    expect(signal).toBeNull();
  });
});
