"use client";

import { ReactNode, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "./useFocusTrap";

export default function Drawer({
  open,
  onClose,
  title,
  children,
  width = 420,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 200 }}>
      <div
        className="absolute inset-0 modal-backdrop"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="drawer-enter absolute inset-y-0 right-0 flex flex-col"
        style={{
          width: `min(${width}px, 100vw)`,
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-lift)",
        }}
        tabIndex={-1}
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h2 id={titleId} className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
          <button onClick={onClose} className="btn btn-quiet" style={{ padding: 6 }} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
