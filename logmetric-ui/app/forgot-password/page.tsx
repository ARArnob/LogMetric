"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, KeyRound, Loader2 } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { ApiError, forgotPassword } from "../lib/api";

export default function ForgotPassword() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Always resolves 200 -- the backend deliberately returns the same
      // response whether or not the address is registered, so there's
      // nothing to branch on here either. A thrown error here means the
      // request itself failed (validation, network, backend down), not
      // that the account doesn't exist.
      await forgotPassword(email);
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong -- try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="We'll email you a reset code"
      footer={
        <>
          Remembered it?{" "}
          <Link href="/signin" className="font-semibold" style={{ color: "var(--accent)" }}>
            Back to sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-sm"
          style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)" }}
        >
          <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Enter the email on your account. If it&apos;s registered, we&apos;ll send a 6-digit reset code.</span>
        </div>

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

        <button type="submit" disabled={submitting} className="btn btn-primary w-full" style={{ padding: "11px 18px" }}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send reset code
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
