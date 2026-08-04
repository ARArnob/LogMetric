"use client";

import { Suspense, useEffect, useRef, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, KeyRound, Loader2 } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { ApiError, forgotPassword, resetPassword } from "../lib/api";
import { useAuth } from "../lib/auth";

const RESEND_COOLDOWN_SECONDS = 60;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
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
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const result = await resetPassword(email, code, newPassword);
      login(result.token, {
        email: result.email,
        role: result.role,
        organizationId: result.organizationId,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setError(null);
    setResending(true);
    try {
      await forgotPassword(email);
      startCooldown();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter the code and choose a new password"
      footer={
        <>
          Remembered it?{" "}
          <button
            type="button"
            onClick={() => router.push("/signin")}
            className="font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Back to sign in
          </button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-sm"
          style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)" }}
        >
          <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {email ? (
              <>
                If <strong>{email}</strong> is registered, we sent it a 6-digit code. Enter it below with your new password.
              </>
            ) : (
              "Enter your email, the 6-digit code we sent you, and a new password."
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
            Reset code
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

        <div>
          <label
            className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="newPassword"
          >
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*"
            title="At least 8 characters, with an uppercase letter, a lowercase letter, and a number"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
            At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
          </p>
        </div>

        <div>
          <label
            className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="confirmPassword"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
              Resetting…
            </>
          ) : (
            <>
              Reset password and sign in
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

export default function ResetPassword() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
