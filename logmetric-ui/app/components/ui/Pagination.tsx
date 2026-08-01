"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page,
  pageCount,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  total,
}: {
  /** 0-indexed current page */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  total?: number;
}) {
  const canPrev = page > 0;
  const canNext = page < pageCount - 1;

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap text-xs" style={{ color: "var(--text-muted)" }}>
      <div className="flex items-center gap-3">
        {typeof total === "number" && (
          <span>
            Page {page + 1} of {Math.max(pageCount, 1)} · {total.toLocaleString()} total
          </span>
        )}
        {onPageSizeChange && pageSize && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              padding: "4px 8px",
              fontSize: 12,
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="btn btn-quiet"
          style={{ padding: 6 }}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="btn btn-quiet"
          style={{ padding: 6 }}
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
