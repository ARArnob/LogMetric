"use client";

import { useState } from "react";
import { ListFilter, Search } from "lucide-react";
import MultiSelect from "../ui/MultiSelect";
import Drawer from "../ui/Drawer";
import TimeRangePicker, { TimeRangeValue } from "../TimeRangePicker";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { ServiceBucket, SeverityBucket } from "../../lib/api";
import { SEVERITY, SEVERITY_ORDER } from "../../lib/severity";
import { useServiceAliases } from "../../lib/serviceAliases";

export { TIME_PRESETS } from "../TimeRangePicker";

interface FilterBarProps {
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
}

function LevelServiceTimeControls({
  levels,
  onLevelsChange,
  services,
  onServicesChange,
  serviceOptions,
  severityCounts,
  timeRange,
  onTimeRangeChange,
  stacked,
}: Pick<FilterBarProps, "levels" | "onLevelsChange" | "services" | "onServicesChange" | "serviceOptions" | "timeRange" | "onTimeRangeChange"> & {
  severityCounts: Map<string, number>;
  stacked?: boolean;
}) {
  const { resolveServiceName } = useServiceAliases();
  return (
    <>
      <div className={stacked ? "w-full" : "w-full md:w-44"}>
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

      <div className={stacked ? "w-full" : "w-full md:w-52"}>
        <MultiSelect
          ariaLabel="Filter by service"
          placeholder="Any service"
          values={services}
          onChange={onServicesChange}
          options={serviceOptions.map((s) => ({ value: s.name, label: resolveServiceName(s.name), count: s.count }))}
        />
      </div>

      <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} />
    </>
  );
}

export default function FilterBar(props: FilterBarProps) {
  const { keyword, onKeywordChange, levels, services, serviceOptions, severityOptions, timeRange } = props;
  const severityCounts = new Map(severityOptions.map((s) => [s.level.toUpperCase(), s.count]));
  const isSmallScreen = useMediaQuery("(max-width: 767px)");
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = levels.length + services.length;

  const searchBox = (
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
  );

  // Below md, level/service/time-range collapse into a "Filters" sheet --
  // showing all four controls inline there left no room to read results.
  if (isSmallScreen) {
    return (
      <div className="card p-4 flex gap-3">
        {searchBox}
        <button
          onClick={() => setSheetOpen(true)}
          className="btn btn-ghost shrink-0"
          style={{ padding: "9px 14px", position: "relative" }}
        >
          <ListFilter className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span
              className="rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                minWidth: 16, height: 16, padding: "0 4px",
                background: "var(--accent)", color: "var(--accent-contrast)",
              }}
            >
              {activeCount}
            </span>
          )}
        </button>

        <Drawer open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
          <div className="flex flex-col gap-3">
            <LevelServiceTimeControls {...props} severityCounts={severityCounts} stacked />
          </div>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col md:flex-row gap-3 md:items-center flex-wrap">
      {searchBox}
      <LevelServiceTimeControls {...props} severityCounts={severityCounts} />
    </div>
  );
}
