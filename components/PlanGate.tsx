"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Zap } from "lucide-react";
import { getAuth, isModuleLocked, type Plan } from "@/lib/auth";

interface Props {
  moduleKey: string;
  requiredPlan?: string;
  children: React.ReactNode;
}

export function PlanGate({ moduleKey, requiredPlan = "Starter", children }: Props) {
  const [locked, setLocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const plan: Plan = auth?.plan ?? "free";
    setLocked(isModuleLocked(plan, moduleKey));
    setChecked(true);
  }, [moduleKey]);

  if (!checked) return null;

  if (!locked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#020617]">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-7 h-7 text-brand-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          {requiredPlan} Plan Required
        </h2>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          This module is not included in your current plan.
          Upgrade to <span className="text-white font-medium">{requiredPlan}</span> to unlock it and get full access to all 8 analytics modules.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <Zap className="w-4 h-4" />
            View Plans
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
