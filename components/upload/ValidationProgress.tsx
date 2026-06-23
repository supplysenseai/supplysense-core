"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle, AlertTriangle, FileSpreadsheet, RefreshCw, ArrowRight, Brain, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { UploadResult, AnalysisMode } from "@/lib/types";
import { MODE_LABELS, MODE_DESCRIPTIONS } from "@/lib/analysis-detector";
import { computeCompleteness } from "@/lib/data-completeness";
import { DataCompletenessAdvisor } from "@/components/dashboard/DataCompletenessAdvisor";

const STEPS = [
  "Uploading file",
  "Parsing columns",
  "Validating data",
  "Running AI analysis",
  "Generating insights",
];

interface ValidationProgressProps {
  filename: string;
  fileSize: number;
  step: number;        // 0-4 = current step index, 5 = done, -1 = error
  progress: number;    // 0-100
  result: UploadResult | null;
  onReset: () => void;
  analysisMode?: AnalysisMode;
  detectedFields?: string[];
}

const REDIRECT_DELAY = 4; // seconds before auto-redirect to dashboard

const MODE_COLORS: Record<AnalysisMode, { badge: string; icon: string }> = {
  health:   { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: "text-emerald-400" },
  aging:    { badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",          icon: "text-blue-400" },
  complete: { badge: "bg-[#6366f1]/10 text-[#818cf8] border-[#6366f1]/20",       icon: "text-[#818cf8]" },
};

export function ValidationProgress({
  filename,
  fileSize,
  step,
  progress,
  result,
  onReset,
  analysisMode,
  detectedFields = [],
}: ValidationProgressProps) {
  const isError = step === -1;
  const isDone  = step >= 5;
  const router  = useRouter();

  // Auto-redirect countdown after successful analysis
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);

  // Tick the countdown — no side effects inside the updater
  useEffect(() => {
    if (!isDone || !result?.success) return;
    const id = setInterval(() => {
      setCountdown(c => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isDone, result?.success]);

  // Navigate once the countdown reaches zero — separate from state update
  useEffect(() => {
    if (countdown === 0 && isDone && result?.success) {
      router.push("/dashboard");
    }
  }, [countdown, isDone, result?.success, router]);

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isError ? "bg-red-500/15" : isDone ? "bg-emerald-500/15" : "bg-white/5"
          )}>
            <FileSpreadsheet className={cn(
              "w-4 h-4",
              isError ? "text-red-400" : isDone ? "text-emerald-400" : "text-slate-400"
            )} />
          </div>
          <div>
            <div className="text-sm font-medium text-white truncate max-w-[240px]">{filename}</div>
            <div className="text-[11px] text-slate-500">{(fileSize / 1024).toFixed(0)} KB</div>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {isError ? "Failed" : isDone ? "Complete" : "Processing…"}
        </div>
      </div>

      {/* Progress bar */}
      {!isError && (
        <div className="px-4 pt-3">
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps list */}
      <div className="p-4 space-y-2.5">
        {STEPS.map((label, i) => {
          const isCurrentStep = step === i;
          const isCompleted = step > i || isDone;
          const isPending = step < i;
          return (
            <div key={label} className="flex items-center gap-3">
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : isCurrentStep && !isError ? (
                <Loader2 className="w-3.5 h-3.5 text-[#818cf8] flex-shrink-0 animate-spin" />
              ) : isCurrentStep && isError ? (
                <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-white/12 flex-shrink-0" />
              )}
              <span className={cn(
                "text-xs",
                isCompleted ? "text-slate-300" : isCurrentStep ? "text-white" : "text-slate-600"
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {isError && result && result.errors.length > 0 && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-xs font-medium text-red-300">Upload failed</span>
          </div>
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-[11px] text-red-400/80">
                [{e.code}] {e.message}
              </li>
            ))}
          </ul>
          <button
            onClick={onReset}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-white text-xs transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        </div>
      )}

      {/* Success state */}
      {isDone && result?.success && (
        <>
          {/* Green header */}
          <div className="mx-4 mb-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">Analysis complete</span>
              <span className="ml-auto text-[11px] text-slate-500">
                {result.rows_valid} valid · {result.rows_flagged} flagged
              </span>
            </div>

            {/* Detected analysis mode badge */}
            {analysisMode && (
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border mb-3 text-[11px] font-medium",
                MODE_COLORS[analysisMode].badge
              )}>
                {analysisMode === "aging" ? (
                  <Clock className={cn("w-3 h-3 flex-shrink-0", MODE_COLORS[analysisMode].icon)} />
                ) : (
                  <Activity className={cn("w-3 h-3 flex-shrink-0", MODE_COLORS[analysisMode].icon)} />
                )}
                <span>Detected: {MODE_LABELS[analysisMode]}</span>
              </div>
            )}

            {/* Quick stats — adapt to analysis mode */}
            {result.metrics && (() => {
              const stats = analysisMode === "aging" ? [
                { label: "Ageing Score", value: `${result.metrics!.aging_metrics?.ageing_health_score ?? "—"}/100`, color: "text-blue-400" },
                { label: "Dead Stock", value: String(result.metrics!.aging_metrics?.dead_stock_count ?? 0), color: "text-red-400" },
                { label: "Blocked Capital", value: formatCurrency(result.metrics!.aging_metrics?.blocked_capital ?? 0, true), color: "text-amber-400" },
              ] : [
                { label: "Health Score", value: `${result.metrics!.health_score}/100`, color: result.metrics!.health_score >= 80 ? "text-emerald-400" : result.metrics!.health_score >= 60 ? "text-amber-400" : "text-red-400" },
                { label: "Critical Alerts", value: String(result.metrics!.critical_stockout_count), color: result.metrics!.critical_stockout_count > 0 ? "text-red-400" : "text-emerald-400" },
                { label: "Cash at Risk", value: formatCurrency(result.metrics!.recoverable_capital, true), color: "text-amber-400" },
              ];
              return (
                <div className="grid grid-cols-3 gap-1">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-white/4 rounded-lg p-2 text-center">
                      <div className={`text-sm font-semibold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="mx-4 mb-3 px-3 py-2 rounded-xl border border-amber-500/15 bg-amber-500/5">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] text-amber-400 font-medium">{result.warnings.length} data quality notes</span>
              </div>
              <ul className="space-y-0.5">
                {result.warnings.slice(0, 3).map((w, i) => (
                  <li key={i} className="text-[10px] text-slate-500 truncate">{w.message}</li>
                ))}
                {result.warnings.length > 3 && (
                  <li className="text-[10px] text-slate-600">+{result.warnings.length - 3} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Auto-redirect notice */}
          <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/6">
            <div className="w-5 h-5 rounded-full border-2 border-[#6366f1] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-[#818cf8]">{countdown}</span>
            </div>
            <span className="text-[11px] text-slate-500 flex-1">
              Redirecting to dashboard in {countdown}s…
            </span>
            <button onClick={() => router.push("/dashboard")}
              className="text-[11px] text-[#818cf8] hover:text-white transition-colors whitespace-nowrap">
              Go now →
            </button>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <Link href="/dashboard"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium transition-colors">
                View dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button onClick={onReset}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/6 hover:bg-white/10 text-white text-sm transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
                Upload another
              </button>
            </div>
            <Link href="/dashboard/insights"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/4 hover:bg-white/8 text-[#818cf8] hover:text-white text-xs font-medium border border-[#6366f1]/20 transition-colors">
              <Brain className="w-3.5 h-3.5" />
              Skip to AI Insights →
            </Link>
          </div>

        </>
      )}
    </div>
  );
}
