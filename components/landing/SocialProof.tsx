const STATS = [
  { value: "$1.1T",  label: "Annual US SME inventory losses", sub: "McKinsey, 2023" },
  { value: "82%",    label: "SMEs still use Excel for inventory", sub: "No AI analytics layer" },
  { value: "60 sec", label: "Time to first insight", sub: "From upload to dashboard" },
  { value: "10×",    label: "Cheaper than SAP/Oracle", sub: "Starting at $299/month" },
];

export function SocialProof() {
  return (
    <section className="py-16 px-4 border-y border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden">
          {STATS.map((s) => (
            <div key={s.value} className="bg-[#020617] px-6 py-8 text-center">
              <div className="font-display text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm font-medium text-slate-300 mb-1">{s.label}</div>
              <div className="text-xs text-slate-600">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
