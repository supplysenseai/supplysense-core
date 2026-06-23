"use client";
import * as XLSX from "xlsx";
import type { ValidationError, ValidationWarning } from "@/lib/types";
import type { InventoryPolicy } from "@/lib/policy";

export interface InventoryItem {
  item_code: string;
  item_name: string;
  category: string;
  supplier: string;
  stock_qty: number;
  monthly_usage: number;
  unit_cost: number;
  lead_time: number; // months
  // Optional file-supplied values — used when present so app matches Excel
  reorder_point?: number;  // from file's "Reorder Point" column
  safety_stock?: number;   // from file's "Safety Stock" column
  // Phase 7 — aging fields (optional; present when file has ageing data)
  ageing_days?: number;
  last_movement_date?: string;
}

export interface ParseResult {
  items: InventoryItem[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  rows_parsed: number;
  rows_valid: number;
  rows_flagged: number;
  detected_fields: string[]; // canonical field names found in the file
  filePolicy?: Partial<InventoryPolicy>; // policy thresholds embedded in the file header
}

// ---------------------------------------------------------------------------
// Column alias map — every common variation per canonical field
// ---------------------------------------------------------------------------
const ALIASES: Record<string, string[]> = {
  item_code: [
    "item code", "sku", "part no", "part number", "product code", "code",
    "item #", "item no", "item no.", "product id", "item id", "id", "part#",
    "sku id", "itemcode", "productcode", "material code", "mat code",
    "mat. code", "material no", "material number", "article code",
    "article no", "article number", "stock code", "ref code", "reference",
    "ref no", "ref", "item ref",
  ],
  item_name: [
    "item name", "product name", "description", "name", "product",
    "material", "item description", "product description", "itemname",
    "productname", "desc", "material description", "mat description",
    "mat desc", "article name", "article description", "stock name",
    "product title", "item title", "goods description", "goods name",
    "commodity", "commodity name",
  ],
  stock_qty: [
    "stock qty", "quantity", "stock", "on hand", "qty", "stock on hand",
    "current stock", "balance", "qty on hand", "quantity on hand",
    "stock balance", "stockqty", "onhand", "closing stock", "closing qty",
    "closing balance", "available qty", "available quantity", "oh qty",
    "oh", "inventory qty", "inventory quantity", "total qty", "total quantity",
    "physical qty", "physical stock", "wh qty", "warehouse qty",
    "wh balance", "current qty", "current balance",
  ],
  monthly_usage: [
    // direct monthly
    "monthly usage", "avg monthly usage", "monthly sales",
    "consumption", "monthly consumption", "avg monthly",
    "monthly demand", "usage/month", "monthly_usage", "monthlyusage",
    "avg monthly consumption", "monthly issue", "monthly issues",
    "avg monthly sales", "sales qty", "sales quantity",
    // daily variants — parser multiplies by 30 when column header contains "daily"
    "avg daily usage", "daily usage", "average daily usage",
    "daily consumption", "daily demand", "avg daily demand",
    "daily sales", "daily velocity", "daily issue",
    // generic usage fallbacks (after daily-specific so they don't steal daily columns)
    "usage", "avg usage",
    // delivery / dispatch oriented
    "do qty", "doqty", "do cqty", "docqty", "dispatch qty",
    "dispatch quantity", "delivery qty", "delivery quantity",
    "issued qty", "issue qty", "issues qty", "total do qty",
    // receipt-based approximation
    "rcvg qty", "receiving qty", "received qty", "receipt qty",
    "total received", "purchase qty",
    // demand / forecast
    "demand", "demand qty", "forecast qty", "forecast", "average demand",
  ],
  unit_cost: [
    "unit cost", "cost", "cost price", "unit price", "price",
    "purchase price", "buy price", "buying price", "unitcost", "costprice",
    "avg cost", "average cost", "unit value", "value per unit",
    "standard cost", "std cost", "last cost", "latest cost",
    "weighted avg cost", "wac", "landed cost",
  ],
  lead_time: [
    // months-explicit
    "lead time", "lead time (months)", "lt", "lead time months",
    "leadtime", "lead_time", "lead time (month)", "reorder time",
    "procurement time", "replenishment time", "vendor lead time",
    "lt (months)", "lt months",
    // days-explicit — values will be auto-converted to months below
    "lead time (days)", "lead time days", "lt (days)", "lt days",
    "lead time in days", "delivery time (days)", "delivery days",
    "supplier lead time (days)", "lead days", "leadtime days",
    // generic — unit detected from magnitude
    "delivery time", "supplier lead time",
  ],
  category: [
    "category", "type", "group", "class", "product group", "item type",
    "product type", "dept", "department", "groupid", "group id",
    "group code", "cat", "cat code", "item group", "product category",
    "product class", "division", "segment",
  ],
  supplier: [
    "supplier", "vendor", "supplier name", "vendor name", "manufacturer",
    "brand", "custname", "cust name", "customer name", "customer",
    "batch/brand", "brand name", "make", "origin", "source",
    "supplier code", "vendor code",
  ],
  // File-supplied reorder fields — used directly when present
  reorder_point: [
    "reorder point", "reorder level", "rop", "re-order point", "re-order level",
    "reorderpoint", "reorder_point", "order point", "min stock level",
    "minimum stock", "min qty", "min level", "order level",
  ],
  safety_stock: [
    "safety stock", "ss", "buffer stock", "safety qty", "safety level",
    "min safety", "safety_stock", "safetystock", "buffer qty",
  ],
  // Phase 7 — aging fields
  ageing_days: [
    "rcvg age", "ageing days", "aging days", "age", "stock age",
    "inventory age", "days on hand", "do age", "age days", "days old",
    "days since receipt", "stock days", "age (days)", "item age",
    "shelf age", "days in stock", "on hand age", "age in days",
  ],
  last_movement_date: [
    "last rcvg date", "last movement date", "last transaction date",
    "lastdo date", "last do date", "last movement", "last sale date",
    "last issue date", "last receipt date", "date received",
    "last activity date", "last updated", "last touch date",
  ],
};

// ---------------------------------------------------------------------------
// Policy column alias map — headers that signal embedded policy thresholds
// ---------------------------------------------------------------------------
const POLICY_ALIASES: Record<keyof InventoryPolicy, string[]> = {
  slow_moving_days: [
    "slow moving days", "slow mover days", "slow moving threshold",
    "slow_moving_days", "slow moving (days)",
  ],
  dead_stock_days: [
    "dead stock days", "dead stock threshold", "dead_stock_days",
    "dead stock (days)", "obsolete days",
  ],
  critical_coverage_days: [
    "critical coverage days", "critical stock days", "coverage days",
    "min coverage days", "critical_coverage_days",
  ],
  safety_stock_days: [
    "safety stock days", "safety days", "ss days",
    "safety_stock_days", "buffer days",
  ],
  abc_a_pct: [
    "abc a%", "abc a pct", "a class pct", "a_pct", "abc a percent",
  ],
  abc_b_pct: [
    "abc b%", "abc b pct", "b class pct", "b_pct", "abc b percent",
  ],
  // These weight fields are less commonly embedded in files; still support them
  weight_dead_stock: [
    "weight dead stock", "dead stock weight", "weight_dead_stock",
  ],
  weight_slow_moving: [
    "weight slow moving", "slow moving weight", "weight_slow_moving",
  ],
  weight_stockout_risk: [
    "weight stockout risk", "stockout risk weight", "weight_stockout_risk",
  ],
};

/**
 * Detects policy columns in the header row.
 * Returns a map of rawHeader → policy field name.
 */
function detectPolicyColumns(headers: string[]): Map<string, keyof InventoryPolicy> {
  const policyMap = new Map<string, keyof InventoryPolicy>();
  for (const raw of headers) {
    const norm = normalize(raw);
    for (const [field, aliases] of Object.entries(POLICY_ALIASES) as [keyof InventoryPolicy, string[]][]) {
      if (aliases.includes(norm)) {
        policyMap.set(raw, field);
        break;
      }
    }
  }
  return policyMap;
}

// Fields that MUST be present (or derived) for analysis
const REQUIRED = ["item_code", "item_name", "stock_qty"] as const;
// Fields that are optional — defaults applied if absent
const OPTIONAL_DEFAULTS: Record<string, number> = {
  monthly_usage: 0,
  unit_cost: 0,
  lead_time: 1,
};

function normalize(s: string): string {
  return String(s).trim().toLowerCase().replace(/[\s_\-\.\/]+/g, " ");
}

function parseNum(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[$,\s%]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// detectColumns — returns map of rawHeader → canonical field name
// Falls back to partial / contains matching when no exact alias found
// ---------------------------------------------------------------------------
function detectColumns(headers: string[]): Map<string, string> {
  const colMap = new Map<string, string>();
  const usedCanonicals = new Set<string>();

  // Pass 1: exact alias match (highest confidence)
  for (const raw of headers) {
    const norm = normalize(raw);
    for (const [canonical, aliases] of Object.entries(ALIASES)) {
      if (!usedCanonicals.has(canonical) && aliases.includes(norm)) {
        colMap.set(raw, canonical);
        usedCanonicals.add(canonical);
        break;
      }
    }
  }

  // Pass 2: partial / contains match for still-unmapped canonicals
  for (const raw of headers) {
    if (colMap.has(raw)) continue; // already mapped
    const norm = normalize(raw);
    for (const [canonical, aliases] of Object.entries(ALIASES)) {
      if (usedCanonicals.has(canonical)) continue;
      // Check if any alias keyword appears inside the header
      const matched = aliases.some((alias) => norm.includes(alias) || alias.includes(norm));
      if (matched) {
        colMap.set(raw, canonical);
        usedCanonicals.add(canonical);
        break;
      }
    }
  }

  return colMap;
}

// ---------------------------------------------------------------------------
// findHeaderRow — scans up to first 8 rows for the row with most recognized
// columns. Handles files with report titles / metadata above the real header.
// ---------------------------------------------------------------------------
function findHeaderRow(allRows: unknown[][]): number {
  let bestRow = 0;
  let bestScore = 0;

  const scanLimit = Math.min(8, allRows.length);
  for (let i = 0; i < scanLimit; i++) {
    const row = allRows[i];
    if (!row || row.length === 0) continue;
    const headers = row.map((c) => String(c ?? ""));
    const colMap = detectColumns(headers);
    const score = colMap.size;
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }
  return bestRow;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------
export async function parseInventoryFile(file: File): Promise<ParseResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // File type check
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["xlsx", "xls", "csv", "tsv"].includes(ext)) {
    return {
      items: [], errors: [{ code: "R05", message: `File format .${ext} not supported. Use XLSX, XLS, CSV, or TSV.` }],
      warnings, rows_parsed: 0, rows_valid: 0, rows_flagged: 0, detected_fields: [],
    };
  }

  // Size check
  if (file.size > 10 * 1024 * 1024) {
    return {
      items: [], errors: [{ code: "R10", message: "File exceeds 10 MB limit." }],
      warnings, rows_parsed: 0, rows_valid: 0, rows_flagged: 0, detected_fields: [],
    };
  }

  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    return {
      items: [], errors: [{ code: "R05", message: "Could not read file. It may be password-protected or corrupted." }],
      warnings, rows_parsed: 0, rows_valid: 0, rows_flagged: 0, detected_fields: [],
    };
  }

