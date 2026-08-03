"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Clock, X } from "lucide-react";
import CopyButton from "../ui/CopyButton";
import ConfirmDialog from "../ui/ConfirmDialog";
import Badge from "../ui/Badge";
import { ApiError, Invite, InviteListItem, createInvite, listInvites, revokeInvite } from "../../lib/api";
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
  const [invites, setInvites] = useState<InviteListItem[]>([]);
  const [pendingRevoke, setPendingRevoke] = useState<InviteListItem | null>(null);
  const [revoking, setRevoking] = useState(false);
  const toast = useToast();

  const refreshInvites = useCallback(async () => {
    try {
      setInvites(await listInvites());
    } catch {
      // Silent -- the generate button above still works even if this list
      // fails to load; a toast for a background list refresh would be noise.
    }
  }, []);

  useEffect(() => {
    refreshInvites();
  }, [refreshInvites]);

  async function handleInvite() {
    setGenerating(true);
    try {
      const created = await createInvite();
      setInvite(created);
      toast.success("Invite link created");
      refreshInvites();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create an invite");
    } finally {
      setGenerating(false);
    }
  }

  async function confirmRevoke() {
    if (!pendingRevoke) return;
    setRevoking(true);
    try {
      await revokeInvite(pendingRevoke.id);
      setInvites((list) => list.filter((i) => i.id !== pendingRevoke.id));
      toast.success("Invite revoked");
      setPendingRevoke(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't revoke the invite");
    } finally {
      setRevoking(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = invite ? `${origin}/signup?invite=${invite.code}` : null;
  const outstanding = invites.filter((i) => !i.used);

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

      {outstanding.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Outstanding invites
          </h3>
          <ul className="flex flex-col gap-1.5">
            {outstanding.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-inset)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <code className="font-mono text-xs truncate" style={{ color: "var(--text-primary)" }}>
                    {i.code}
                  </code>
                  <Badge variant="neutral">{humanizeExpiry(i.expiresAt)}</Badge>
                </div>
                <button
                  className="btn btn-ghost shrink-0"
                  style={{ fontSize: 12, padding: "4px 8px" }}
                  onClick={() => setPendingRevoke(i)}
                  aria-label={`Revoke invite ${i.code}`}
                >
                  <X className="w-3.5 h-3.5" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRevoke}
        onClose={() => setPendingRevoke(null)}
        onConfirm={confirmRevoke}
        loading={revoking}
        danger
        title="Revoke this invite?"
        message={
          pendingRevoke
            ? `Anyone who still has "${pendingRevoke.code}" will no longer be able to use it to join this organization.`
            : ""
        }
        confirmLabel="Revoke"
      />
    </div>
  );
}
