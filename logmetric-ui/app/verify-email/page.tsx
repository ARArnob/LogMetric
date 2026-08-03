"use client";

import { Suspense, useEffect, useRef, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { ApiError, resendVerification, verifyEmail } from "../lib/api";
import { useAuth } from "../lib/auth";

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownInterval.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyEmail(email, code);
      login(result.token, {
        email: result.email,
        role: result.role,
        organizationId: result.organizationId,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setError(null);
    setResending(true);
    try {
      await resendVerification(email);
      setResent(true);
      startCooldown();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="One more step before you're in"
      footer={
        <>
          Wrong address?{" "}
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Start over
          </button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-sm"
          style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)" }}
        >
          <MailCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {email ? (
              <>
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish signing up.
              </>
            ) : (
              "Enter the email you signed up with and the 6-digit code we sent you."
            )}
          </span>
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

        {resent && !error && (
          <div
            className="rounded-lg px-3 py-2.5 text-sm flex items-start gap-2"
            style={{ background: "var(--ok-dim)", color: "var(--ok)", border: "1px solid var(--ok)" }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>If that address has a pending signup, a new code is on its way.</span>
          </div>
        )}

        {!searchParams.get("email") && (
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        <div>
          <label
            className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="code"
          >
            Verification code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ letterSpacing: "0.3em", textAlign: "center", fontVariantNumeric: "tabular-nums" }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || code.length !== 6 || !email}
          className="btn btn-primary w-full"
          style={{ padding: "11px 18px" }}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              Verify and continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
            className="font-semibold disabled:opacity-50"
            style={{ color: "var(--accent)" }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
