"use client";

import { useState } from "react";
import { Mail, Clock } from "lucide-react";
import CopyButton from "../ui/CopyButton";
import { ApiError, Invite, createInvite } from "../../lib/api";
import { useToast } from "../../lib/toast";

function humanizeExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "already expired";
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `expires in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.round(ms / (1000 * 60 * 60)));
  return `expires in ${hours} hour${hours === 1 ? "" : "s"}`;
}

export default function InviteCard() {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  async function handleInvite() {
    setGenerating(true);
    try {
      const created = await createInvite();
      setInvite(created);
      toast.success("Invite link created");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create an invite");
    } finally {
      setGenerating(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = invite ? `${origin}/signup?invite=${invite.code}` : null;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Invite a teammate
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        Generate a signup link that joins the invited person straight into this organization as a member.
      </p>

      <button onClick={handleInvite} disabled={generating} className="btn btn-primary">
        <Mail className="w-3.5 h-3.5" />
        {generating ? "Generating…" : invite ? "Generate another invite" : "Invite a teammate"}
      </button>

      {inviteUrl && (
        <div className="mt-4 flex flex-col gap-2 animate-fade-up">
          <div className="flex items-center gap-2">
            <code
              className="flex-1 font-mono text-sm px-3 py-2.5 rounded-lg overflow-x-auto"
              style={{ background: "var(--bg-inset)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}
            >
              {inviteUrl}
            </code>
            <CopyButton value={inviteUrl} />
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <Clock className="w-3 h-3" />
            {humanizeExpiry(invite!.expiresAt)}
          </div>
        </div>
      )}
    </div>
  );
}
