"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Badge from "../ui/Badge";
import ConfirmDialog from "../ui/ConfirmDialog";
import { AlertRule, ApiError, deleteAlertRule, updateAlertRule } from "../../lib/api";
import { useToast } from "../../lib/toast";

const METRIC_LABEL: Record<string, string> = {
  ERROR_RATE: "Error rate",
  VOLUME_ZSCORE: "Volume z-score",
  ENTROPY: "Payload entropy",
  NEW_PATTERN: "New pattern detected",
  PATTERN_SILENCE: "Pattern went silent",
  PARAM_CARDINALITY: "Parameter cardinality spike",
};

function secondsToHuman(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default function AlertRuleList({
  rules,
  setRules,
  onEdit,
  onDeleted,
}: {
  rules: AlertRule[];
  setRules: React.Dispatch<React.SetStateAction<AlertRule[]>>;
  onEdit: (rule: AlertRule) => void;
  onDeleted: (id: number) => void;
}) {
  const toast = useToast();
  const [toggling, setToggling] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AlertRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function toggleEnabled(rule: AlertRule) {
    const previous = rules;
    setToggling(rule.id);
    setRules((list) => list.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
    try {
      const updated = await updateAlertRule(rule.id, {
        name: rule.name,
        metric: rule.metric,
        threshold: rule.threshold,
        windowSeconds: rule.windowSeconds,
        targetEmails: rule.targetEmails,
        enabled: !rule.enabled,
      });
      setRules((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setRules(previous);
      toast.error(err instanceof ApiError ? err.message : "Couldn't update the rule");
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      await deleteAlertRule(target.id);
      onDeleted(target.id);
      toast.success(`"${target.name}" deleted`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the rule");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Rule
            </th>
            <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Metric
            </th>
            <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Notify
            </th>
            <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Status
            </th>
            <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td className="px-5 py-3" style={{ color: "var(--text-primary)" }}>
                <div className="font-semibold">{rule.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {rule.metric === "ERROR_RATE"
                    ? `> ${(rule.threshold * 100).toFixed(0)}%`
                    : rule.metric === "PATTERN_SILENCE" || rule.metric === "PARAM_CARDINALITY"
                    ? `> ${rule.threshold}x`
                    : rule.metric === "NEW_PATTERN"
                    ? `>= ${rule.threshold}`
                    : `> ${rule.threshold}`}{" "}
                  {rule.metric === "PARAM_CARDINALITY" ? "over fixed 5m window" : `over ${secondsToHuman(rule.windowSeconds)}`}
                </div>
              </td>
              <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                {METRIC_LABEL[rule.metric] ?? rule.metric}
              </td>
              <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                {rule.targetEmails.length === 0 ? (
                  <span style={{ color: "var(--text-muted)" }}>No one</span>
                ) : rule.targetEmails.length === 1 ? (
                  rule.targetEmails[0]
                ) : (
                  `${rule.targetEmails.length} people`
                )}
              </td>
              <td className="px-5 py-3">
                <button
                  onClick={() => toggleEnabled(rule)}
                  disabled={toggling === rule.id}
                  aria-label={rule.enabled ? `Disable ${rule.name}` : `Enable ${rule.name}`}
                  className="cursor-pointer transition-opacity hover:opacity-75 disabled:opacity-50"
                >
                  <Badge variant={rule.enabled ? "ok" : "neutral"}>{rule.enabled ? "Enabled" : "Disabled"}</Badge>
                </button>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 8px" }}
                    onClick={() => onEdit(rule)}
                    aria-label={`Edit ${rule.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 8px", color: "var(--sev-error-text)" }}
                    onClick={() => setPendingDelete(rule)}
                    aria-label={`Delete ${rule.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        danger
        title="Delete this rule?"
        message={pendingDelete ? `"${pendingDelete.name}" will stop being evaluated immediately. This can't be undone.` : ""}
        confirmLabel="Delete"
      />
    </div>
  );
}