  // Collect all non-empty sheets
  const nonEmptySheets: XLSX.WorkSheet[] = [];
  for (const name of workbook.SheetNames) {
    const s = workbook.Sheets[name];
    if (s && Object.keys(s).some((k) => !k.startsWith("!"))) nonEmptySheets.push(s);
  }
  if (nonEmptySheets.length === 0) {
    return {
      items: [], errors: [{ code: "R05", message: "No data found in file." }],
      warnings, rows_parsed: 0, rows_valid: 0, rows_flagged: 0, detected_fields: [],
    };
  }

  const sheet = nonEmptySheets[0];

  // Read as raw 2D array to auto-detect header row
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  if (allRows.length < 4) {
    return {
      items: [], errors: [{ code: "R03", message: `Only ${allRows.length} rows found. Minimum 4 required (1 header + 3 data).` }],
      warnings, rows_parsed: allRows.length, rows_valid: 0, rows_flagged: 0, detected_fields: [],
    };
  }

  // Auto-detect which row contains the headers
  const headerRowIdx = findHeaderRow(allRows);
  const headerRow = (allRows[headerRowIdx] as unknown[]).map((c) => String(c ?? "").trim());

  // Build column map
  const colMap = detectColumns(headerRow);
  const presentCanonicals = new Set(colMap.values());

