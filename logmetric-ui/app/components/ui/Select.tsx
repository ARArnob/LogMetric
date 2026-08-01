"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export default function Select({
  value,
  options,
  onChange,
  placeholder = "Select…",
  ariaLabel,
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", timer: undefined as ReturnType<typeof setTimeout> | undefined });

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) setHighlight(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  function commit(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
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
      commit(highlight);
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      const ta = typeahead.current;
      clearTimeout(ta.timer);
      ta.text += e.key.toLowerCase();
      const idx = options.findIndex((o) => o.label.toLowerCase().startsWith(ta.text));
      if (idx >= 0) setHighlight(idx);
      ta.timer = setTimeout(() => (ta.text = ""), 500);
    }
  }

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
          color: selected ? "var(--text-primary)" : "var(--text-muted)",
          boxShadow: open ? "0 0 0 3px var(--accent-dim)" : "none",
        }}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="card absolute z-20 mt-1 py-1 w-full max-h-64 overflow-y-auto"
          style={{ boxShadow: "var(--shadow-lift)" }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlight;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => commit(idx)}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer"
                style={{
                  background: isHighlighted ? "var(--bg-elevated)" : "transparent",
                  color: "var(--text-primary)",
                }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
