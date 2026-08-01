"use client";

import { RotateCcw } from "lucide-react";
import Select from "./ui/Select";

export const TIME_PRESETS = [
  { id: "15m", label: "Last 15 minutes", ms: 15 * 60_000 },
  { id: "1h", label: "Last hour", ms: 60 * 60_000 },
  { id: "6h", label: "Last 6 hours", ms: 6 * 60 * 60_000 },
  { id: "24h", label: "Last 24 hours", ms: 24 * 60 * 60_000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 24 * 60 * 60_000 },
  { id: "30d", label: "Last 30 days", ms: 30 * 24 * 60 * 60_000 },
  { id: "all", label: "All time", ms: 0 },
] as const;

export interface TimeRangeValue {
  id: string;
  startDate?: number;
  endDate?: number;
}

/** Resolves a preset id to concrete epoch bounds. "all"/"custom" carry no computed bound here -- custom bounds come from the picker's own inputs. */
export function presetRange(id: string): { startDate?: number; endDate?: number } {
  const preset = TIME_PRESETS.find((p) => p.id === id);
  if (!preset || preset.id === "all") return { startDate: undefined, endDate: undefined };
  return { startDate: Date.now() - preset.ms, endDate: undefined };
}

function toLocalInputValue(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(v: string): number | undefined {
  if (!v) return undefined;
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * Shared across Dashboard, Explorer, and Patterns (F13) so "last 6 hours"
 * means the same thing and looks the same everywhere. Persists nothing
 * itself -- the caller owns URL/localStorage persistence, this just renders
 * the control and reports a value back.
 */
export default function TimeRangePicker({
  value,
  onChange,
}: {
  value: TimeRangeValue;
  onChange: (v: TimeRangeValue) => void;
}) {
  const isCustom = value.id === "custom";
  const options = [
    ...TIME_PRESETS.map((p) => ({ value: p.id, label: p.label })),
    { value: "custom", label: "Custom range…" },
  ];

  function handleSelect(id: string) {
    if (id === "custom") {
      onChange({ id: "custom", startDate: Date.now() - 24 * 60 * 60_000, endDate: Date.now() });
      return;
    }
    onChange({ id, ...presetRange(id) });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="w-44">
        <Select ariaLabel="Time range" value={value.id} onChange={handleSelect} options={options} />
      </div>

      {isCustom && (
        <>
          <input
            type="datetime-local"
            aria-label="Range start"
            value={toLocalInputValue(value.startDate)}
            onChange={(e) => onChange({ ...value, startDate: fromLocalInputValue(e.target.value) })}
            style={{ fontSize: 12, padding: "6px 8px" }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            to
          </span>
          <input
            type="datetime-local"
            aria-label="Range end"
            value={toLocalInputValue(value.endDate)}
            onChange={(e) => onChange({ ...value, endDate: fromLocalInputValue(e.target.value) })}
            style={{ fontSize: 12, padding: "6px 8px" }}
          />
        </>
      )}

      {value.id !== "all" && (
        <button
          onClick={() => onChange({ id: "all" })}
          className="btn btn-quiet"
          style={{ padding: "5px 8px", fontSize: 11 }}
          title="Reset to all time"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      )}
    </div>
  );
}
