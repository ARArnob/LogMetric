"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";
import { login as loginApi } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function SignIn() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginApi(email, password);
      login(
        result.token,
        { email: result.email, role: result.role, organizationId: result.organizationId },
        remember
      );
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

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
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{
                  background: "var(--error-dim)",
                  color: "var(--error)",
                  border: "1px solid rgba(255,77,106,0.2)",
                }}
              >
                {error}
              </div>
            )}

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
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="remember"
                type="checkbox"
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: "var(--accent-cyan)" }}
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label
                htmlFor="remember"
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Keep me signed in
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="block w-full py-3 text-center text-sm font-bold rounded-lg transition-all mt-2"
              style={{
                background: "var(--accent-cyan)",
                color: "#0a0e17",
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
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
