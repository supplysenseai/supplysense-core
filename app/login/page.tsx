"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Zap } from "lucide-react";
import { setAuth, getAuth, type Plan } from "@/lib/auth";

type Tab = "signin" | "signup";

const LOCAL_ACCESS_PLAN: Plan = "free";

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

  function mockToken(email: string) {
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
    setAuth({ email, name, plan: LOCAL_ACCESS_PLAN, token: mockToken(email) });
    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-bold text-white text-lg">SupplySense</span>
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
                  Create local access
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <h1 className="text-lg font-semibold text-white mb-1">Create your account</h1>
              <p className="text-sm text-slate-400 mb-2">Create a local app profile. No payment details required.</p>

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
