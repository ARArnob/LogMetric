"use client";

import { Suspense, useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2, UserPlus } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { ApiError, ValidationError, register as registerApi, registerWithInvite } from "../lib/api";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-[11px] mt-1" style={{ color: "var(--sev-error-text)" }}>
      {message}
    </p>
  );
}

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [joinMode, setJoinMode] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // A code in the URL always wins on first load -- someone who opened an
  // invite link is joining a team, full stop, regardless of local toggles.
  useEffect(() => {
    const code = searchParams.get("invite");
    if (code) {
      setJoinMode(true);
      setInviteCode(code);
    }
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = joinMode
        ? await registerWithInvite(email, password, inviteCode)
        : await registerApi(email, password, organizationName);
      router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
    } catch (err) {
      if (err instanceof ValidationError) {
        setFieldErrors(err.fields);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Sign up failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: boolean) {
    setJoinMode(next);
    setError(null);
    setFieldErrors({});
    if (!next) setInviteCode("");
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle={joinMode ? "Join your team on LogMetric" : "Start monitoring in under two minutes"}
      perks={joinMode ? undefined : ["No credit card", "Instant setup", "Free while in beta"]}
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
        {joinMode && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg text-sm"
            style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)" }}
          >
            <UserPlus className="w-4 h-4 shrink-0 mt-0.5" />
            <span>You&apos;ve been invited to join a team. Signing up here joins their organization.</span>
          </div>
        )}

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

        {joinMode ? (
          <div>
            <label
              className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-secondary)" }}
              htmlFor="inviteCode"
            >
              Invite code
            </label>
            <input
              id="inviteCode"
              type="text"
              placeholder="Paste your invite code"
              required
              autoFocus
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              style={fieldErrors.inviteCode ? { borderColor: "var(--sev-error)" } : undefined}
            />
            <FieldError message={fieldErrors.inviteCode} />
          </div>
        ) : (
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
              style={fieldErrors.organizationName ? { borderColor: "var(--sev-error)" } : undefined}
            />
            <FieldError message={fieldErrors.organizationName} />
            <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              You&apos;ll be the admin of this workspace. Joining an existing team?{" "}
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="font-semibold"
                style={{ color: "var(--accent)" }}
              >
                Use an invite code
              </button>{" "}
              instead — org names can&apos;t be claimed twice.
            </p>
          </div>
        )}

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
            style={fieldErrors.email ? { borderColor: "var(--sev-error)" } : undefined}
          />
          <FieldError message={fieldErrors.email} />
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
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*"
            title="At least 8 characters, with an uppercase letter, a lowercase letter, and a number"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={fieldErrors.password ? { borderColor: "var(--sev-error)" } : undefined}
          />
          <FieldError message={fieldErrors.password} />
          {!fieldErrors.password && (
            <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
            </p>
          )}
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary w-full" style={{ padding: "11px 18px" }}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {joinMode ? "Joining team…" : "Creating account…"}
            </>
          ) : (
            <>
              {joinMode ? "Join team" : "Create account"}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {joinMode && (
          <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
            Not joining a team?{" "}
            <button
              type="button"
              onClick={() => switchMode(false)}
              className="font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Create a new organization
            </button>{" "}
            instead.
          </p>
        )}

        <p className="text-[11px] text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
          By signing up you agree to our{" "}
          <Link href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>Terms</Link> and{" "}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>Privacy Policy</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}

export default function SignUp() {
  return (
    <Suspense fallback={null}>
      <SignUpContent />
    </Suspense>
  );
}
