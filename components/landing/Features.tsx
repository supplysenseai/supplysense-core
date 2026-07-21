import { Zap, FileSpreadsheet, Brain, BarChart3, TrendingDown, AlertTriangle, ShoppingCart, DollarSign } from "lucide-react";

const FEATURES = [
  {
    icon: FileSpreadsheet,
    color: "text-brand-400",
    bg: "bg-brand-500/10",
    title: "Instant Excel Ingestion",
    desc: "Upload any .xlsx or .csv. SupplySense auto-maps 50+ column name variations - SKU, Item Code, Part Number all work. No reformatting, no templates.",
  },
  {
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    title: "Inventory Health Score",
    desc: "0-100 composite score across 4 weighted factors: dead stock %, slow mover %, stockout risk %, and A-item consumption value concentration. One number your CEO can present in any board meeting.",
  },
  {
    icon: TrendingDown,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    title: "Dead Stock Detection",
    desc: "Auto-flags SKUs with zero movement >=365 days (configurable). Shows capital locked, annual carry cost, and liquidation action per SKU.",
  },
  {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    title: "Stockout Risk Scores",
    desc: "Per-SKU risk score 0-100 using days-of-stock vs lead time + demand variance. Know which production line stops before it does.",
  },
  {
    icon: BarChart3,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    title: "ABC Analysis",
    desc: "Full Pareto classification: A-items drive 70% of Annual Consumption Value. Prioritize safety stock, reorder frequency, and management attention automatically.",
  },
  {
    icon: ShoppingCart,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    title: "EOQ Reorder Engine",
    desc: "Economic Order Quantity + 95% service level safety stock calculated per SKU. Urgency tiers: Order Now, This Week, This Month.",
  },
  {
    icon: Brain,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    title: "Executive Brief",
    desc: "Boardroom-ready narrative report generated from your data. Cites actual SKU IDs and dollar amounts. Export as a formatted HTML report in one click.",
  },
  {
    icon: DollarSign,
    color: "text-green-400",
    bg: "bg-green-500/10",
    title: "Working Capital Report",
    desc: "Recoverable cash breakdown for the CFO. Dead stock + slow mover excess quantified. Inventory Turnover vs industry benchmark included.",
  },
];

export function Features() {
  return (
    <section className="py-24 px-4" id="features">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-xs font-medium text-brand-400 uppercase tracking-widest mb-4 block">
            What you get in 60 seconds
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            8 analytics modules. One upload.
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Every insight includes a specific recommended action with financial justification.
            No charts for charts' sake.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card p-5 hover:border-white/12 transition-colors duration-200 group"
            >
              <div className={`w-9 h-9 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-brand-300 transition-colors">
                {f.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
