"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { X, Download, Search, ArrowUpDown, ArrowUp, ArrowDown, Table2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrilldownPayload, DrillColumn } from "@/lib/drilldown";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(val: unknown, col: DrillColumn): { text: string; isBadge: boolean; badgeClass: string } {
  if (val === null || val === undefined) return { text: "—", isBadge: false, badgeClass: "" };

  if (col.format === "badge" && col.badgeColors) {
    const text = String(val);
    const cls  = col.badgeColors[text] ?? "text-slate-400 bg-white/5 border-white/10";
    return { text, isBadge: true, badgeClass: cls };
  }
  if (col.format === "currency") {
    const n = Number(val);
    if (!isFinite(n)) return { text: "—", isBadge: false, badgeClass: "" };
    if (Math.abs(n) >= 1_000_000) return { text: `$${(n / 1_000_000).toFixed(1)}M`, isBadge: false, badgeClass: "" };
    if (Math.abs(n) >= 1_000)     return { text: `$${(n / 1_000).toFixed(1)}K`,     isBadge: false, badgeClass: "" };
    return { text: `$${n.toFixed(2)}`, isBadge: false, badgeClass: "" };
  }
  if (col.format === "number") {
    const n = Number(val);
    return { text: isFinite(n) ? n.toLocaleString() : "—", isBadge: false, badgeClass: "" };
  }
  if (col.format === "days") {
    const n = Number(val);
    return { text: isFinite(n) && val !== null ? `${n}d` : "—", isBadge: false, badgeClass: "" };
  }
  if (col.format === "percent") {
    return { text: `${Number(val).toFixed(1)}%`, isBadge: false, badgeClass: "" };
  }
  return { text: String(val), isBadge: false, badgeClass: "" };
}

// ─── Sort state ───────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc";

