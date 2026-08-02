import { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
      >
        {icon}
      </div>
      <div>
        {/* h2, not h3 -- on pages where this is the only content under the
            page's h1 (AppShell's title), an h3 here would skip a level. */}
        <h2 className="font-bold text-[15px] mb-1" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        {description && (
          <p className="text-[13px] max-w-sm" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
