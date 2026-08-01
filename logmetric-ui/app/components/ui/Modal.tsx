"use client";

import { ReactNode, useId } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "./useFocusTrap";

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: number;
}) {
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
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
        className="card modal-enter relative w-full p-6"
        style={{ maxWidth, boxShadow: "var(--shadow-lift)" }}
        tabIndex={-1}
      >
        <h2 id={titleId} className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body
  );
}
