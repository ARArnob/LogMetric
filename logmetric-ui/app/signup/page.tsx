import Link from "next/link";
import { Activity, Github, CheckCircle } from "lucide-react";

export default function SignUp() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{
              background: "var(--accent-cyan-dim)",
              border: "1px solid var(--accent-cyan)",
            }}
          >
            <Activity className="w-6 h-6" style={{ color: "var(--accent-cyan)" }} />
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full pulse-live"
              style={{ background: "var(--accent-green)" }}
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-center">
            Log<span style={{ color: "var(--accent-cyan)" }}>Metric</span>
          </h1>
          <p className="text-sm mt-2 text-center" style={{ color: "var(--text-muted)" }}>
            Start monitoring in under 2 minutes
          </p>
        </div>

        {/* Perks */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {["Free 14-day trial", "No credit card", "Instant setup"].map((perk) => (
            <div key={perk} className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <CheckCircle className="w-3 h-3" style={{ color: "var(--accent-green)" }} />
              {perk}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <div className="space-y-5">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
                htmlFor="name"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Alex Rahman"
                autoComplete="name"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
                htmlFor="email"
              >
                Work Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="alex@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="8+ characters"
                autoComplete="new-password"
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                At least 8 characters with a number or symbol.
              </p>
            </div>

            {/* Sign up → goes to dashboard for demo */}
            <Link
              href="/dashboard"
              className="block w-full py-3 text-center text-sm font-bold rounded-lg transition-all mt-2"
              style={{ background: "var(--accent-cyan)", color: "#0a0e17" }}
            >
              Create Account
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                or
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            </div>

            <button
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
              }}
            >
              <Github className="w-4 h-4" />
              Continue with GitHub
            </button>

            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              By signing up you agree to our{" "}
              <a href="#" style={{ color: "var(--accent-cyan)" }}>Terms</a>{" "}
              and{" "}
              <a href="#" style={{ color: "var(--accent-cyan)" }}>Privacy Policy</a>.
            </p>
          </div>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link
            href="/signin"
            className="font-semibold transition-colors"
            style={{ color: "var(--accent-cyan)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
