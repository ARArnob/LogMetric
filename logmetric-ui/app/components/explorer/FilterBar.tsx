"use client";

import { Search } from "lucide-react";
import MultiSelect from "../ui/MultiSelect";
import Select from "../ui/Select";
import { ServiceBucket, SeverityBucket } from "../../lib/api";
import { SEVERITY, SEVERITY_ORDER } from "../../lib/severity";

export const TIME_PRESETS = [
  { id: "15m", label: "Last 15 minutes", ms: 15 * 60_000 },
  { id: "1h", label: "Last hour", ms: 60 * 60_000 },
  { id: "6h", label: "Last 6 hours", ms: 6 * 60 * 60_000 },
  { id: "24h", label: "Last 24 hours", ms: 24 * 60 * 60_000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 24 * 60 * 60_000 },
  { id: "30d", label: "Last 30 days", ms: 30 * 24 * 60 * 60_000 },
  { id: "all", label: "All time", ms: 0 },
] as const;

export default function FilterBar({
  keyword,
  onKeywordChange,
  levels,
  onLevelsChange,
  services,
  onServicesChange,
  serviceOptions,
  severityOptions,
  timeRangeId,
  onTimeRangeChange,
}: {
  keyword: string;
  onKeywordChange: (v: string) => void;
  levels: string[];
  onLevelsChange: (v: string[]) => void;
  services: string[];
  onServicesChange: (v: string[]) => void;
  serviceOptions: ServiceBucket[];
  severityOptions: SeverityBucket[];
  timeRangeId: string;
  onTimeRangeChange: (id: string) => void;
}) {
  const severityCounts = new Map(severityOptions.map((s) => [s.level.toUpperCase(), s.count]));

  return (
    <div className="card p-4 flex flex-col md:flex-row gap-3 md:items-center flex-wrap">
      <div className="relative flex-1 min-w-[220px]">
        <Search
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="search"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="Search the full index…"
          style={{ paddingLeft: 36, paddingTop: 9, paddingBottom: 9, fontSize: 14 }}
        />
      </div>

      <div className="w-full md:w-44">
        <MultiSelect
          ariaLabel="Filter by level"
          placeholder="Any level"
          values={levels}
          onChange={onLevelsChange}
          options={SEVERITY_ORDER.map((level) => ({
            value: level,
            label: SEVERITY[level].label,
            count: severityCounts.get(level) ?? 0,
          }))}
        />
      </div>

      <div className="w-full md:w-52">
        <MultiSelect
          ariaLabel="Filter by service"
          placeholder="Any service"
          values={services}
          onChange={onServicesChange}
          options={serviceOptions.map((s) => ({ value: s.name, label: s.name, count: s.count }))}
        />
      </div>

      <div className="w-full md:w-44">
        <Select
          ariaLabel="Time range"
          value={timeRangeId}
          onChange={onTimeRangeChange}
          options={TIME_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
        />
      </div>
    </div>
  );
}
