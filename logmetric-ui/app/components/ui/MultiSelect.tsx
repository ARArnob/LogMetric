"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

export default function MultiSelect({
  values,
  options,
  onChange,
  placeholder = "Any",
  ariaLabel,
}: {
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
        setHighlight(0);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) toggle(opt.value);
    }
  }

  const label =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? placeholder)
        : `${values.length} selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
        style={{
          background: "var(--bg-inset)",
          border: `1px solid ${open ? "var(--accent)" : "var(--border-default)"}`,
          color: values.length ? "var(--text-primary)" : "var(--text-muted)",
          boxShadow: open ? "0 0 0 3px var(--accent-dim)" : "none",
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          aria-multiselectable="true"
          className="card absolute z-20 mt-1 py-1 w-full max-h-64 overflow-y-auto"
          style={{ boxShadow: "var(--shadow-lift)" }}
        >
          {options.map((opt, idx) => {
            const isSelected = values.includes(opt.value);
            const isHighlighted = idx === highlight;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => toggle(opt.value)}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
                style={{
                  background: isHighlighted ? "var(--bg-elevated)" : "transparent",
                  color: "var(--text-primary)",
                }}
              >
                <span
                  className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
                  style={{
                    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border-strong)"}`,
                    background: isSelected ? "var(--accent)" : "transparent",
                  }}
                >
                  {isSelected && <Check className="w-3 h-3" style={{ color: "var(--accent-contrast)" }} />}
                </span>
                <span className="truncate flex-1">{opt.label}</span>
                {typeof opt.count === "number" && (
                  <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {opt.count}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
