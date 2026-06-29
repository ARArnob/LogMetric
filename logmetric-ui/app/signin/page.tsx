import Link from "next/link";
import { Activity, Github } from "lucide-react";

export default function SignIn() {
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
            Sign in to your workspace
          </p>
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
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs transition-colors"
                  style={{ color: "var(--accent-cyan)" }}
                >
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="remember"
                type="checkbox"
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: "var(--accent-cyan)" }}
              />
              <label
                htmlFor="remember"
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Keep me signed in
              </label>
            </div>

            {/* Sign in button → goes to dashboard for demo */}
            <Link
              href="/dashboard"
              className="block w-full py-3 text-center text-sm font-bold rounded-lg transition-all mt-2"
              style={{ background: "var(--accent-cyan)", color: "#0a0e17" }}
            >
              Sign In
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
          </div>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
          No account?{" "}
          <Link
            href="/signup"
            className="font-semibold transition-colors"
            style={{ color: "var(--accent-cyan)" }}
          >
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
