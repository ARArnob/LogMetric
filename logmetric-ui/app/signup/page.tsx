"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { register as registerApi } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function SignUp() {
  const router = useRouter();
  const { login } = useAuth();

  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await registerApi(email, password, organizationName);
      login(result.token, {
        email: result.email,
        role: result.role,
        organizationId: result.organizationId,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start monitoring in under two minutes"
      perks={["No credit card", "Instant setup", "Free while in beta"]}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/signin" className="font-semibold" style={{ color: "var(--accent)" }}>
            Sign in
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
            htmlFor="organizationName"
          >
            Organization name
          </label>
          <input
            id="organizationName"
            type="text"
            placeholder="Acme Inc."
            autoComplete="organization"
            required
            autoFocus
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
          />
          <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            You&apos;ll be the admin of this workspace. Joining an existing team? Ask an admin for
            an invite instead — org names can&apos;t be claimed twice.
          </p>
        </div>

        <div>
          <label
            className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="email"
          >
            Work email
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary w-full" style={{ padding: "11px 18px" }}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[11px] text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
          By signing up you agree to our{" "}
          <a href="#" style={{ color: "var(--accent)" }}>Terms</a> and{" "}
          <a href="#" style={{ color: "var(--accent)" }}>Privacy Policy</a>.
        </p>
      </form>
    </AuthLayout>
  );
}
