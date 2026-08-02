import { ReactNode } from "react";

/**
 * Route-level loading.tsx fallback, shaped like AppShell itself (same fixed
 * 232px sidebar, same header height) so the swap from skeleton to real page
 * doesn't jump. `children` is the page-specific content skeleton -- each
 * route's loading.tsx supplies a shape matching its own real layout rather
 * than sharing one generic block.
 */
export default function AppShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      <div
        className="hidden lg:flex flex-col fixed inset-y-0 left-0"
        style={{ width: 232, background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)" }}
      >
        <div className="px-4 py-4">
          <div className="skeleton" style={{ height: 24, width: 120 }} />
        </div>
        <div className="px-2 flex-1 flex flex-col gap-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-[232px]">
        <div
          className="px-5 py-3 md:px-8 flex items-center"
          style={{ borderBottom: "1px solid var(--border-subtle)", height: 57 }}
        >
          <div className="skeleton" style={{ height: 20, width: 140 }} />
        </div>
        <div className="flex-1 px-5 py-6 md:px-8 md:py-8 w-full">
          <div className="skeleton mb-6" style={{ height: 28, width: 220 }} />
          {children}
        </div>
      </div>
    </div>
  );
}