function sortRows(rows: Record<string, unknown>[], key: string, dir: SortDir) {
  return [...rows].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    const an = Number(av), bn = Number(bv);
    const cmp = isFinite(an) && isFinite(bn)
      ? an - bn
      : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCsv(payload: DrilldownPayload) {
  const header = payload.columns.map((c) => `"${c.label}"`).join(",");
  const body   = payload.rows.map((row) =>
    payload.columns.map((c) => {
      const v = row[c.key];
      return `"${v === null || v === undefined ? "" : String(v)}"`;
    }).join(",")
  );
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `${payload.title.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DrilldownPage() {
  const searchParams = useSearchParams();
  const storageKey   = searchParams.get("key") ?? "";

  const [payload,   setPayload]   = useState<DrilldownPayload | null>(null);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [sortKey,   setSortKey]   = useState("");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");

  useEffect(() => {
    if (!storageKey) { setError("No drill-through key provided."); return; }
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) { setError("Drill-through data not found. Please click the chart again."); return; }
      setPayload(JSON.parse(raw) as DrilldownPayload);
      // Clean up after reading
      sessionStorage.removeItem(storageKey);
    } catch {
      setError("Failed to load drill-through data.");
    }
  }, [storageKey]);

  const displayRows = useMemo(() => {
    if (!payload) return [];
    let rows = payload.rows;
    // Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    // Sort
    if (sortKey) rows = sortRows(rows, sortKey, sortDir);
    return rows;
  }, [payload, search, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Error state ───────────────────────────────────────────────────────────────
  if (error || (!payload && storageKey)) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-6">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-white">{error || "Loading…"}</p>
          <p className="text-xs text-slate-500">Drill-through data is stored in your browser session. If you refreshed this window, please click the chart bar again.</p>
          <button onClick={() => window.close()} className="text-xs text-[#818cf8] hover:text-white underline">Close window</button>
        </div>
      </div>
    );
  }
  if (!payload) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#818cf8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SortIcon = ({ col }: { col: DrillColumn }) => {
    if (sortKey !== col.key) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-[#818cf8]" />
      : <ArrowDown className="w-3 h-3 text-[#818cf8]" />;
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col text-slate-300" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30 border-b border-white/6 flex-shrink-0"
        style={{ background: "rgba(2,6,23,0.95)", backdropFilter: "blur(12px)" }}
      >
        <div className="px-5 h-[52px] flex items-center gap-3">
          {/* Icon */}
          <div className="w-7 h-7 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center flex-shrink-0">
            <Table2 className="w-3.5 h-3.5 text-[#818cf8]" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mb-0.5">
              {payload.sourceChart} → Drill-through
            </p>
            <h1 className="text-sm font-bold text-white truncate" style={{ fontFamily: "Syne, sans-serif" }}>
              {payload.title}
            </h1>
          </div>

          {/* Row count badge */}
          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#818cf8] flex-shrink-0">
            {displayRows.length} of {payload.totalRows} rows
          </span>

          {/* Export */}
          <button
            onClick={() => exportCsv(payload)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-white/8 hover:border-white/20 bg-white/3 hover:bg-white/6 transition-colors flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Close */}
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-white/8 hover:border-white/20 hover:bg-white/6 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </header>

      {/* ── Sub-header ── */}
      <div className="px-5 py-3 border-b border-white/4 bg-white/1 flex-shrink-0 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500 truncate">{payload.subtitle}</p>
        <p className="text-[10px] text-slate-700 flex-shrink-0 hidden sm:block">
          Generated {new Date(payload.generatedAt).toLocaleTimeString()}
        </p>
      </div>

      {/* ── Search bar ── */}
      <div className="px-5 py-3 border-b border-white/4 flex-shrink-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search any column…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/4 border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#6366f1]/50 transition-colors"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {payload.columns.length === 0 || displayRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Table2 className="w-8 h-8 text-slate-700" />
            <p className="text-sm text-slate-500">
              {search ? "No rows match your search." : "No data for this segment."}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="text-xs text-[#818cf8] hover:text-white underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/8" style={{ background: "#0f172a" }}>
                  <th className="px-4 py-2.5 text-left text-[10px] text-slate-600 font-semibold uppercase tracking-wider w-10">#</th>
                  {payload.columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-white transition-colors group",
                        col.align === "right"  ? "text-right" :
                        col.align === "center" ? "text-center" : "text-left",
                        sortKey === col.key ? "text-[#818cf8]" : "text-slate-500"
                      )}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {col.align === "right" && <SortIcon col={col} />}
                        {col.label}
                        {col.align !== "right" && <SortIcon col={col} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={cn(
                      "border-b border-white/4 hover:bg-white/2 transition-colors",
                      ri % 2 === 0 ? "bg-transparent" : "bg-white/1"
                    )}
                  >
                    {/* Row number */}
                    <td className="px-4 py-2.5 text-[10px] text-slate-700 tabular-nums">{ri + 1}</td>

                    {payload.columns.map((col) => {
                      const { text, isBadge, badgeClass } = fmt(row[col.key], col);
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-2.5",
                            col.align === "right"  ? "text-right tabular-nums" :
                            col.align === "center" ? "text-center" : "text-left",
                            col.key === "product_name" ? "max-w-[200px]" : ""
                          )}
                        >
                          {isBadge ? (
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", badgeClass)}>
                              {text}
                            </span>
                          ) : (
                            <span className={cn(
                              col.key === "product_name" ? "text-white font-medium block truncate" :
                              col.key === "sku_id" || col.key === "item_code" ? "font-mono text-slate-400" :
                              col.format === "currency" ? "text-white font-semibold" :
                              col.format === "days" && text !== "—" && Number(text.replace("d","")) <= 7 ? "text-red-400 font-semibold" :
                              col.format === "days" && text !== "—" && Number(text.replace("d","")) <= 30 ? "text-amber-400" :
                              "text-slate-300"
                            )}>
                              {text}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 border-t border-white/5 px-5 py-2.5 flex items-center justify-between">
        <p className="text-[11px] text-slate-600">
          {displayRows.length} row{displayRows.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
          {" · "}Click any column header to sort
        </p>
        <p className="text-[11px] text-slate-700">Event2Act · Drill-through</p>
      </div>
    </div>
  );
}