  // Detect if the monthly_usage column is actually in daily units (header contains "daily")
  // If so, the row parser will multiply by 30 to convert to monthly
  const monthlyUsageRawCol = [...colMap.entries()].find(([, can]) => can === "monthly_usage")?.[0] ?? "";
  const monthlyUsageIsDaily = /\bdaily\b/i.test(monthlyUsageRawCol);

  // Check required columns
  const missing = REQUIRED.filter((c) => !presentCanonicals.has(c));
  if (missing.length > 0) {
    const friendlyNames: Record<string, string> = {
      item_code: "Item Code",
      item_name: "Item Name",
      stock_qty: "Stock Qty",
    };
    const missingLabels = missing.map((m) => friendlyNames[m] ?? m);

    // Build a helpful hint showing which columns we did recognize
    const recognized = Array.from(colMap.entries())
      .map(([raw, can]) => `"${raw}" → ${can}`)
      .join(", ");
    const hintSuffix = recognized
      ? ` Recognized: ${recognized}.`
      : " No columns were recognized.";

    return {
      items: [],
      errors: [{ code: "R01", message: `Missing required columns: ${missingLabels.join(", ")}.${hintSuffix}` }],
      warnings,
      rows_parsed: allRows.length - headerRowIdx - 1,
      rows_valid: 0,
      rows_flagged: 0,
      detected_fields: Array.from(presentCanonicals),
    };
  }

