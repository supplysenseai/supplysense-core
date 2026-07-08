import Link from "next/link";
import { Check, Zap, Clock } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "$10",
    period: "/month",
    description: "For operations teams getting started with inventory intelligence.",
    badge: null,
    cta: "Start free trial",
    ctaHref: "/login",
    ctaStyle: "bg-white/6 hover:bg-white/10 border border-white/10 hover:border-white/20",
    features: [
      { text: "1 warehouse",                live: true  },
      { text: "Up to 3 users",              live: true  },
      { text: "5 uploads / month",          live: true  },
      { text: "Up to 5,000 SKUs",           live: true  },
      { text: "All 8 analytics modules",    live: true  },
      { text: "Executive insights",         live: true  },
      { text: "Reorder recommendations",    live: true  },
      { text: "Email support",              live: true  },
    ],
  },
  {
    name: "Growth",
    price: "$99",
    period: "/month",
    description: "For supply chain teams running weekly analysis.",
    badge: "Most Popular",
    cta: "Start free trial",
    ctaHref: "/login",
    ctaStyle: "bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/25",
    features: [
      { text: "Up to 5 warehouses",              live: true  },
      { text: "Up to 15 users",                  live: true  },
      { text: "Unlimited uploads",               live: true  },
      { text: "Up to 50,000 SKUs",               live: true  },
      { text: "Supply Chain Copilot",            live: false },
      { text: "ERP integrations",                live: false },
      { text: "Multi-warehouse analysis",        live: false },
      { text: "Priority support",                live: true  },
    ],
  },
  {
    name: "Enterprise",
    price: "On Request",
    period: "",
    description: "For enterprise operations with custom requirements.",
    badge: null,
    cta: "Contact sales",
    ctaHref: "/login",
    ctaStyle: "bg-white/6 hover:bg-white/10 border border-white/10 hover:border-white/20",
    features: [
      { text: "Unlimited warehouses",         live: true  },
      { text: "Unlimited users",              live: true  },
      { text: "Unlimited uploads & SKUs",     live: true  },
      { text: "Custom analytics models",      live: false },
      { text: "SSO + audit logs",             live: false },
      { text: "Dedicated CSM",                live: true  },
      { text: "99.9% SLA",                    live: true  },
      { text: "Custom contracts",             live: true  },
    ],
  },
];

export function Pricing() {
  return (
    <section className="py-24 px-4 bg-surface-950/50" id="pricing">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-medium text-brand-400 uppercase tracking-widest mb-4 block">
            Simple pricing
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            10x cheaper than SAP.
            <br />
            <span className="gradient-text">100x faster to value.</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Start with a free trial. No credit card required. Cancel any time.
            Annual billing saves 2 months.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative card p-6 flex flex-col ${plan.badge ? "border-brand-500/40 shadow-xl shadow-brand-500/10" : ""}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-brand-500 text-white">
                    <Zap className="w-3 h-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{plan.description}</p>
                <div className="flex items-end gap-1">
                  <span className="font-display text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-500 mb-1 text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    {f.live
                      ? <Check className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
                      : <Clock className="w-3.5 h-3.5 text-slate-600 mt-0.5 flex-shrink-0" />
                    }
                    <span className={f.live ? "text-slate-400" : "text-slate-600"}>
                      {f.text}
                      {!f.live && (
                        <span className="ml-1.5 text-[10px] font-medium text-slate-600 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded-full align-middle">
                          Planned
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`block text-center py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 mt-10">
          All plans include a 14-day free trial · No credit card required · Cancel any time
        </p>

        {/* Feature availability legend */}
        <div className="mt-8 max-w-2xl mx-auto p-4 rounded-xl bg-white/3 border border-white/6">
          <p className="text-xs font-semibold text-white mb-3 text-center">Feature availability today</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
            {[
              { text: "CSV upload & inventory parsing",        live: true  },
              { text: "Inventory Health Score (0-100)",       live: true  },
              { text: "Risk Heatmap (6 scenarios per SKU)",   live: true  },
              { text: "ABC Analysis + Pareto chart",          live: true  },
              { text: "Inventory Turnover benchmarks",        live: true  },
              { text: "Reorder recommendations (EOQ/ROP)",    live: true  },
              { text: "Executive insights narrative",         live: true  },
              { text: "Dead stock & slow mover detection",    live: true  },
              { text: "Ageing analysis (age-bucket reports)", live: true  },
              { text: "CSV report exports",                   live: true  },
              { text: "KPI explainability (info modals)",       live: true  },
              { text: "Multi-warehouse analysis",             live: false },
              { text: "ERP integrations (SAP / NetSuite)",    live: false },
              { text: "Supply Chain Copilot (chat)",          live: false },
              { text: "SSO / SAML authentication",            live: false },
              { text: "Custom analytics models",              live: false },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-2">
                {f.live
                  ? <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  : <Clock className="w-3 h-3 text-slate-600 flex-shrink-0" />
                }
                <span className={`text-[11px] ${f.live ? "text-slate-400" : "text-slate-600"}`}>
                  {f.text}
                  {!f.live && <span className="ml-1 text-slate-700">· planned</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
