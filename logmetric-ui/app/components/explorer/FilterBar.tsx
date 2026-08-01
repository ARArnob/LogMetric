"use client";

import { Search } from "lucide-react";
import MultiSelect from "../ui/MultiSelect";
import TimeRangePicker, { TimeRangeValue } from "../TimeRangePicker";
import { ServiceBucket, SeverityBucket } from "../../lib/api";
import { SEVERITY, SEVERITY_ORDER } from "../../lib/severity";

export { TIME_PRESETS } from "../TimeRangePicker";

export default function FilterBar({
  keyword,
  onKeywordChange,
  levels,
  onLevelsChange,
  services,
  onServicesChange,
  serviceOptions,
  severityOptions,
  timeRange,
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
  timeRange: TimeRangeValue;
  onTimeRangeChange: (v: TimeRangeValue) => void;
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

      <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} />
    </div>
  );
}
