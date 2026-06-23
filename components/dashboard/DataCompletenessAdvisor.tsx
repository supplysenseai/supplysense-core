"use client";
import { useState } from "react";
import { CheckCircle2, Square, Download, ChevronDown, ChevronUp, Lightbulb, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompletenessResult } from "@/lib/data-completeness";
import { downloadEnhancedTemplate } from "@/lib/data-completeness";

interface DataCompletenessAdvisorProps {
  result: CompletenessResult;
  compact?: boolean; // compact mode for ValidationProgress
}

const GROUP_LABELS = {
  required:      { label: "Required",     color: "text-slate-400"  },
  operational:   { label: "Operational",  color: "text-blue-400"   },
  intelligence:  { label: "Intelligence", color: "text-purple-400" },
};

export function DataCompletenessAdvisor({ result, compact = false }: DataCompletenessAdvisorProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    downloadEnhancedTemplate();
    setTimeout(() => setDownloading(false), 1500);
  };

  const scoreColor =
    result.score >= 86 ? "text-emerald-400" :
    result.score >= 61 ? "text-blue-400" :
    result.score >= 31 ? "text-amber-400" :
    "text-red-400";

  const barColor =
    result.score >= 86 ? "bg-emerald-500" :
    result.score >= 61 ? "bg-blue-500" :
    result.score >= 31 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="card overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/2 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[#6366f1]/15 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-[#818cf8]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">Data Completeness Advisor</span>
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full border",
              result.score >= 86 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              result.score >= 61 ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
              result.score >= 31 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-red-500/10 text-red-400 border-red-500/20"
            )}>
              {result.tier_label}
            </span>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", barColor)}
                style={{ width: `${result.score}%` }}
              />
            </div>
            <span className={cn("text-xs font-bold tabular-nums flex-shrink-0", scoreColor)}>
              {result.score}/100
            </span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
        }
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="border-t border-white/5">
          <div className="px-5 py-4 space-y-4">

            {/* Current capabilities */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Unlock className="w-3 h-3 text-emerald-400" />
                <p className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider">
                  Current Analysis Capability
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.current_capabilities.slice(0, compact ? 6 : 100).map((cap) => (
                  <span
                    key={cap}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/8 border border-emerald-500/15 text-emerald-300"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {cap}
                  </span>
                ))}
                {compact && result.current_capabilities.length > 6 && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-500">
                    +{result.current_capabilities.length - 6} more
                  </span>
                )}
              </div>
            </div>

            {/* Missing field advice */}
            {result.missing_advice.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <p className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
                    Additional Insights Available If You Provide
                  </p>
                </div>
                <div className="space-y-2">
                  {result.missing_advice.map(({ field, unlocks }) => (
                    <div
                      key={field.canonical}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-white/2 border border-white/5 hover:border-white/8 transition-colors"
                    >
                      <Square className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-white">{field.label}</span>
                          <span className={cn(
                            "text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider",
                            GROUP_LABELS[field.group].color,
                            "bg-white/5"
                          )}>
                            {GROUP_LABELS[field.group].label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 mb-1.5">{field.description} · e.g. {field.example}</p>
                        <div className="flex flex-wrap gap-1">
                          {unlocks.map((u) => (
                            <span key={u} className="text-[10px] px-1.5 py-0.5 rounded bg-[#6366f1]/10 text-[#818cf8] border border-[#6366f1]/15">
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-600 flex-shrink-0">+{field.weight}pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All fields present — celebration state */}
            {result.missing_advice.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-emerald-300">All analytical fields detected!</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Your file enables the full Complete Intelligence analysis.</p>
                </div>
              </div>
            )}

            {/* Download enhanced template */}
            {result.missing_advice.length > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Want to unlock all insights?</p>
                  <p className="text-[10px] text-slate-600">Download our enhanced template with all supported columns.</p>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#6366f1]/15 hover:bg-[#6366f1]/25 border border-[#6366f1]/25 text-[#818cf8] hover:text-white text-xs font-medium transition-colors flex-shrink-0 ml-4 disabled:opacity-60"
                >
                  <Download className="w-3 h-3" />
                  {downloading ? "Downloading…" : "Enhanced Template"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
