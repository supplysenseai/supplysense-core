"use client";
/**
 * DemoBanner - product walkthrough guide
 * Fixed bottom bar visible only in demo mode.
 * Narrates the product workflow across 3 steps.
 */
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Play, ChevronRight, X } from "lucide-react";
import { isDemoMode } from "@/lib/demo-loader";
import { cn } from "@/lib/utils";
import { Event2ActLogo } from "@/components/brand/Event2ActLogo";

// ── Story definition ────────────────────────────────────────────────────────

const STEPS = [
  {
    step: 1,
    route:     "/dashboard",
    label:     "Dashboard Overview",
    headline:  "200 SKUs analyzed in under 5 seconds.",
    body:      "10 critical stockout risks · $469K dead stock · $1.02M recoverable capital - visible the moment data loads.",
    cta:       "View Insights",
    nextRoute: "/dashboard/insights",
    color:     "#ef4444",
    dotColor:  "bg-red-400",
  },
  {
    step: 2,
    route:     "/dashboard/insights",
    label:     "Executive Brief",
    headline:  "Boardroom-ready report generated automatically.",
    body:      "Risk analysis, recommended actions, and financial exposure - presented for CEO, Supply Chain, and Procurement audiences.",
    cta:       "See Financial Impact",
    nextRoute: "/dashboard/financial-impact",
    color:     "#818cf8",
    dotColor:  "bg-[#818cf8]",
  },
  {
    step: 3,
    route:     "/dashboard/financial-impact",
    label:     "Financial Impact",
    headline:  "$1.02M total financial opportunity - 3-year horizon.",
    body:      "CFO-ready scenario analysis: recoverable capital, carrying cost savings, and working capital improvement - no ERP required.",
    cta:       "Back to Dashboard",
    nextRoute: "/dashboard",
    color:     "#10b981",
    dotColor:  "bg-emerald-400",
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function DemoBanner() {
  const router   = useRouter();
  const pathname = usePathname();
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [entering,  setEntering]  = useState(true);

  useEffect(() => {
    if (isDemoMode() && !dismissed) {
      setVisible(true);
      setTimeout(() => setEntering(false), 50);
    }
  }, [dismissed]);

  if (!visible || dismissed) return null;

  const current = STEPS.find(s => pathname.startsWith(s.route) &&
    // prefer more specific match
    STEPS.filter(x => pathname.startsWith(x.route)).sort((a,b) => b.route.length - a.route.length)[0]?.step === s.step
  ) ?? STEPS[0];

  const handleNext = () => {
    router.push(current.nextRoute);
  };

  const handleDismiss = () => {
    setEntering(true);
    setTimeout(() => setDismissed(true), 300);
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300",
        entering ? "translate-y-full" : "translate-y-0"
      )}
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Accent line on top */}
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${current.color}, transparent)` }} />

      <div style={{ background: "rgba(10,14,26,0.97)", backdropFilter: "blur(16px)" }}
        className="border-t border-white/8 px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center gap-4 flex-wrap md:flex-nowrap">

          {/* Brand pill */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 flex items-center justify-center">
              <Event2ActLogo variant="icon" width={28} height={28} />
            </div>
            <span className="text-[10px] font-bold text-[#818cf8] uppercase tracking-widest hidden sm:block">
              Live Demo
            </span>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {STEPS.map(s => (
              <button
                key={s.step}
                onClick={() => router.push(s.route)}
                className={cn(
                  "transition-all duration-300",
                  s.step === current.step
                    ? "w-5 h-2 rounded-full"
                    : "w-2 h-2 rounded-full opacity-30 hover:opacity-60"
                )}
                style={{ background: s.step === current.step ? current.color : "#94a3b8" }}
                title={`Step ${s.step}: ${s.label}`}
              />
            ))}
            <span className="text-[10px] text-slate-600 ml-1 font-medium">
              {current.step}/{STEPS.length}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-white/8 flex-shrink-0 hidden sm:block" />

          {/* Step label */}
          <div className="flex-shrink-0 hidden md:block">
            <span className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: current.color }}>
              Step {current.step} — {current.label}
            </span>
          </div>

          {/* Narrative */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{current.headline}</p>
            <p className="text-[10px] text-slate-500 truncate hidden sm:block">{current.body}</p>
          </div>

          {/* CTA + Close */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-150 hover:opacity-90 hover:-translate-y-px"
              style={{ background: current.color }}
            >
              {current.cta}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-colors"
              title="Exit demo guide"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Demo mode toast (shown once on first dashboard visit) ────────────────────

export function DemoWelcomeToast() {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!isDemoMode()) return;
    const seen = sessionStorage.getItem("demo_toast_seen");
    if (seen) return;
    sessionStorage.setItem("demo_toast_seen", "true");
    const t1 = setTimeout(() => setShow(true), 400);
    const t2 = setTimeout(() => dismiss(), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => setShow(false), 350);
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed top-14 right-4 z-50 transition-all duration-350",
        exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
      )}
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="rounded-xl border border-emerald-500/25 bg-[#0f1a14] shadow-2xl shadow-black/50 overflow-hidden w-72">
        {/* Green progress bar */}
        <div className="h-0.5 bg-emerald-500/30">
          <div className="h-full bg-emerald-400 animate-[shrink_5.2s_linear_forwards]" style={{ transformOrigin: "left" }} />
        </div>
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold text-white">Analysis complete</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">4.8s</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Acme Manufacturing · 200 SKUs
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/15">
                  10 critical alerts
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/15">
                  $469K dead stock
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                  $1.02M recoverable
                </span>
              </div>
            </div>
            <button onClick={dismiss} className="text-slate-700 hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
