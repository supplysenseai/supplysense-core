"use client";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Moon, Sun, Briefcase } from "lucide-react";

const THEMES: {
  id: Theme;
  label: string;
  desc: string;
  icon: React.ElementType;
  preview: { page: string; card: string; accent: string; text: string };
}[] = [
  {
    id: "dark",
    label: "Executive Dark",
    desc: "Deep navy control-room theme for operations and low-light monitoring.",
    icon: Moon,
    preview: { page: "#020617", card: "#0f172a", accent: "#6366f1", text: "#94a3b8" },
  },
  {
    id: "light",
    label: "Executive Light",
    desc: "Soft office theme for finance, procurement, and daytime review.",
    icon: Sun,
    preview: { page: "#f1f5f9", card: "#ffffff", accent: "#6366f1", text: "#64748b" },
  },
  {
    id: "professional",
    label: "Executive Professional",
    desc: "Premium graphite theme for boardroom demos and commercial deployments.",
    icon: Briefcase,
    preview: { page: "#0d1117", card: "#161b22", accent: "#0ea5e9", text: "#8b949e" },
  },
];

interface ThemeSwitcherProps {
  /** "full" shows cards with description (Preferences page), "compact" shows icon buttons (topbar) */
  variant?: "full" | "compact";
}

export function ThemeSwitcher({ variant = "full" }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/8">
        {THEMES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTheme(id)}
            title={label}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              theme === id
                ? "bg-[#6366f1] text-white shadow-sm"
                : "text-slate-500 hover:text-white hover:bg-white/8"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {THEMES.map(({ id, label, desc, icon: Icon, preview }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            onClick={() => setTheme(id)}
            className={`relative flex flex-col gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
              active
                ? "border-[#6366f1]/60 bg-[#6366f1]/8 shadow-[0_0_0_1px_rgba(99,102,241,0.3)]"
                : "border-white/8 bg-white/2 hover:border-white/16 hover:bg-white/4"
            }`}
          >
            {/* Active ring */}
            {active && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#6366f1]" />
            )}

            {/* Mini preview */}
            <div
              className="w-full h-14 rounded-lg overflow-hidden border border-white/10 flex-shrink-0"
              style={{ background: preview.page }}
            >
              {/* Fake sidebar strip */}
              <div className="flex h-full">
                <div className="w-7 h-full border-r flex flex-col gap-1 pt-2 px-1"
                  style={{ background: preview.card, borderColor: "rgba(255,255,255,0.06)" }}>
                  {[1,2,3].map((i) => (
                    <div key={i} className="h-1 rounded-full"
                      style={{ background: i === 1 ? preview.accent : preview.text, opacity: i === 1 ? 1 : 0.3, width: i === 1 ? "80%" : "60%" }} />
                  ))}
                </div>
                {/* Fake content */}
                <div className="flex-1 p-1.5 flex flex-col gap-1">
                  <div className="flex gap-1">
                    {[1,2,3].map((i) => (
                      <div key={i} className="flex-1 h-4 rounded"
                        style={{ background: preview.card, border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="h-1 rounded-sm mx-1 mt-1"
                          style={{ background: i === 1 ? preview.accent : preview.text, opacity: 0.5 }} />
                      </div>
                    ))}
                  </div>
                  <div className="h-5 rounded" style={{ background: preview.card, border: "1px solid rgba(255,255,255,0.06)" }} />
                </div>
              </div>
            </div>

            {/* Label row */}
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                active ? "bg-[#6366f1]/20" : "bg-white/5"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${active ? "text-[#818cf8]" : "text-slate-500"}`} />
              </div>
              <span className={`text-sm font-semibold ${active ? "text-white" : "text-slate-300"}`}>
                {label}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
          </button>
        );
      })}
    </div>
  );
}
