"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Zap } from "lucide-react";
import { loadDemoIntoSession } from "@/lib/demo-loader";

interface DemoButtonProps {
  variant?: "hero" | "cta";
}

export function DemoButton({ variant = "hero" }: DemoButtonProps) {
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const router = useRouter();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setLabel("Loading demo...");
    loadDemoIntoSession();
    router.push("/dashboard");
  };

  if (variant === "cta") {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#6366f1] hover:bg-[#5558e8] text-white font-semibold border border-[#6366f1]/50 transition-all duration-200 disabled:opacity-80 disabled:cursor-wait shadow-lg shadow-[#6366f1]/20"
      >
        {loading
          ? <Zap className="w-4 h-4 animate-pulse" />
          : <Play className="w-4 h-4 fill-current" />
        }
        {loading ? label : "Start Demo Mode"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:cursor-wait
        ${loading
          ? "bg-[#6366f1]/20 border border-[#6366f1]/40 text-[#818cf8]"
          : "bg-[#6366f1] hover:bg-[#5558e8] text-white border border-[#6366f1]/50 shadow-lg shadow-[#6366f1]/20 hover:shadow-[#6366f1]/30 hover:-translate-y-px active:translate-y-0"
        }`}
    >
      {loading
        ? <Zap className="w-4 h-4 animate-pulse" />
        : <Play className="w-4 h-4 fill-current" />
      }
      {loading ? label : "View Live Demo"}
    </button>
  );
}
