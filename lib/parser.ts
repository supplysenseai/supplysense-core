"use client";
import * as XLSX from "xlsx";
import type { InventoryRow, ValidationError, ValidationWarning } from "./types";
import { mapColumnName } from "./analyzer";

interface ParseResult {
  rows: InventoryRow[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  rowsParsed: number;
  rowsValid: number;
  rowsFlagged: number;
}

const REQUIRED_COLS = [
  "sku_id",
  "product_name",
  "category",
  "units_on_hand",
  "unit_cost",
  "unit_price",
  "units_sold_30d",
  "units_sold_90d",
  "last_sale_date",
  "lead_time_days",
] as const;

function parseDate(val: unknown): Date | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
    } catch {
      // fall through
    }
  }
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    // DD/MM/YYYY
    const parts = val.split("/");
    if (parts.length === 3) {
      const attempt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(attempt.getTime())) return attempt;
    }
  }
  return null;
}

function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[$,\s%]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export async function parseFile(file: File): Promise<ParseResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // R05 — file format
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["xlsx", "xls", "csv", "tsv"].includes(ext)) {
    errors.push({ code: "R05", message: `File format .${ext} not supported. Please upload .xlsx, .xls, .csv, or .tsv.` });
    return { rows: [], errors, warnings, rowsParsed: 0, rowsValid: 0, rowsFlagged: 0 };
  }

  // R10 — file size
  if (file.size > 10 * 1024 * 1024) {
    errors.push({ code: "R10", message: `File exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB). Please split by warehouse or reduce rows.` });
    return { rows: [], errors, warnings, rowsParsed: 0, rowsValid: 0, rowsFlagged: 0 };
  }

  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    errors.push({ code: "R05", message: "Could not read file. It may be password-protected or corrupted." });
    return { rows: [], errors, warnings, rowsParsed: 0, rowsValid: 0, rowsFlagged: 0 };
  }

  // Find first sheet with data
  let sheet: XLSX.WorkSheet | null = null;
  for (const name of workbook.SheetNames) {
    const s = workbook.Sheets[name];
    if (s && Object.keys(s).some((k) => !k.startsWith("!"))) { sheet = s; break; }
  }
  if (!sheet) {
    errors.push({ code: "R05", message: "No data found in file." });
    return { rows: [], errors, warnings, rowsParsed: 0, rowsValid: 0, rowsFlagged: 0 };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  // R03 — min rows
  if (rawRows.length < 5) {
    errors.push({ code: "R03", message: `Only ${rawRows.length} rows found. Minimum 5 required for analysis.` });
    return { rows: [], errors, warnings, rowsParsed: rawRows.length, rowsValid: 0, rowsFlagged: 0 };
  }

  // Map column names
  const sample = rawRows[0];
  const colMap = new Map<string, string>(); // raw col → canonical
  for (const rawCol of Object.keys(sample)) {
    const canonical = mapColumnName(rawCol);
    if (canonical) colMap.set(rawCol, canonical);
  }

  const presentCanonicals = new Set(colMap.values());
  const missingCols = REQUIRED_COLS.filter((c) => !presentCanonicals.has(c));
  if (missingCols.length > 0) {
    errors.push({ code: "R01", message: `Missing required columns: ${missingCols.join(", ")}. Check column headers and accepted aliases.` });
    return { rows: [], errors, warnings, rowsParsed: rawRows.length, rowsValid: 0, rowsFlagged: 0 };
  }

  // Process rows
  const rows: InventoryRow[] = [];
  const seenSkus = new Set<string>();
  let flaggedCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const r: Partial<InventoryRow> = {};

    for (const [rawCol, canonical] of colMap.entries()) {
      const val = raw[rawCol];
      if (canonical === "sku_id" || canonical === "product_name" || canonical === "category") {
        (r as Record<string, unknown>)[canonical] = String(val ?? "").trim();
      } else if (canonical === "last_sale_date") {
        r.last_sale_date = parseDate(val);
      } else if (canonical === "is_perishable") {
        r.is_perishable = ["true", "yes", "1"].includes(String(val).toLowerCase());
      } else {
        (r as Record<string, unknown>)[canonical] = parseNum(val);
      }
    }

    const row = r as InventoryRow;
    let flagged = false;

    // R02 — duplicate SKU
    if (seenSkus.has(row.sku_id)) {
      warnings.push({ code: "R02", row: i + 2, message: `Duplicate SKU "${row.sku_id}" on row ${i + 2}. Row skipped.`, severity: "warning" });
      flagged = true;
      flaggedCount++;
      continue;
    }
    seenSkus.add(row.sku_id);

    // R04 — negative values
    if (row.units_on_hand < 0 || row.unit_cost < 0 || row.units_sold_30d < 0 || row.units_sold_90d < 0) {
      warnings.push({ code: "R04", row: i + 2, message: `Row ${i + 2}: Negative values found. Row excluded.`, severity: "warning" });
      flagged = true;
      flaggedCount++;
      continue;
    }

    // R06 — 30d > 90d auto-correct
    if (row.units_sold_30d > row.units_sold_90d) {
      const corrected = Math.round(row.units_sold_90d / 3);
      warnings.push({ code: "R06", row: i + 2, message: `Row ${i + 2}: units_sold_30d (${row.units_sold_30d}) > units_sold_90d (${row.units_sold_90d}). Auto-corrected to ${corrected}.`, severity: "warning" });
      row.units_sold_30d = corrected;
      flagged = true;
    }

    // R07 — negative margin
    if (row.unit_price > 0 && row.unit_price < row.unit_cost) {
      warnings.push({ code: "R07", row: i + 2, message: `Row ${i + 2} (${row.sku_id}): unit_price ($${row.unit_price}) < unit_cost ($${row.unit_cost}). Negative margin flagged.`, severity: "warning" });
      flagged = true;
    }

    // R08 — unparseable date
    if (!row.last_sale_date) {
      warnings.push({ code: "R08", row: i + 2, message: `Row ${i + 2}: last_sale_date could not be parsed. Using fallback.`, severity: "warning" });
      row.last_sale_date = new Date(Date.now() - 400 * 86_400_000);
      flagged = true;
    }

    // R09 — lead time plausibility
    if (row.lead_time_days === 0) {
      row.lead_time_days = 1;
    } else if (row.lead_time_days > 180) {
      warnings.push({ code: "R09", row: i + 2, message: `Row ${i + 2}: lead_time_days = ${row.lead_time_days} is unusually high. Supplier risk noted.`, severity: "info" });
      flagged = true;
    }

    if (flagged) flaggedCount++;
    rows.push(row);
  }

  return {
    rows,
    errors,
    warnings,
    rowsParsed: rawRows.length,
    rowsValid: rows.length,
    rowsFlagged: flaggedCount,
  };
}
