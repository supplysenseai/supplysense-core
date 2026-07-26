"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, BarChart3, Eye, EyeOff, ShieldCheck, TrendingDown } from "lucide-react";
import { setAuth, getAuth, type Plan } from "@/lib/auth";
import { Event2ActLogo } from "@/components/brand/Event2ActLogo";

type Tab = "signin" | "signup";

const LOCAL_ACCESS_PLAN: Plan = "free";

const PREVIEW_METRICS = [
  { label: "Health Score", value: "61/100", icon: ShieldCheck, color: "text-amber-300" },
  { label: "Dead Stock", value: "$469K", icon: TrendingDown, color: "text-purple-300" },
  { label: "Critical Alerts", value: "10", icon: AlertTriangle, color: "text-red-300" },
  { label: "Recoverable", value: "$1.02M", icon: BarChart3, color: "text-emerald-300" },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAuth()) router.replace("/dashboard");
  }, [router]);

  function createLocalToken(email: string) {
    return btoa(email + ":ss-" + Date.now()).slice(0, 32);
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Built-in demo accounts
    const DEMO_ACCOUNTS = [
      { email: "abc",     password: "abc",     name: "ABC User",         plan: LOCAL_ACCESS_PLAN },
      { email: "tamkeen", password: "matco123", name: "Tamkeen Ahmed",   plan: LOCAL_ACCESS_PLAN },
    ];
    // Check demo accounts first, then localStorage accounts
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem("supplysense_accounts") ?? "[]"); } catch { return []; }
    })();
    const account =
      DEMO_ACCOUNTS.find((a) => a.email === email && a.password === password) ||
      stored.find((a: { email: string; password: string }) => a.email === email && a.password === password);
    if (!account) {
      setError("Invalid username or password.");
      setLoading(false);
      return;
    }
    setAuth({ email: account.email, name: account.name, plan: account.plan, token: createLocalToken(email) });
    router.replace("/dashboard");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter a username."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    // Save account to localStorage accounts list
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem("supplysense_accounts") ?? "[]"); } catch { return []; }
    })();
    if (stored.some((a: { email: string }) => a.email === email)) {
      setError("An account with this email already exists.");
      setLoading(false);
      return;
    }
    stored.push({ email, password, name, plan: LOCAL_ACCESS_PLAN });
    localStorage.setItem("supplysense_accounts", JSON.stringify(stored));
    setAuth({ email, name, plan: LOCAL_ACCESS_PLAN, token: createLocalToken(email) });
    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center gap-10 lg:justify-between">
        <section className="w-full max-w-[460px]">
          <Link href="/" className="mb-8 flex justify-center lg:justify-start">
            <Event2ActLogo
              variant="dark"
              width={3000}
              height={765}
              sizes="(max-width: 640px) 180px, 220px"
              priority
              className="h-auto w-[180px] sm:w-[220px]"
            />
          </Link>

          <div className="w-full">
            <div className="mb-5 flex rounded-xl border border-white/8 bg-white/[0.04] p-1">
              {(["signin", "signup"] as Tab[]).map((t) => (
                <button
                  key={t}
                  aria-label={t === "signin" ? "Show sign in form" : "Show create account form"}
                  onClick={() => { setTab(t); setError(""); }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    tab === t
                      ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
                      : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  {t === "signin" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <div className="card p-7 sm:p-8">
              {tab === "signin" ? (
                <form onSubmit={handleSignin} className="space-y-5">
                  <div className="space-y-1.5">
                    <h1 className="text-xl font-semibold text-white">Welcome back</h1>
                    <p className="text-sm text-slate-400">Sign in to your Event2Act AI workspace.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-400">Username</label>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-brand-500 focus:outline-none"
                      placeholder="Enter your username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-400">Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 pr-10 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-brand-500 focus:outline-none"
                        placeholder="••••••••"
                      />
                      <button type="button" aria-label={showPass ? "Hide password" : "Show password"} onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </button>

                  <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
                    Secure local authentication
                  </p>

                  <p className="text-xs text-center text-slate-500 pt-1">
                    No account?{" "}
                    <button type="button" onClick={() => setTab("signup")} className="text-brand-400 transition-colors hover:text-brand-300">
                      Create workspace access
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-1.5">
                    <h1 className="text-xl font-semibold text-white">Create your account</h1>
                    <p className="text-sm text-slate-400">Create a workspace profile. No payment details required.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs text-slate-400">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-brand-500 focus:outline-none"
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs text-slate-400">Username</label>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-brand-500 focus:outline-none"
                        placeholder="Choose a username"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs text-slate-400">Password</label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 pr-10 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-brand-500 focus:outline-none"
                          placeholder="At least 6 characters"
                        />
                        <button type="button" aria-label={showPass ? "Hide password" : "Show password"} onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                  >
                    {loading ? "Creating account..." : "Create Account & Continue"}
                  </button>

                  <p className="text-xs text-center text-slate-500 pt-1">
                    Already have an account?{" "}
                    <button type="button" onClick={() => setTab("signin")} className="text-brand-400 transition-colors hover:text-brand-300">
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </div>

            <p className="text-center text-xs text-slate-600 mt-6">
              By continuing, you agree to our{" "}
              <span className="text-slate-500">Terms of Service</span> and{" "}
              <span className="text-slate-500">Privacy Policy</span>.
            </p>
          </div>
        </section>

        <aside className="relative hidden w-full max-w-[520px] lg:block">
          <div className="absolute -inset-6 rounded-[2rem] bg-brand-500/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-5 shadow-2xl shadow-black/30">
            <div className="mb-4 flex items-center justify-between border-b border-white/6 pb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-brand-300">Inventory Intelligence</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Executive overview</h2>
              </div>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                Protected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PREVIEW_METRICS.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-white/6 bg-slate-950/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">{metric.label}</span>
                    <metric.icon className={`h-3.5 w-3.5 ${metric.color}`} />
                  </div>
                  <div className={`text-2xl font-semibold ${metric.color}`}>{metric.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/6 bg-slate-950/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Risk concentration</span>
                <span className="text-[10px] text-slate-500">Preview</span>
              </div>
              <div className="space-y-2">
                {[
                  ["Critical", "w-[68%]", "bg-red-400"],
                  ["Watchlist", "w-[44%]", "bg-amber-400"],
                  ["Healthy", "w-[82%]", "bg-emerald-400"],
                ].map(([label, width, color]) => (
                  <div key={label} className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <span className="text-[11px] text-slate-500">{label}</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                      <div className={`h-full rounded-full ${width} ${color}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