  // Warn about optional columns that are absent (analysis will be limited)
  if (!presentCanonicals.has("monthly_usage")) {
    warnings.push({ code: "W01", message: "Monthly Usage column not found — usage-based metrics (slow movers, stockout risk) will be estimated as zero.", severity: "warning" });
  }
  if (!presentCanonicals.has("unit_cost")) {
    warnings.push({ code: "W02", message: "Unit Cost column not found — financial analysis (dead stock value, recoverable capital) will not be available.", severity: "warning" });
  }
  if (!presentCanonicals.has("lead_time")) {
    warnings.push({ code: "W03", message: "Lead Time column not found — defaulting to 1 month for reorder calculations.", severity: "info" } as ValidationWarning);
  }

  // Note if header row was auto-detected past row 1
  if (headerRowIdx > 0) {
    warnings.push({ code: "W04", message: `Header row auto-detected at row ${headerRowIdx + 1} (skipped ${headerRowIdx} title/metadata row${headerRowIdx > 1 ? "s" : ""}).`, severity: "info" } as ValidationWarning);
  }

  // Helper to read a canonical field from a raw row
  const getRaw = (row: Record<string, unknown>, canonical: string): unknown => {
    for (const [raw, can] of colMap.entries()) {
      if (can === canonical) return row[raw];
    }
    return "";
  };

