"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Zap, Check } from "lucide-react";
import { setAuth, getAuth, type Plan } from "@/lib/auth";

type Tab = "signin" | "signup";

const PLANS: { key: Plan; name: string; price: string; desc: string; features: string[] }[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    desc: "Try SupplySense AI with your first upload.",
    features: ["1 upload / month", "Up to 500 SKUs", "Health Score, ABC & Risk modules"],
  },
  {
    key: "starter",
    name: "Starter",
    price: "$10/mo",
    desc: "Full access for growing operations.",
    features: ["5 uploads / month", "Up to 5,000 SKUs", "All 8 analytics modules"],
  },
  {
    key: "growth",
    name: "Growth",
    price: "$99/mo",
    desc: "For supply chain teams running weekly analysis.",
    features: ["Unlimited uploads", "Up to 50,000 SKUs", "All modules + priority support"],
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAuth()) router.replace("/dashboard");
  }, [router]);

  function mockToken(email: string) {
    return btoa(email + ":ss-" + Date.now()).slice(0, 32);
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    // Built-in demo accounts
    const DEMO_ACCOUNTS = [
      { email: "abc",     password: "abc",     name: "ABC User",    plan: "starter" as const },
      { email: "tamkeen", password: "matco123", name: "Tamkeen Ahmed", plan: "growth" as const },
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
    setAuth({ email: account.email, name: account.name, plan: account.plan, token: mockToken(email) });
    router.replace("/dashboard");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter a username."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    // Save account to localStorage accounts list
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem("supplysense_accounts") ?? "[]"); } catch { return []; }
    })();
    if (stored.some((a: { email: string }) => a.email === email)) {
      setError("An account with this email already exists.");
      setLoading(false);
      return;
    }
    stored.push({ email, password, name, plan });
    localStorage.setItem("supplysense_accounts", JSON.stringify(stored));
    setAuth({ email, name, plan, token: mockToken(email) });
    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-bold text-white text-lg">SupplySense AI</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Tabs */}
        <div className="flex rounded-xl bg-white/5 border border-white/8 p-1 mb-6">
          {(["signin", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t
                  ? "bg-brand-500 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <div className="card p-6">
          {tab === "signin" ? (
            <form onSubmit={handleSignin} className="space-y-4">
              <h1 className="text-lg font-semibold text-white mb-1">Welcome back</h1>
              <p className="text-sm text-slate-400 mb-4">Sign in to your SupplySense account.</p>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>

              <p className="text-xs text-center text-slate-500 pt-1">
                No account?{" "}
                <button type="button" onClick={() => setTab("signup")} className="text-brand-400 hover:text-brand-300">
                  Create one free
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <h1 className="text-lg font-semibold text-white mb-1">Create your account</h1>
              <p className="text-sm text-slate-400 mb-2">Get started in 30 seconds. No credit card required.</p>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                    placeholder="Choose a username"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 pr-10"
                      placeholder="At least 6 characters"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Plan picker */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Choose your plan</label>
                <div className="space-y-2">
                  {PLANS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPlan(p.key)}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${
                        plan === p.key
                          ? "border-brand-500 bg-brand-500/10"
                          : "border-white/8 bg-white/3 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-brand-400">{p.price}</span>
                          {plan === p.key && <Check className="w-3.5 h-3.5 text-brand-400" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-1.5">{p.desc}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {p.features.map((f) => (
                          <span key={f} className="text-[10px] text-slate-400">{f}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? "Creating account…" : "Create Account & Continue"}
              </button>

              <p className="text-xs text-center text-slate-500 pt-1">
                Already have an account?{" "}
                <button type="button" onClick={() => setTab("signin")} className="text-brand-400 hover:text-brand-300">
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
    </div>
  );
}
