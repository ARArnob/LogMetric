"use client";

import { useAuth } from "../lib/auth";
import { usePresence } from "./usePresence";

/** Avatar-bubble cluster showing who else in the org is viewing right now. */
export default function PresenceIndicator() {
  const { user } = useAuth();
  const viewers = usePresence(user?.organizationId, user?.email);

  if (viewers.length === 0) return null;

  const shown = viewers.slice(0, 4);
  const overflow = viewers.length - shown.length;

  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full"
      style={{ background: "var(--bg-inset)", border: "1px solid var(--border-subtle)" }}
      title={viewers.map((v) => v.email).join(", ")}
    >
      <div className="flex -space-x-1.5">
        {shown.map((v) => (
          <div
            key={v.email}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "1.5px solid var(--bg-inset)",
            }}
          >
            {v.email[0]?.toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
        {overflow > 0 ? `+${overflow} more` : viewers.length === 1 ? "Just you" : `${viewers.length} viewing`}
      </span>
    </div>
  );
}
