"use client";
import Link from "next/link";
import { ArrowRight, Upload, TrendingDown, AlertTriangle, BarChart3, Zap } from "lucide-react";
import { DemoButton } from "@/components/landing/DemoButton";

const MINI_STATS = [
  { label: "Health Score", value: "61/100", color: "text-amber-400", icon: Zap },
  { label: "Dead Stock", value: "$469K", color: "text-purple-300", icon: TrendingDown },
  { label: "Critical Alerts", value: "10", color: "text-red-400", icon: AlertTriangle },
  { label: "Recoverable", value: "$1.02M", color: "text-emerald-400", icon: BarChart3 },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-20 px-4">
      {/* Ambient glows */}
      <div className="hero-glow w-[600px] h-[600px] bg-indigo-600 -top-40 -left-40" />
      <div className="hero-glow w-[400px] h-[400px] bg-violet-600 top-20 right-0" />

      <div className="relative max-w-6xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            No ERP · No Setup · 60 Seconds
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-center text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6 tracking-tight">
          <span className="text-white">Supply chain intelligence</span>
          <br />
          <span className="gradient-text">in 60 seconds flat.</span>
        </h1>

        <p className="text-center text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your existing inventory spreadsheet. Get risk scores, dead stock analysis, ABC classification, reorder guidance, and an executive-ready brief — no ERP required.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5"
          >
            <Upload className="w-4 h-4" />
            Upload your inventory
            <ArrowRight className="w-4 h-4" />
          </Link>
          <DemoButton variant="hero" />
        </div>

        {/* Dashboard preview card */}
        <div className="relative max-w-4xl mx-auto">
          <div className="card p-4 shadow-2xl shadow-black/50">
            {/* Fake topbar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <span className="text-[11px] text-slate-500 font-mono">supplysense.ai/dashboard</span>
              <div className="w-16" />
            </div>

            {/* Alert banner */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-4 text-xs text-red-300">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <strong className="font-medium">10 critical alerts:</strong>
              <span className="text-red-300/80">Fuse 16A stockout in 3.4 days · Bearing 6205 in 6.4 days</span>
              <span className="ml-auto text-red-400/60 text-[10px] cursor-pointer">View all →</span>
            </div>

            {/* Mini KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {MINI_STATS.map((s) => (
                <div key={s.label} className="card-elevated p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span>
                    <s.icon className={`w-3 h-3 ${s.color}`} />
                  </div>
                  <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* ABC bar preview */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-slate-600 w-8">ABC</span>
              <div className="flex flex-1 h-2 rounded-full overflow-hidden gap-0.5">
                <div className="bg-indigo-500 h-full" style={{ width: "14%" }} />
                <div className="bg-blue-500 h-full" style={{ width: "26%" }} />
                <div className="bg-emerald-500 h-full" style={{ width: "60%" }} />
              </div>
              <span className="text-[10px] text-slate-500">28 A · 66 B · 106 C</span>
            </div>
          </div>

          {/* Floating labels */}
          <div className="absolute -left-4 top-12 hidden lg:block">
            <div className="card-elevated px-3 py-2 text-xs text-slate-300 whitespace-nowrap shadow-lg">
              ✓ 200 SKUs · 4.8s
            </div>
          </div>
          <div className="absolute -right-4 bottom-16 hidden lg:block">
            <div className="card-elevated px-3 py-2 text-xs text-emerald-300 whitespace-nowrap shadow-lg">
              $1.02M recoverable
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