  // Parse data rows (everything after the header row)
  let dataRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    range: headerRowIdx, // start from the detected header row
  });

  // Merge additional sheets with compatible structure
  if (nonEmptySheets.length > 1) {
    let mergedCount = 0;
    for (const extraSheet of nonEmptySheets.slice(1)) {
      const extraRaw = XLSX.utils.sheet_to_json<unknown[]>(extraSheet, { header: 1, defval: "" });
      if (extraRaw.length < 2) continue;
      const extraHeaderIdx = findHeaderRow(extraRaw);
      const extraHeaderRow = (extraRaw[extraHeaderIdx] as unknown[]).map((c) => String(c ?? "").trim());
      const extraColMap = detectColumns(extraHeaderRow);
      const extraMissing = REQUIRED.filter((c) => !new Set(extraColMap.values()).has(c));
      if (extraMissing.length > 0) continue;
      const extraRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(extraSheet, { defval: "", range: extraHeaderIdx });
      dataRows = [...dataRows, ...extraRows];
      mergedCount++;
    }
    if (mergedCount > 0) {
      warnings.push({ code: "W10", message: `${mergedCount} additional sheet${mergedCount > 1 ? "s" : ""} with compatible structure merged automatically.`, severity: "info" } as ValidationWarning);
    }
  }

  const items: InventoryItem[] = [];
  const seenCodes = new Set<string>();
  let flagged = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = headerRowIdx + i + 2; // 1-based spreadsheet row number

    const item_code = String(getRaw(row, "item_code") ?? "").trim();
    const item_name = String(getRaw(row, "item_name") ?? "").trim();
    const stock_qty = parseNum(getRaw(row, "stock_qty"));
    const raw_monthly = presentCanonicals.has("monthly_usage")
      ? parseNum(getRaw(row, "monthly_usage"))
      : OPTIONAL_DEFAULTS.monthly_usage;
    // If the source column uses daily units, convert to monthly (×30)
    const monthly_usage = monthlyUsageIsDaily ? raw_monthly * 30 : raw_monthly;
    const unit_cost = presentCanonicals.has("unit_cost")
      ? parseNum(getRaw(row, "unit_cost"))
      : OPTIONAL_DEFAULTS.unit_cost;
    const raw_lead = presentCanonicals.has("lead_time")
      ? parseNum(getRaw(row, "lead_time"))
      : OPTIONAL_DEFAULTS.lead_time;
    // Auto-detect unit: values > 6 are almost certainly in days, not months.
    // e.g. "30" days → 1 month. Prevents items from being wrongly classified
    // as CRITICAL when lead_time of 30 days is read as 30 months.
    const lead_time_raw_positive = raw_lead > 0 ? raw_lead : 1;
    const lead_time = lead_time_raw_positive > 6
      ? parseFloat((lead_time_raw_positive / 30).toFixed(4))   // days → months
      : lead_time_raw_positive;                                  // already months
    const category = String(getRaw(row, "category") ?? "").trim() || "Uncategorized";
    const supplier = String(getRaw(row, "supplier") ?? "").trim() || "";
    // Optional file-supplied reorder fields — used as-is when present
    const reorder_point = presentCanonicals.has("reorder_point")
      ? parseNum(getRaw(row, "reorder_point"))
      : undefined;
    const safety_stock = presentCanonicals.has("safety_stock")
      ? parseNum(getRaw(row, "safety_stock"))
      : undefined;

    // Skip empty rows
    if (!item_code) { flagged++; continue; }

    // Skip duplicate codes
    if (seenCodes.has(item_code)) {
      warnings.push({ code: "R07", row: rowNum, message: `Row ${rowNum}: Duplicate item code "${item_code}" skipped.`, severity: "warning" });
      flagged++;
      continue;
    }

    // Skip negative stock
    if (stock_qty < 0) {
      warnings.push({ code: "R08", row: rowNum, message: `Row ${rowNum}: Negative stock quantity for "${item_code}" skipped.`, severity: "warning" });
      flagged++;
      continue;
    }

    // Skip negative cost (only if cost column exists)
    if (presentCanonicals.has("unit_cost") && unit_cost < 0) {
      warnings.push({ code: "R09", row: rowNum, message: `Row ${rowNum}: Negative unit cost for "${item_code}" skipped.`, severity: "warning" });
      flagged++;
      continue;
    }

    // Phase 7: extract ageing fields
    let ageing_days: number | undefined;
    let last_movement_date: string | undefined;

    if (presentCanonicals.has("ageing_days")) {
      const rawAge = getRaw(row, "ageing_days");
      if (typeof rawAge === "number" && rawAge >= 0) {
        ageing_days = Math.round(rawAge);
      } else if (typeof rawAge === "string" && rawAge.trim() !== "") {
        const n = parseFloat(rawAge);
        if (!isNaN(n) && n >= 0) ageing_days = Math.round(n);
      }
    }

    if (presentCanonicals.has("last_movement_date")) {
      const rawDate = getRaw(row, "last_movement_date");
      if (rawDate instanceof Date) {
        last_movement_date = rawDate.toISOString().split("T")[0];
        if (ageing_days === undefined) {
          const diffMs = Date.now() - rawDate.getTime();
          ageing_days = Math.max(0, Math.round(diffMs / 86_400_000));
        }
      } else if (typeof rawDate === "string" && rawDate.trim() !== "") {
        last_movement_date = rawDate.trim();
        if (ageing_days === undefined) {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            const diffMs = Date.now() - parsed.getTime();
            ageing_days = Math.max(0, Math.round(diffMs / 86_400_000));
          }
        }
      } else if (typeof rawDate === "number" && rawDate > 1000) {
        // Excel serial date
        try {
          const d = XLSX.SSF.parse_date_code(rawDate);
          const parsed = new Date(d.y, d.m - 1, d.d);
          last_movement_date = parsed.toISOString().split("T")[0];
          if (ageing_days === undefined) {
            const diffMs = Date.now() - parsed.getTime();
            ageing_days = Math.max(0, Math.round(diffMs / 86_400_000));
          }
        } catch { /* ignore bad date */ }
      }
    }

    seenCodes.add(item_code);
    items.push({
      item_code,
      item_name: item_name || item_code,
      category,
      supplier,
      stock_qty,
      monthly_usage,
      unit_cost,
      lead_time,
      ...(reorder_point !== undefined ? { reorder_point } : {}),
      ...(safety_stock  !== undefined ? { safety_stock  } : {}),
      ...(ageing_days !== undefined ? { ageing_days } : {}),
      ...(last_movement_date ? { last_movement_date } : {}),
    });
  }

  if (items.length === 0) {
    return {
      items: [],
      errors: [{ code: "R04", message: "No valid data rows found after parsing. Check that your data starts immediately after the header row." }],
      warnings,
      rows_parsed: dataRows.length,
      rows_valid: 0,
      rows_flagged: flagged,
      detected_fields: Array.from(presentCanonicals),
    };
  }

  // ── Policy detection ──────────────────────────────────────────────────────
  // Check if any policy threshold columns exist in the header row.
  // If found, read their values from the first data row.
  const policyColMap = detectPolicyColumns(headerRow);
  let filePolicy: Partial<InventoryPolicy> | undefined;

  if (policyColMap.size > 0 && dataRows.length > 0) {
    const firstRow = dataRows[0];
    const extracted: Partial<InventoryPolicy> = {};
    let foundAny = false;

    for (const [rawHeader, policyField] of policyColMap.entries()) {
      const val = parseNum(firstRow[rawHeader]);
      if (val > 0) {
        (extracted as Record<string, number>)[policyField] = val;
        foundAny = true;
      }
    }

    if (foundAny) {
      filePolicy = extracted;
      warnings.push({
        code: "W05",
        message: `Policy thresholds detected in file: ${Object.keys(extracted).join(", ")}. These will override system defaults for this analysis.`,
        severity: "info",
      } as ValidationWarning);
    }
  }

  return {
    items,
    errors,
    warnings,
    rows_parsed: dataRows.length,
    rows_valid: items.length,
    rows_flagged: flagged,
    detected_fields: Array.from(presentCanonicals),
    ...(filePolicy ? { filePolicy } : {}),
  };
}
