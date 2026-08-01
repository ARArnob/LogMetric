"use client";

import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={420}>
      <div className="flex items-start gap-3 mb-5">
        {danger && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--sev-error-dim)", color: "var(--sev-error-text)" }}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        )}
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {message}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-ghost" disabled={loading}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="btn"
          style={{
            background: danger ? "var(--sev-error)" : "var(--accent)",
            color: danger ? "#ffffff" : "var(--accent-contrast)",
          }}
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
