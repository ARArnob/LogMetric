"use client";

import { useState, FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { ApiError, changePassword } from "../../lib/api";
import { useToast } from "../../lib/toast";

export default function ChangePasswordSection() {
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change the password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Password
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        Change your account password. You&apos;ll stay signed in on this device.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
        {error && (
          <div role="alert" className="text-[13px]" style={{ color: "var(--sev-error-text)" }}>
            {error}
          </div>
        )}

        <div>
          <label
            className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="currentPassword"
          >
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div>
          <label
            className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-secondary)" }}
            htmlFor="confirmNewPassword"
          >
            Confirm new password
          </label>
          <input
            id="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary self-start" style={{ padding: "9px 16px" }}>
          {submitting ? "Changing…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
