"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
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
    <AuthLayout
      title="Sign in"
      subtitle="Sign in to your workspace"
      footer={
        <>
          No account?{" "}
          <Link href="/signup" className="font-semibold" style={{ color: "var(--accent)" }}>
            Create one free
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div
            className="rounded-lg px-3 py-2.5 text-sm flex items-start gap-2"
            role="alert"
            style={{
              background: "var(--sev-error-dim)",
              color: "var(--sev-error)",
              border: "1px solid var(--sev-error)",
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-secondary)" }}
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
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label
            className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="password"
          >
            Password
          </label>
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

        <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 rounded cursor-pointer"
            style={{ accentColor: "var(--accent)" }}
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Keep me signed in
          </span>
        </label>

        <button type="submit" disabled={submitting} className="btn btn-primary w-full" style={{ padding: "11px 18px" }}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
