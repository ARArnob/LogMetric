"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Select, { SelectOption } from "../ui/Select";
import MultiSelect, { MultiSelectOption } from "../ui/MultiSelect";
import { AlertMetric, AlertRule, AlertRuleInput, TeamUser } from "../../lib/api";

const METRIC_OPTIONS: SelectOption[] = [
  { value: "ERROR_RATE", label: "Error rate" },
  { value: "VOLUME_ZSCORE", label: "Volume z-score (spike / drop detection)" },
  { value: "ENTROPY", label: "Payload entropy (obfuscation detection)" },
];

const THRESHOLD_HELP: Record<AlertMetric, string> = {
  ERROR_RATE: "Fraction of logs at ERROR level, 0-1. 0.3 fires at a 30% error rate over the window.",
  VOLUME_ZSCORE:
    "Standard deviations above a service's own moving-average baseline. 3.0 is a reasonable starting point.",
  ENTROPY:
    "Shannon entropy in bits over a 32-character window. Obfuscated payloads (encoded shells, injection strings) typically exceed ~4.5.",
};

function secondsToHuman(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default function AlertRuleForm({
  open,
  onClose,
  onSubmit,
  editing,
  members,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AlertRuleInput) => void;
  editing: AlertRule | null;
  members: TeamUser[];
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [metric, setMetric] = useState<AlertMetric>("ERROR_RATE");
  const [threshold, setThreshold] = useState("0.3");
  const [windowSeconds, setWindowSeconds] = useState("300");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setMetric(editing.metric);
      setThreshold(String(editing.threshold));
      setWindowSeconds(String(editing.windowSeconds));
      setRecipients(editing.targetEmails);
      setEnabled(editing.enabled);
    } else {
      setName("");
      setMetric("ERROR_RATE");
      setThreshold("0.3");
      setWindowSeconds("300");
      setRecipients([]);
      setEnabled(true);
    }
  }, [open, editing]);

  const recipientOptions: MultiSelectOption[] = members.map((m) => ({ value: m.email, label: m.email }));

  const thresholdNumber = Number(threshold);
  const windowNumber = Number(windowSeconds);
  const isValid =
    name.trim().length > 0 &&
    Number.isFinite(thresholdNumber) &&
    Number.isFinite(windowNumber) &&
    windowNumber > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      name: name.trim(),
      metric,
      threshold: thresholdNumber,
      windowSeconds: Math.round(windowNumber),
      targetEmails: recipients,
      enabled,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit alert rule" : "New alert rule"} maxWidth={480}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="rule-name" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Rule name
          </label>
          <input
            id="rule-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Checkout error spike"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--bg-inset)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Metric
          </label>
          <Select
            value={metric}
            options={METRIC_OPTIONS}
            onChange={(v) => setMetric(v as AlertMetric)}
            ariaLabel="Metric"
          />
        </div>

        <div>
          <label htmlFor="rule-threshold" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Threshold
          </label>
          <input
            id="rule-threshold"
            type="number"
            step="any"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--bg-inset)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            required
          />
          <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {THRESHOLD_HELP[metric]}
          </p>
        </div>

        <div>
          <label htmlFor="rule-window" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Window (seconds)
          </label>
          <input
            id="rule-window"
            type="number"
            min={1}
            step={1}
            value={windowSeconds}
            onChange={(e) => setWindowSeconds(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--bg-inset)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            required
          />
          {windowNumber > 0 && (
            <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              Evaluated over the trailing {secondsToHuman(windowNumber)}, checked every 60s.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Notify
          </label>
          <MultiSelect
            values={recipients}
            options={recipientOptions}
            onChange={setRecipients}
            placeholder="No one -- rule fires silently in the live feed only"
            ariaLabel="Recipients"
          />
        </div>

        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          aria-pressed={enabled}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-sm w-full"
          style={{ background: "var(--bg-inset)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
        >
          <span>{enabled ? "Enabled" : "Disabled"}</span>
          <span
            className="relative rounded-full transition-colors"
            style={{ width: 34, height: 18, background: enabled ? "var(--accent)" : "var(--border-strong)" }}
          >
            <span
              className="absolute rounded-full transition-transform"
              style={{
                width: 14,
                height: 14,
                top: 2,
                left: 2,
                background: "var(--accent-contrast)",
                transform: enabled ? "translateX(16px)" : "translateX(0)",
              }}
            />
          </span>
        </button>

        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost" disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!isValid || saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create rule"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
