"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, ChevronLeft, ChevronRight, History, Trash2 } from "lucide-react";
import AppShell from "../components/AppShell";
import RoleGuard from "../components/RoleGuard";
import Badge from "../components/ui/Badge";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import { ApiError, AuditLogEntry, listAuditLogs, purgeAuditLogs } from "../lib/api";
import { useRequireAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

const PAGE_SIZE = 50;

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>
      <div className="flex items-center gap-3 text-sm">
        <Activity className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
        Loading…
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  const words = action.toLowerCase().split("_");
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + " " + words.slice(1).join(" ");
}

function actionBadgeVariant(action: string): "neutral" | "warn" | "accent" {
  if (action.includes("DELETED") || action.includes("REVOKED")) return "warn";
  if (action.includes("CREATED") || action === "LOGIN") return "accent";
  return "neutral";
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
}

function AuditContent() {
  const toast = useToast();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purgeDays, setPurgeDays] = useState("90");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purging, setPurging] = useState(false);

  const fetchPage = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const result = await listAuditLogs(targetPage, PAGE_SIZE);
      setEntries(result.logs);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load the audit log");
    } finally {
      setLoading(false);
    }
    // toast intentionally omitted -- its identity changes on every toast
    // add/remove, which would re-trigger this fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  async function handlePurge() {
    const days = Number(purgeDays);
    setPurging(true);
    try {
      const { deleted } = await purgeAuditLogs(days);
      toast.success(deleted === 1 ? "Deleted 1 entry" : `Deleted ${deleted} entries`);
      setConfirmOpen(false);
      fetchPage(0);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't purge the audit log");
    } finally {
      setPurging(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const purgeDaysValid = Number.isInteger(Number(purgeDays)) && Number(purgeDays) >= 1;

  return (
    <AppShell title="Audit Log" description="Every admin action and login, scoped to this organization.">
      <div className="flex flex-col gap-4 max-w-4xl">
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              History
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {total} entr{total === 1 ? "y" : "ies"}
            </span>
          </div>

          {loading ? (
            <div className="p-5 flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 36 }} />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<History className="w-6 h-6" />}
              title="No audit history yet"
              description="Logins and admin actions (API keys, alert rules, invites, roles, settings) will show up here as they happen."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Time
                      </th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Actor
                      </th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Action
                      </th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td className="px-5 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                          {formatTimestamp(e.createdAt)}
                        </td>
                        <td className="px-5 py-3" style={{ color: "var(--text-primary)" }}>
                          {e.actorEmail}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={actionBadgeVariant(e.action)}>{formatAction(e.action)}</Badge>
                        </td>
                        <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                          {e.detail ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 10px" }}
                    disabled={page === 0}
                    onClick={() => fetchPage(page - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 10px" }}
                    disabled={page + 1 >= totalPages}
                    onClick={() => fetchPage(page + 1)}
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Retention
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Permanently delete this organization&apos;s audit entries older than a chosen age. There
            is no automatic sweep -- entries only go away when you purge them.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm" style={{ color: "var(--text-secondary)" }} htmlFor="purgeDays">
              Delete entries older than
            </label>
            <input
              id="purgeDays"
              type="number"
              min={1}
              value={purgeDays}
              onChange={(e) => setPurgeDays(e.target.value)}
              style={{ width: 80 }}
            />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              days
            </span>
            <button
              className="btn"
              style={{ background: "var(--sev-error)", color: "#ffffff" }}
              disabled={!purgeDaysValid}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Purge
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handlePurge}
        loading={purging}
        danger
        title="Purge old audit entries?"
        message={`This permanently deletes every audit entry for this organization older than ${purgeDays} day${purgeDays === "1" ? "" : "s"}. This cannot be undone.`}
        confirmLabel="Purge"
      />
    </AppShell>
  );
}

export default function AuditPage() {
  const { loading } = useRequireAuth();

  if (loading) return <LoadingScreen />;

  return (
    <RoleGuard role="ADMIN">
      <AuditContent />
    </RoleGuard>
  );
}
