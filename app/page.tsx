import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { DemoButton } from "@/components/landing/DemoButton";

function Navbar() {
  return (
    <nav className="nav-glass fixed top-0 left-0 right-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontFamily: "Syne, sans-serif" }}>S</span>
          </div>
          <span className="font-semibold text-white text-sm" style={{ fontFamily: "Syne, sans-serif" }}>SupplySense</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <span className="text-slate-700">|</span>
          <Link href="/login" className="hover:text-white transition-colors">Try it free</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function ProblemSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-medium text-red-400 uppercase tracking-widest mb-4 block">
              The $1.1 trillion problem
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: "Syne, sans-serif" }}>
              82% of US manufacturers run supply chain on Excel.
            </h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Stockouts halt production. Dead stock locks up capital for years. Carrying costs eat 25% of
              inventory value annually. And the tools that solve this - SAP, Oracle - start at $50,000
              just for implementation.
            </p>
            <p className="text-slate-400 leading-relaxed">
              SupplySense Inventory Intelligence Suite brings commercial-grade inventory intelligence
              to growing manufacturers. No ERP. No consultant. No 6-month onboard.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { stat: "$1.1T", desc: "Annual US SME inventory losses", color: "border-red-500/20 bg-red-500/5" },
              { stat: "82%", desc: "US SMEs use Excel - no inventory intelligence", color: "border-amber-500/20 bg-amber-500/5" },
              { stat: "18%", desc: "Of inventory is dead stock on average", color: "border-purple-500/20 bg-purple-500/5" },
              { stat: "25%", desc: "Annual carrying cost of inventory", color: "border-blue-500/20 bg-blue-500/5" },
            ].map((p) => (
              <div key={p.stat} className={`card p-5 border ${p.color}`}>
                <div className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "Syne, sans-serif" }}>{p.stat}</div>
                <div className="text-xs text-slate-500 leading-snug">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-24 px-4" style={{ background: "rgba(15, 23, 42, 0.3)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-medium text-[#818cf8] uppercase tracking-widest mb-4 block">How it works</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
            Three steps. Under 5 minutes.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Upload", desc: "Drag your existing inventory Excel or CSV. No reformatting. SupplySense auto-maps your column names.", color: "text-[#818cf8]" },
            { step: "02", title: "Analyze", desc: "8 analytics modules run in under 60 seconds. Health score, dead stock, ABC class, stockout risk - all computed.", color: "text-emerald-400" },
            { step: "03", title: "Act", desc: "View your live dashboard, download the executive brief, export the PO draft. Every insight has a next action.", color: "text-amber-400" },
          ].map((s) => (
            <div key={s.step} className="card p-6">
              <div className={`text-4xl font-bold ${s.color} mb-4 opacity-50`} style={{ fontFamily: "Syne, sans-serif" }}>{s.step}</div>
              <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: "Syne, sans-serif" }}>{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="card p-12 border-[#6366f1]/20 bg-[#6366f1]/5">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "Syne, sans-serif" }}>
            See your{" "}
            <span className="gradient-text">$1.02M</span>
            {" "}today.
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Upload your inventory file and get a complete inventory analysis in under 60 seconds.
            No credit card. No sign-up friction. Just answers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium transition-all duration-200 shadow-lg">
              <Upload className="w-4 h-4" />
              Upload your inventory
              <ArrowRight className="w-4 h-4" />
            </Link>
            <DemoButton variant="cta" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#6366f1] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold" style={{ fontFamily: "Syne, sans-serif" }}>S</span>
          </div>
          <span className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>SupplySense</span>
        </div>
        <p className="text-xs text-slate-600 text-center">
          SupplySense Inventory Intelligence Suite · Commercial product foundation · {year}
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>SOC 2 (in progress)</span>
          <span>·</span>
          <span>GDPR Ready</span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <ProblemSection />
        <HowItWorks />
        <Features />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
