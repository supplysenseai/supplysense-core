"use client";
/**
 * HTML Report Generator
 * Generates a fully self-contained, printable HTML report from DashboardMetrics.
 * All counts are derived directly from metrics — identical to dashboard KPI cards.
 */

import type { DashboardMetrics } from "./types";
import type { ExecutiveSummary } from "./insights-generator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, compact = false): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function num(n: number, dec = 1): string {
  return isFinite(n) ? n.toFixed(dec) : "—";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function healthColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#2563eb";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

function healthLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

function severityColor(s: string): string {
  const m: Record<string, string> = { critical: "#dc2626", high: "#ea580c", medium: "#d97706", low: "#2563eb" };
  return m[s] ?? "#6b7280";
}

function severityBg(s: string): string {
  const m: Record<string, string> = { critical: "#fef2f2", high: "#fff7ed", medium: "#fffbeb", low: "#eff6ff" };
  return m[s] ?? "#f9fafb";
}

const CARRYING_RATE = 0.25;

// ─── HTML builder ─────────────────────────────────────────────────────────────

export function generateHtmlReport(
  metrics: DashboardMetrics,
  summary: ExecutiveSummary,
  sourceFile = "Inventory dataset",
  companyName = ""
): string {

  const score       = metrics.health_score;
  const hColor      = healthColor(score);
  const hLabel      = healthLabel(score);
  const generatedAt = new Date(summary.generated_at).toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // ── Derive item lists directly from metrics (not summary.priority_items) ────
  // These counts will always exactly match the dashboard KPI cards.

  const criticalItems = metrics.top_risk_items.filter(s => s.scenario === "CRITICAL");
  const watchItems    = metrics.top_risk_items.filter(s => s.scenario === "WATCH");
  const deadItems     = metrics.top_dead_stock.length
    ? metrics.top_dead_stock
    : metrics.all_skus.filter(s => s.scenario === "DEAD");
  const slowItems     = metrics.all_skus
    .filter(s => s.scenario === "SLOW")
    .sort((a, b) => b.inventory_value - a.inventory_value);
  const aClassAtRisk  = metrics.top_risk_items.filter(s => s.abc_class === "A");

  // ── Totals verify ─────────────────────────────────────────────────────────
  const criticalTotal = criticalItems.reduce((s, r) => s + r.inventory_value, 0);
  const deadTotal     = deadItems.reduce((s, r) => s + r.inventory_value, 0);
  const slowTotal     = slowItems.reduce((s, r) => s + r.inventory_value, 0);

  // ── Financial calcs ────────────────────────────────────────────────────────
  const deadRecovery  = metrics.dead_stock_value * 0.30;
  const slowRecovery  = metrics.slow_mover_value * 0.50 * 0.65;
  const annualSavings = (metrics.dead_stock_value + metrics.slow_mover_value * 0.50) * CARRYING_RATE;
  const y1 = metrics.recoverable_capital + annualSavings;
  const y2 = y1 + annualSavings;
  const y3 = y2 + annualSavings;
  const maxY = Math.max(y1, y2, y3) || 1;

  // ── Risk Distribution (matches dashboard Risk Distribution chart) ──────────
  const rd = metrics.risk_distribution;
  const rdTotal = (rd.low + rd.watch + rd.elevated + rd.critical + rd.dead) || 1;
  const riskRows = [
    { label: "Healthy",      count: rd.low,      pct: (rd.low / rdTotal * 100),      value: "—",                                  color: "#059669", action: "Maintain"       },
    { label: "Watch",        count: rd.watch,     pct: (rd.watch / rdTotal * 100),    value: "—",                                  color: "#3b82f6", action: "Monitor"        },
    { label: "Slow Moving",  count: rd.elevated,  pct: (rd.elevated / rdTotal * 100), value: fmt(metrics.slow_mover_value, true),  color: "#d97706", action: "Promote/Suspend" },
    { label: "Dead Stock",   count: rd.dead,      pct: (rd.dead / rdTotal * 100),     value: fmt(metrics.dead_stock_value, true),  color: "#9333ea", action: "Liquidate"      },
    { label: "Stockout Risk",count: rd.critical,  pct: (rd.critical / rdTotal * 100), value: fmt(criticalTotal, true),             color: "#dc2626", action: "Emergency PO"   },
  ];

  // ── Health score components ────────────────────────────────────────────────
  const hc = metrics.health_components;
  const ap = metrics.active_policy;
  const wD  = ap?.policy.weight_dead_stock    ?? 30;
  const wS  = ap?.policy.weight_slow_moving   ?? 25;
  const wSO = ap?.policy.weight_stockout_risk ?? 30;
  const wA  = Math.max(0, 100 - wD - wS - wSO);

  // ─────────────────────────────────────────────────────────────────────────
  // HTML SECTIONS
  // ─────────────────────────────────────────────────────────────────────────

  // ── A. Risk Distribution table ────────────────────────────────────────────
  const riskTableHtml = riskRows.map(r => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:9px 12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${r.color};flex-shrink:0;"></div>
          <span style="font-size:12px;font-weight:600;color:#111827;">${r.label}</span>
        </div>
      </td>
      <td style="padding:9px 12px;text-align:right;">
        <span style="font-size:13px;font-weight:700;color:${r.color};">${r.count}</span>
        <span style="font-size:11px;color:#6b7280;margin-left:4px;">SKUs</span>
      </td>
      <td style="padding:9px 12px;">
        <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden;width:120px;">
          <div style="height:100%;background:${r.color};width:${Math.max(2, r.pct).toFixed(1)}%;border-radius:4px;"></div>
        </div>
      </td>
      <td style="padding:9px 12px;font-size:11px;color:#6b7280;text-align:right;">${r.pct.toFixed(1)}%</td>
      <td style="padding:9px 12px;font-size:12px;font-weight:600;color:#374151;text-align:right;">${r.value}</td>
      <td style="padding:9px 12px;">
        <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;background:${r.color}18;color:${r.color};border:1px solid ${r.color}30;">${r.action}</span>
      </td>
    </tr>`
  ).join("") + `
    <tr style="background:#f8fafc;border-top:2px solid #e5e7eb;">
      <td style="padding:9px 12px;font-size:12px;font-weight:700;color:#111827;">Total Portfolio</td>
      <td style="padding:9px 12px;text-align:right;font-size:13px;font-weight:800;color:#111827;">${metrics.total_skus} SKUs</td>
      <td style="padding:9px 12px;"></td>
      <td style="padding:9px 12px;font-size:11px;color:#6b7280;text-align:right;">100%</td>
      <td style="padding:9px 12px;font-size:12px;font-weight:700;color:#111827;text-align:right;">${fmt(metrics.total_inventory_value, true)}</td>
      <td style="padding:9px 12px;"></td>
    </tr>`;

  // ── B. Health Score Components ────────────────────────────────────────────
  const hcRows = [
    { name: "Dead Stock Factor",    weight: wD,  score: hc.dead_stock_score,  raw: `${hc.dead_stock_pct}% dead SKUs`,     color: "#9333ea" },
    { name: "Slow Moving Factor",   weight: wS,  score: hc.slow_mover_score,  raw: `${hc.slow_mover_pct}% slow SKUs`,     color: "#d97706" },
    { name: "Stockout Risk Factor", weight: wSO, score: hc.stockout_score,    raw: `${hc.stockout_risk_pct}% at risk`,    color: "#dc2626" },
    { name: "ABC Balance Factor",   weight: wA,  score: hc.abc_score,         raw: `${hc.a_item_revenue_pct}% A-item rev`,color: "#059669" },
  ];
  const hcHtml = hcRows.map(r => {
    const contribution = Math.round(r.score * r.weight / 100);
    return `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${r.color};flex-shrink:0;"></div>
          <span style="font-size:12px;font-weight:600;color:#111827;">${r.name}</span>
        </div>
      </td>
      <td style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:center;">${r.weight}%</td>
      <td style="padding:8px 12px;">
        <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden;width:80px;margin:0 auto;">
          <div style="height:100%;background:${r.color};width:${r.score}%;border-radius:4px;"></div>
        </div>
      </td>
      <td style="padding:8px 12px;font-size:12px;font-weight:700;text-align:center;color:${r.score >= 70 ? "#059669" : r.score >= 50 ? "#d97706" : "#dc2626"};">${r.score}/100</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:700;text-align:right;color:#6366f1;">+${contribution} pts</td>
      <td style="padding:8px 12px;font-size:11px;color:#6b7280;">${esc(r.raw)}</td>
    </tr>`;
  }).join("") + `
    <tr style="background:#f8fafc;border-top:2px solid #e5e7eb;">
      <td colspan="4" style="padding:9px 12px;font-size:13px;font-weight:800;color:#111827;">Composite Health Score</td>
      <td style="padding:9px 12px;font-size:16px;font-weight:800;color:${hColor};text-align:right;">${score}/100</td>
      <td style="padding:9px 12px;font-size:11px;font-weight:700;color:${hColor};">${hLabel}</td>
    </tr>`;

  // ── C. Stockout Risk Items — CRITICAL scenario (matches KPI card exactly) ──
  const criticalHtml = criticalItems.length === 0
    ? `<tr><td colspan="7" style="padding:16px 12px;text-align:center;color:#059669;font-size:12px;font-weight:600;">✓ No critical stockout risk detected</td></tr>`
    : criticalItems.map(item => {
        const daysLeft = isFinite(item.days_stock_remaining) ? Math.round(item.days_stock_remaining) : null;
        const leadTime = item.lead_time_days ?? 0;
        const isZero   = daysLeft !== null && daysLeft <= 0;
        const urgency  = isZero ? "#dc2626" : daysLeft !== null && daysLeft < leadTime ? "#ea580c" : "#d97706";
        const annualRev = item.units_sold_30d * item.unit_price * 12;
        return `
    <tr style="border-bottom:1px solid #f3f4f6;${isZero ? "background:#fef2f2;" : ""}">
      <td style="padding:9px 12px;font-size:11px;font-family:monospace;color:#6b7280;">${esc(item.sku_id)}</td>
      <td style="padding:9px 12px;font-size:12px;font-weight:600;color:#111827;max-width:160px;">${esc(item.product_name)}</td>
      <td style="padding:9px 12px;text-align:center;">
        <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;background:#e0e7ff;color:#4338ca;">${esc(item.abc_class)}</span>
      </td>
      <td style="padding:9px 12px;text-align:right;font-size:13px;font-weight:700;color:${urgency};">
        ${daysLeft !== null ? `${daysLeft}d` : "∞"}
      </td>
      <td style="padding:9px 12px;text-align:right;font-size:11px;color:#374151;">${leadTime}d lead</td>
      <td style="padding:9px 12px;text-align:right;font-size:12px;font-weight:600;color:#111827;">
        ${item.reorder_qty_eoq > 0 ? `${item.reorder_qty_eoq.toLocaleString()} units` : "—"}
      </td>
      <td style="padding:9px 12px;text-align:right;font-size:11px;color:#ea580c;">
        ${annualRev > 0 ? fmt(annualRev, true) + "/yr" : "—"}
      </td>
    </tr>`;
      }).join("") + `
    <tr style="background:#fef2f2;border-top:2px solid #fca5a5;">
      <td colspan="3" style="padding:9px 12px;font-size:12px;font-weight:700;color:#991b1b;">
        Total: ${criticalItems.length} Critical Item${criticalItems.length !== 1 ? "s" : ""} — matches Stockout Risk KPI
      </td>
      <td colspan="4" style="padding:9px 12px;text-align:right;font-size:12px;font-weight:700;color:#dc2626;">
        ${fmt(criticalTotal, true)} inventory value at risk
      </td>
    </tr>`;

  // ── D. Watch Items ─────────────────────────────────────────────────────────
  const watchHtml = watchItems.length === 0
    ? `<tr><td colspan="5" style="padding:14px 12px;text-align:center;color:#6b7280;font-size:12px;">No watch-list items</td></tr>`
    : watchItems.slice(0, 10).map(item => {
        const daysLeft = isFinite(item.days_stock_remaining) ? Math.round(item.days_stock_remaining) : null;
        return `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6b7280;">${esc(item.sku_id)}</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:500;color:#111827;">${esc(item.product_name)}</td>
      <td style="padding:8px 12px;text-align:center;">
        <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;background:#e0e7ff;color:#4338ca;">${esc(item.abc_class)}</span>
      </td>
      <td style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;color:#3b82f6;">${daysLeft !== null ? `${daysLeft}d` : "∞"}</td>
      <td style="padding:8px 12px;text-align:right;font-size:11px;color:#374151;">${item.lead_time_days ?? "?"}d lead time</td>
    </tr>`;
      }).join("");

  // ── E. Dead Stock Items ────────────────────────────────────────────────────
  const deadHtml = deadItems.length === 0
    ? `<tr><td colspan="6" style="padding:16px 12px;text-align:center;color:#059669;font-size:12px;font-weight:600;">✓ No dead stock detected</td></tr>`
    : deadItems.slice(0, 15).map(item => {
        const carrying = item.inventory_value * CARRYING_RATE;
        return `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6b7280;">${esc(item.sku_id)}</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:500;color:#111827;max-width:160px;">${esc(item.product_name)}</td>
      <td style="padding:8px 12px;text-align:center;">
        <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;background:#e0e7ff;color:#4338ca;">${esc(item.abc_class)}</span>
      </td>
      <td style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;color:#9333ea;">${fmt(item.inventory_value, true)}</td>
      <td style="padding:8px 12px;text-align:right;font-size:11px;color:#ea580c;">${fmt(carrying, true)}/yr</td>
      <td style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;">${item.units_on_hand.toLocaleString()} units</td>
    </tr>`;
      }).join("") + `
    <tr style="background:#f9f7ff;border-top:2px solid #e9d5ff;">
      <td colspan="3" style="padding:9px 12px;font-size:12px;font-weight:700;color:#6b21a8;">
        Total: ${metrics.dead_stock_count} Dead Stock SKU${metrics.dead_stock_count !== 1 ? "s" : ""} — matches KPI card
      </td>
      <td style="padding:9px 12px;text-align:right;font-size:12px;font-weight:700;color:#9333ea;">${fmt(metrics.dead_stock_value, true)}</td>
      <td style="padding:9px 12px;text-align:right;font-size:12px;font-weight:700;color:#ea580c;">${fmt(metrics.dead_stock_carrying_cost, true)}/yr</td>
      <td style="padding:9px 12px;"></td>
    </tr>`;

  // ── F. Slow Moving Items ───────────────────────────────────────────────────
  const slowHtml = slowItems.length === 0
    ? `<tr><td colspan="5" style="padding:16px 12px;text-align:center;color:#059669;font-size:12px;font-weight:600;">✓ No slow moving items detected</td></tr>`
    : slowItems.slice(0, 15).map(item => {
        const excessDays = isFinite(item.days_stock_remaining) ? Math.round(item.days_stock_remaining) : null;
        const daysThreshold = ap?.policy.slow_moving_days ?? 180;
        const excessValue = excessDays !== null && excessDays > daysThreshold && item.daily_velocity > 0
          ? (excessDays - daysThreshold) * item.daily_velocity * item.unit_cost
          : 0;
        return `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6b7280;">${esc(item.sku_id)}</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:500;color:#111827;max-width:160px;">${esc(item.product_name)}</td>
      <td style="padding:8px 12px;text-align:center;">
        <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;background:#e0e7ff;color:#4338ca;">${esc(item.abc_class)}</span>
      </td>
      <td style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;">${excessDays !== null ? `${excessDays}d stock` : "—"}</td>
      <td style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;color:#d97706;">${fmt(item.inventory_value, true)}</td>
      <td style="padding:8px 12px;text-align:right;font-size:11px;color:#ea580c;">${excessValue > 0 ? fmt(excessValue, true) + " excess" : "—"}</td>
    </tr>`;
      }).join("") + `
    <tr style="background:#fffbeb;border-top:2px solid #fde68a;">
      <td colspan="4" style="padding:9px 12px;font-size:12px;font-weight:700;color:#92400e;">
        Total: ${metrics.slow_mover_count} Slow Moving SKU${metrics.slow_mover_count !== 1 ? "s" : ""} — matches KPI card
      </td>
      <td style="padding:9px 12px;text-align:right;font-size:12px;font-weight:700;color:#d97706;">${fmt(metrics.slow_mover_value, true)}</td>
      <td style="padding:9px 12px;"></td>
    </tr>`;

  // ── G. ABC Summary ─────────────────────────────────────────────────────────
  const abc = metrics.abc_summary;
  const abcHtml = [
    { cls: "A", count: abc.a_count, rev: abc.a_revenue_pct, color: "#059669", bg: "#d1fae5", guideline: "Maintain 100% service levels — never allow stockout. Highest replenishment priority." },
    { cls: "B", count: abc.b_count, rev: abc.b_revenue_pct, color: "#2563eb", bg: "#dbeafe", guideline: "Standard EOQ-based replenishment. Review quarterly for reclassification." },
    { cls: "C", count: abc.c_count, rev: abc.c_revenue_pct, color: "#6366f1", bg: "#e0e7ff", guideline: "Minimise stock holding. Consider batch ordering, consolidation, or SKU rationalisation." },
  ].map(a => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 14px;">
        <span style="display:inline-block;font-size:13px;font-weight:800;padding:2px 10px;border-radius:6px;background:${a.bg};color:${a.color};">${a.cls}</span>
      </td>
      <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#374151;text-align:right;">${a.count} SKUs</td>
      <td style="padding:10px 14px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="background:#f3f4f6;border-radius:4px;height:10px;overflow:hidden;width:100px;flex-shrink:0;">
            <div style="height:100%;background:${a.color};width:${Math.max(2, a.rev)}%;border-radius:4px;"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:${a.color};">${a.rev}%</span>
          <span style="font-size:11px;color:#6b7280;">of value</span>
        </div>
      </td>
      <td style="padding:10px 14px;font-size:11px;color:#6b7280;">${esc(a.guideline)}</td>
    </tr>`).join("");

  // ── H. Key Risks ──────────────────────────────────────────────────────────
  const risksHtml = summary.key_risks.map(r => `
    <div style="border-left:4px solid ${severityColor(r.severity)};background:${severityBg(r.severity)};padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:12px;">
      <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:4px;flex-wrap:wrap;">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:${severityColor(r.severity)};">${esc(r.severity)}</span>
        ${r.affected_skus > 0 ? `<span style="font-size:11px;color:#6b7280;">${r.affected_skus} SKU${r.affected_skus > 1 ? "s" : ""} affected</span>` : ""}
        ${r.financial_exposure > 0 ? `<span style="font-size:11px;color:#6b7280;">&bull; ${fmt(r.financial_exposure, true)} exposure</span>` : ""}
      </div>
      <p style="font-size:13px;font-weight:600;color:#111827;margin:0 0 4px 0;">${esc(r.title)}</p>
      <p style="font-size:12px;color:#4b5563;margin:0;line-height:1.6;">${esc(r.detail)}</p>
    </div>`).join("");

  // ── I. Recommended Actions ────────────────────────────────────────────────
  const tlColor: Record<string, string> = {
    "Immediate": "#dc2626", "This week": "#d97706", "This month": "#2563eb", "Next quarter": "#6b7280",
  };
  const actionsHtml = summary.recommended_actions.map(a => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 12px;font-size:13px;font-weight:800;color:#6366f1;text-align:center;width:30px;">${a.priority}</td>
      <td style="padding:10px 12px;">
        <p style="font-size:12px;font-weight:700;color:#111827;margin:0 0 3px 0;">${esc(a.action)}</p>
        <p style="font-size:11px;color:#6b7280;margin:0;line-height:1.5;">${esc(a.rationale)}</p>
      </td>
      <td style="padding:10px 12px;white-space:nowrap;text-align:center;">
        <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;background:${tlColor[a.timeline] ?? "#e5e7eb"}18;color:${tlColor[a.timeline] ?? "#374151"};border:1px solid ${tlColor[a.timeline] ?? "#e5e7eb"}40;">${esc(a.timeline)}</span>
      </td>
      <td style="padding:10px 12px;font-size:11px;color:#374151;text-align:center;">${esc(a.owner)}</td>
      <td style="padding:10px 12px;font-size:11px;color:#059669;font-weight:600;">${esc(a.estimated_impact)}</td>
    </tr>`).join("");

  // ── J. Financial metrics ───────────────────────────────────────────────────
  const finCards = [
    { label: "Total Inventory Value",        value: fmt(metrics.total_inventory_value),         color: "#111827", sub: `${metrics.total_skus} SKUs` },
    { label: "Dead Stock Value",             value: fmt(metrics.dead_stock_value),              color: "#9333ea", sub: `${metrics.dead_stock_count} SKUs · zero velocity` },
    { label: "Slow Mover Value",             value: fmt(metrics.slow_mover_value),              color: "#d97706", sub: `${metrics.slow_mover_count} SKUs · excess stock` },
    { label: "Recoverable Capital",          value: fmt(metrics.recoverable_capital),           color: "#059669", sub: "Via liquidation & reorder freeze" },
    { label: "Annual Carrying Cost",         value: fmt(metrics.annual_carrying_cost) + "/yr",  color: "#ea580c", sub: "25% holding rate" },
    { label: "Dead Stock Holding Cost",      value: fmt(metrics.dead_stock_carrying_cost)+"/yr",color: "#dc2626", sub: "Unproductive capital" },
    { label: "Inventory Turnover",           value: `${num(metrics.turnover_ratio)}×`,          color: metrics.turnover_ratio >= 4.5 ? "#059669" : "#ea580c", sub: "4.5× benchmark" },
    { label: "A-Class Revenue Share",        value: `${abc.a_revenue_pct}%`,                   color: abc.a_revenue_pct >= 65 ? "#059669" : "#d97706", sub: "65–70% target" },
  ];
  const finCardsHtml = finCards.map(c => `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
      <p style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">${esc(c.label)}</p>
      <p style="font-size:18px;font-weight:800;color:${c.color};margin:0 0 2px;font-variant-numeric:tabular-nums;">${esc(c.value)}</p>
      <p style="font-size:10px;color:#9ca3af;margin:0;">${esc(c.sub)}</p>
    </div>`).join("");

  // ── K. 3-year projection ───────────────────────────────────────────────────
  const projBars = [
    { yr: "Year 1", val: y1, color: "#6366f1", note: "Capital release + first-year savings" },
    { yr: "Year 2", val: y2, color: "#818cf8", note: "Year 1 + continued carrying savings" },
    { yr: "Year 3", val: y3, color: "#a5b4fc", note: "Compounded efficiency gain" },
  ];
  const projHtml = projBars.map(p => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;">
      <span style="font-size:13px;font-weight:800;color:#111827;">${fmt(p.val, true)}</span>
      <div style="width:64px;background:#f3f4f6;border-radius:6px 6px 0 0;height:80px;display:flex;align-items:flex-end;">
        <div style="width:100%;background:${p.color};height:${((p.val / maxY) * 80).toFixed(0)}px;border-radius:4px 4px 0 0;"></div>
      </div>
      <div style="text-align:center;">
        <p style="font-size:11px;font-weight:700;color:#374151;margin:0;">${p.yr}</p>
        <p style="font-size:9px;color:#9ca3af;margin:2px 0 0;max-width:80px;">${p.note}</p>
      </div>
    </div>`).join("");

  // ── L. Policy settings ────────────────────────────────────────────────────
  const policyHtml = ap ? (() => {
    const p = ap.policy;
    const fs = ap.field_sources;
    const srcColor = (src?: string) => src === "file" ? "#059669" : src === "user" ? "#6366f1" : "#9ca3af";
    const srcLabel = (src?: string) => src === "file" ? "File" : src === "user" ? "User" : "System Default";
    return [
      { name: "Slow Moving Threshold",  value: `${p.slow_moving_days} days`,       key: "slow_moving_days" },
      { name: "Dead Stock Threshold",   value: `${p.dead_stock_days} days`,         key: "dead_stock_days" },
      { name: "Critical Coverage Days", value: `${p.critical_coverage_days} days`,  key: "critical_coverage_days" },
      { name: "Safety Stock Days",      value: `${p.safety_stock_days} days`,       key: "safety_stock_days" },
      { name: "ABC A-Class Threshold",  value: `Top ${p.abc_a_pct}%`,               key: "abc_a_pct" },
      { name: "Weight — Dead Stock",    value: `${p.weight_dead_stock}%`,           key: "weight_dead_stock" },
      { name: "Weight — Slow Moving",   value: `${p.weight_slow_moving}%`,          key: "weight_slow_moving" },
      { name: "Weight — Stockout Risk", value: `${p.weight_stockout_risk}%`,        key: "weight_stockout_risk" },
      { name: "Weight — ABC Balance",   value: `${Math.max(0, 100 - p.weight_dead_stock - p.weight_slow_moving - p.weight_stockout_risk)}%`, key: "abc_a_pct" },
    ].map(r => {
      const src = (fs as Record<string, string | undefined>)[r.key];
      return `<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:8px 12px;font-size:12px;color:#374151;font-weight:500;">${esc(r.name)}</td>
        <td style="padding:8px 12px;font-size:12px;color:#6366f1;font-weight:700;text-align:right;">${esc(r.value)}</td>
        <td style="padding:8px 12px;font-size:11px;color:${srcColor(src)};font-weight:600;">${esc(srcLabel(src))}</td>
      </tr>`;
    }).join("");
  })() : "";

  const assumptions = [
    { name: "Annual Carrying Rate",     rate: "25%",  basis: "COGS % of inventory value",   std: "20–30%" },
    { name: "Dead Stock Recovery",      rate: "30%",  basis: "Liquidation market value",     std: "20–40%" },
    { name: "Slow Mover Reduction",     rate: "50%",  basis: "Target sell-down volume",      std: "25–75%" },
    { name: "Slow Mover Recovery Rate", rate: "65%",  basis: "Clearance pricing factor",     std: "55–75%" },
    { name: "WACC",                     rate: "12%",  basis: "Weighted avg cost of capital", std: "8–15%" },
  ];
  const assumHtml = assumptions.map(a => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 12px;font-size:12px;color:#374151;font-weight:500;">${esc(a.name)}</td>
      <td style="padding:8px 12px;font-size:12px;color:#6366f1;font-weight:700;text-align:right;">${esc(a.rate)}</td>
      <td style="padding:8px 12px;font-size:11px;color:#6b7280;">${esc(a.basis)}</td>
      <td style="padding:8px 12px;font-size:11px;color:#9ca3af;text-align:right;">${esc(a.std)}</td>
    </tr>`).join("");

  // ─────────────────────────────────────────────────────────────────────────
  // FULL HTML DOCUMENT
  // ─────────────────────────────────────────────────────────────────────────

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${companyName ? esc(companyName) + " — " : ""}SupplySense AI — Inventory Report — ${esc(generatedAt)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;background:#fff;color:#111827;font-size:13px;}
    #print-bar{position:fixed;top:0;left:0;right:0;z-index:100;background:#1e293b;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
    #print-bar span{font-size:12px;color:#94a3b8;}
    #print-bar button{display:inline-flex;align-items:center;gap:6px;padding:7px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;}
    #btn-print{background:#6366f1;color:#fff;}#btn-print:hover{background:#4f46e5;}
    #btn-close{background:#334155;color:#cbd5e1;}#btn-close:hover{background:#475569;}
    #report{max-width:900px;margin:0 auto;padding:76px 40px 60px;}
    .report-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #6366f1;padding-bottom:20px;margin-bottom:24px;}
    .brand-icon{width:36px;height:36px;background:#6366f1;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px;}
    .section{margin-bottom:28px;page-break-inside:avoid;}
    .section-header{display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e5e7eb;}
    .section-dot{width:10px;height:10px;border-radius:50%;background:#6366f1;flex-shrink:0;}
    .section-title{font-size:15px;font-weight:800;color:#111827;}
    .section-badge{margin-left:auto;font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;background:#ede9fe;color:#6366f1;border:1px solid #c4b5fd;}
    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
    .kpi-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
    table{width:100%;border-collapse:collapse;}
    thead th{padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;background:#f9fafb;border-bottom:2px solid #e5e7eb;}
    .proj-chart{display:flex;gap:20px;align-items:flex-end;padding:16px 0;justify-content:center;}
    .report-footer{margin-top:36px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;}
    .disclaimer{font-size:10px;color:#9ca3af;line-height:1.6;margin-top:14px;padding:10px 14px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;}
    .page-break{page-break-before:always;}
    @media print{
      #print-bar{display:none!important;}
      #report{padding:20px 30px 40px;}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .section{page-break-inside:avoid;}
    }
    @page{margin:1.5cm;size:A4;}
  </style>
</head>
<body>

<!-- Print bar -->
<div id="print-bar">
  <span>${companyName ? esc(companyName) + " &mdash; " : ""}SupplySense AI &mdash; Inventory Report &mdash; ${esc(generatedAt)}</span>
  <div style="display:flex;gap:8px;">
    <button id="btn-print" onclick="window.print()">&#128438; Save as PDF / Print</button>
    <button id="btn-close" onclick="window.close()">&#10005; Close</button>
  </div>
</div>

<div id="report">

<!-- ══════════════════════════════════════════════════════
     REPORT HEADER
════════════════════════════════════════════════════════ -->
<div class="report-header">
  <div style="display:flex;align-items:center;gap:12px;">
    <div class="brand-icon">S</div>
    <div>
      <div style="font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.02em;">SupplySense AI</div>
      ${companyName ? `<div style="font-size:14px;font-weight:700;color:#374151;margin-top:1px;">${esc(companyName)}</div>` : ""}
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">Inventory Intelligence Report</div>
    </div>
  </div>
  <div style="text-align:right;font-size:11px;color:#6b7280;line-height:1.8;">
    ${companyName ? `<div style="font-size:13px;font-weight:700;color:#111827;">${esc(companyName)}</div>` : ""}
    <div><strong style="color:#374151;">Inventory Intelligence Report</strong></div>
    <div>Source: ${esc(sourceFile)}</div>
    <div>Generated: ${esc(generatedAt)}</div>
    <div>${metrics.total_skus.toLocaleString()} SKUs &bull; ${esc(metrics.analysis_mode.toUpperCase())} mode</div>
    <div style="margin-top:4px;font-size:10px;color:#9ca3af;font-weight:600;">CONFIDENTIAL &mdash; INTERNAL USE ONLY</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     EXECUTIVE SUMMARY BANNER
════════════════════════════════════════════════════════ -->
<div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:18px 22px;margin-bottom:26px;display:flex;gap:20px;align-items:flex-start;">
  <div style="flex-shrink:0;width:72px;height:72px;border-radius:14px;background:${hColor}18;border:2px solid ${hColor}30;display:flex;flex-direction:column;align-items:center;justify-content:center;">
    <span style="font-size:22px;font-weight:800;color:${hColor};line-height:1;">${score}</span>
    <span style="font-size:10px;font-weight:700;color:${hColor};margin-top:2px;">${hLabel}</span>
  </div>
  <div style="flex:1;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#7c3aed;margin-bottom:4px;">Executive Summary</div>
    <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:8px;">${esc(summary.health_overview.headline)}</div>
    <div style="font-size:12px;color:#4b5563;line-height:1.65;">${esc(summary.health_overview.body)}</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 1 — PORTFOLIO OVERVIEW
════════════════════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-dot" style="background:#6366f1;"></div>
    <span class="section-title">1. Portfolio Overview</span>
    <span class="section-badge">${metrics.total_skus} SKUs &bull; ${fmt(metrics.total_inventory_value, true)} portfolio</span>
  </div>

  <!-- Portfolio KPI tiles -->
  <div class="kpi-grid" style="margin-bottom:18px;">
    ${[
      { label:"Total Inventory Value",   value:fmt(metrics.total_inventory_value),    sub:`${metrics.total_skus} SKUs on hand`,                      color:"#111827" },
      { label:"Capital at Risk",         value:fmt(metrics.dead_stock_value+metrics.slow_mover_value,true), sub:`${metrics.dead_stock_count+metrics.slow_mover_count} problem SKUs`, color:"#d97706" },
      { label:"Recoverable Capital",     value:fmt(metrics.recoverable_capital,true),  sub:"Via liquidation & action",                               color:"#059669" },
      { label:"Inventory Turnover",      value:`${num(metrics.turnover_ratio)}×`,      sub:metrics.turnover_ratio>=4.5?"✓ Above 4.5× benchmark":"↓ Below 4.5× benchmark", color:metrics.turnover_ratio>=4.5?"#059669":"#ea580c" },
    ].map(c=>`<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
      <p style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">${esc(c.label)}</p>
      <p style="font-size:20px;font-weight:800;color:${c.color};margin:0 0 3px;font-variant-numeric:tabular-nums;">${esc(c.value)}</p>
      <p style="font-size:10px;color:#9ca3af;margin:0;">${esc(c.sub)}</p>
    </div>`).join("")}
  </div>

  <!-- Risk Distribution — matches dashboard exactly -->
  <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:8px;">
    Inventory Status by Scenario — All counts match Dashboard KPI cards
  </p>
  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th style="text-align:right;">SKU Count</th>
        <th style="width:140px;">Distribution</th>
        <th style="text-align:right;">% of Portfolio</th>
        <th style="text-align:right;">Inventory Value</th>
        <th>Recommended Action</th>
      </tr>
    </thead>
    <tbody>${riskTableHtml}</tbody>
  </table>
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 2 — INVENTORY HEALTH SCORE
════════════════════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-dot" style="background:${hColor};"></div>
    <span class="section-title">2. Inventory Health Score Breakdown</span>
    <span class="section-badge" style="background:${hColor}18;color:${hColor};border-color:${hColor}40;">${score}/100 &bull; ${hLabel}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Health Factor</th>
        <th style="text-align:center;width:70px;">Weight</th>
        <th style="width:100px;">Component Score</th>
        <th style="text-align:center;width:80px;">Score /100</th>
        <th style="text-align:right;width:90px;">Contribution</th>
        <th>Data Basis</th>
      </tr>
    </thead>
    <tbody>${hcHtml}</tbody>
  </table>
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 3 — STOCKOUT RISK ITEMS  (Critical — matches KPI card)
════════════════════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-dot" style="background:#dc2626;"></div>
    <span class="section-title">3. Stockout Risk Items</span>
    <span class="section-badge" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5;">
      ${metrics.stockout_risk_count} item${metrics.stockout_risk_count !== 1 ? "s" : ""} &bull; matches Dashboard KPI
    </span>
  </div>
  <p style="font-size:11px;color:#6b7280;margin-bottom:12px;line-height:1.6;">
    Items classified as <strong>CRITICAL</strong> — projected to reach zero stock before the next replenishment cycle completes.
    Count shown here (${metrics.stockout_risk_count}) is identical to the Stockout Risk KPI on the main dashboard.
  </p>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Product Name</th>
        <th style="text-align:center;">ABC</th>
        <th style="text-align:right;">Days Remaining</th>
        <th style="text-align:right;">Lead Time</th>
        <th style="text-align:right;">EOQ Order Qty</th>
        <th style="text-align:right;">Revenue at Risk</th>
      </tr>
    </thead>
    <tbody>${criticalHtml}</tbody>
  </table>

  ${watchItems.length > 0 ? `
  <div style="margin-top:16px;">
    <p style="font-size:11px;font-weight:700;color:#2563eb;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">
      Watch List — ${watchItems.length} SKU${watchItems.length !== 1 ? "s" : ""} approaching reorder threshold
    </p>
    <table>
      <thead>
        <tr>
          <th>SKU</th>
          <th>Product Name</th>
          <th style="text-align:center;">ABC</th>
          <th style="text-align:right;">Days Cover</th>
          <th style="text-align:right;">Lead Time</th>
        </tr>
      </thead>
      <tbody>${watchHtml}</tbody>
    </table>
  </div>` : ""}
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 4 — DEAD STOCK  (matches KPI card)
════════════════════════════════════════════════════════ -->
<div class="section page-break">
  <div class="section-header">
    <div class="section-dot" style="background:#9333ea;"></div>
    <span class="section-title">4. Dead Stock Analysis</span>
    <span class="section-badge" style="background:#f3e8ff;color:#6b21a8;border-color:#d8b4fe;">
      ${metrics.dead_stock_count} SKU${metrics.dead_stock_count !== 1 ? "s" : ""} &bull; ${fmt(metrics.dead_stock_value, true)} &bull; matches Dashboard KPI
    </span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
    ${[
      {label:"Dead Stock Value",    value:fmt(metrics.dead_stock_value),         color:"#9333ea"},
      {label:"Annual Holding Cost", value:fmt(metrics.dead_stock_carrying_cost)+"/yr", color:"#dc2626"},
      {label:"Recovery Potential",  value:fmt(deadRecovery,true)+" (30%)",       color:"#059669"},
    ].map(c=>`<div style="background:#f9f7ff;border:1px solid #e9d5ff;border-radius:10px;padding:12px 14px;">
      <p style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px;">${esc(c.label)}</p>
      <p style="font-size:16px;font-weight:800;color:${c.color};margin:0;">${esc(c.value)}</p>
    </div>`).join("")}
  </div>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Product Name</th>
        <th style="text-align:center;">ABC</th>
        <th style="text-align:right;">Inventory Value</th>
        <th style="text-align:right;">Holding Cost/yr</th>
        <th style="text-align:right;">Qty on Hand</th>
      </tr>
    </thead>
    <tbody>${deadHtml}</tbody>
  </table>
  <p style="font-size:11px;color:#6b7280;margin-top:10px;">
    Recommendation: Initiate liquidation via clearance channels, returns-to-vendor, or write-off. Suspend all replenishment orders immediately.
  </p>
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 5 — SLOW MOVING STOCK  (matches KPI card)
════════════════════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-dot" style="background:#d97706;"></div>
    <span class="section-title">5. Slow Moving Stock</span>
    <span class="section-badge" style="background:#fef3c7;color:#92400e;border-color:#fde68a;">
      ${metrics.slow_mover_count} SKU${metrics.slow_mover_count !== 1 ? "s" : ""} &bull; ${fmt(metrics.slow_mover_value, true)} &bull; matches Dashboard KPI
    </span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
    ${[
      {label:"Slow Mover Value",    value:fmt(metrics.slow_mover_value),         color:"#d97706"},
      {label:"Recovery Potential",  value:fmt(slowRecovery,true)+" (50% selldown)", color:"#059669"},
      {label:"Threshold Applied",   value:`${ap?.policy.slow_moving_days ?? 180} days`, color:"#6366f1"},
    ].map(c=>`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;">
      <p style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px;">${esc(c.label)}</p>
      <p style="font-size:16px;font-weight:800;color:${c.color};margin:0;">${esc(c.value)}</p>
    </div>`).join("")}
  </div>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Product Name</th>
        <th style="text-align:center;">ABC</th>
        <th style="text-align:right;">Days Stock Cover</th>
        <th style="text-align:right;">Inventory Value</th>
        <th style="text-align:right;">Excess Value</th>
      </tr>
    </thead>
    <tbody>${slowHtml}</tbody>
  </table>
  <p style="font-size:11px;color:#6b7280;margin-top:10px;">
    Recommendation: Deploy targeted promotions, bundle offers, or halt replenishment orders to reduce excess without requiring write-offs.
  </p>
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 6 — ABC CLASSIFICATION
════════════════════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-dot" style="background:#059669;"></div>
    <span class="section-title">6. ABC Classification & Purchasing Priority</span>
    <span class="section-badge" style="background:#d1fae5;color:#065f46;border-color:#a7f3d0;">
      A: ${abc.a_revenue_pct}% &bull; B: ${abc.b_revenue_pct}% &bull; C: ${abc.c_revenue_pct}% of inventory value
    </span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:60px;">Class</th>
        <th style="text-align:right;width:100px;">SKU Count</th>
        <th style="width:200px;">Value Share</th>
        <th>Purchasing Guideline</th>
      </tr>
    </thead>
    <tbody>${abcHtml}</tbody>
  </table>
  ${aClassAtRisk.length > 0 ? `
  <div style="margin-top:14px;padding:12px 14px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;">
    <p style="font-size:11px;font-weight:700;color:#dc2626;margin:0 0 6px;">
      &#9888; ${aClassAtRisk.length} A-Class item${aClassAtRisk.length !== 1 ? "s" : ""} flagged at risk — highest priority for replenishment
    </p>
    <p style="font-size:11px;color:#6b7280;margin:0;">
      ${aClassAtRisk.map(s => esc(s.product_name)).slice(0, 5).join(" · ")}${aClassAtRisk.length > 5 ? ` · +${aClassAtRisk.length - 5} more` : ""}
    </p>
  </div>` : ""}
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 7 — FINANCIAL IMPACT
════════════════════════════════════════════════════════ -->
<div class="section page-break">
  <div class="section-header">
    <div class="section-dot" style="background:#059669;"></div>
    <span class="section-title">7. Financial Impact &amp; Recovery Opportunity</span>
    <span class="section-badge" style="background:#d1fae5;color:#065f46;border-color:#a7f3d0;">3-yr opportunity: ${fmt(y3, true)}</span>
  </div>
  <div class="kpi-grid" style="margin-bottom:20px;">${finCardsHtml}</div>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;">
    <p style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">3-Year Cumulative Benefit Projection</p>
    <p style="font-size:10px;color:#9ca3af;margin-bottom:16px;">Based on capital release + annual carrying cost savings at 25% holding rate</p>
    <div class="proj-chart">${projHtml}</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 8 — KEY RISKS
════════════════════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-dot" style="background:#dc2626;"></div>
    <span class="section-title">8. Key Risks</span>
    <span class="section-badge" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5;">
      ${summary.key_risks.filter(r => r.severity === "critical" || r.severity === "high").length} high priority
    </span>
  </div>
  ${risksHtml}
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 9 — RECOMMENDED ACTIONS
════════════════════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-dot" style="background:#d97706;"></div>
    <span class="section-title">9. Recommended Actions</span>
    <span class="section-badge" style="background:#fef3c7;color:#92400e;border-color:#fde68a;">
      ${summary.recommended_actions.length} actions
    </span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th>Action &amp; Rationale</th>
        <th style="text-align:center;width:100px;">Timeline</th>
        <th style="text-align:center;width:100px;">Owner</th>
        <th style="text-align:left;width:160px;">Expected Impact</th>
      </tr>
    </thead>
    <tbody>${actionsHtml}</tbody>
  </table>
</div>

<!-- ══════════════════════════════════════════════════════
     SECTION 10 — ASSUMPTIONS & POLICY
════════════════════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-dot" style="background:#6b7280;"></div>
    <span class="section-title">10. Assumptions, Policy &amp; Methodology</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Financial Assumption</th>
        <th style="text-align:right;width:60px;">Rate</th>
        <th>Basis</th>
        <th style="text-align:right;width:100px;">Industry Std.</th>
      </tr>
    </thead>
    <tbody>
      ${assumHtml}
      ${ap ? `<tr style="background:#f8fafc;border-top:2px solid #e5e7eb;">
        <td colspan="4" style="padding:10px 12px;font-size:12px;font-weight:700;color:#374151;">Analysis Policy Settings</td>
      </tr>${policyHtml}` : ""}
    </tbody>
  </table>
  <div class="disclaimer">
    <strong>Disclaimer:</strong> All figures are estimates derived from uploaded inventory data using the assumptions documented above.
    SKU counts in Sections 3, 4, and 5 are derived directly from dashboard metrics to ensure consistency with KPI cards.
    Actual results depend on liquidation channels, market conditions, and execution capability.
    This report is provided for planning and decision-support purposes only and does not constitute financial advice.
  </div>
</div>

<!-- Footer -->
<div class="report-footer">
  <span>SupplySense AI &mdash; Inventory Intelligence Platform</span>
  <span>Generated ${esc(generatedAt)} &bull; ${esc(sourceFile)}</span>
  <span>CONFIDENTIAL &mdash; ${metrics.total_skus} SKUs analyzed</span>
</div>

</div><!-- /#report -->

</body>
</html>`;
}

// ─── Public helper: open in new window ───────────────────────────────────────

export function openHtmlReport(
  metrics: DashboardMetrics,
  summary: ExecutiveSummary,
  sourceFile = "Inventory dataset",
  companyName = ""
): void {
  const html     = generateHtmlReport(metrics, summary, sourceFile, companyName);
  const blob     = new Blob([html], { type: "text/html;charset=utf-8" });
  const url      = URL.createObjectURL(blob);
  const dateStr  = new Date().toISOString().split("T")[0];
  const orgSlug  = companyName ? companyName.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-") + "-" : "";
  const filename = `${orgSlug}SupplySense-Report-${dateStr}.html`;
  const win      = window.open(url, "_blank", "width=1100,height=900,scrollbars=yes,resizable=yes");
  if (!win) {
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
