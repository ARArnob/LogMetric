"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { backendUnreachableStore } from "../lib/backendHealth";

/**
 * Persistent, impossible-to-miss banner for when the API is unreachable at
 * the network level (as opposed to a 4xx/5xx, which means the backend is
 * up and just rejected the request). Without this, a dead backend renders
 * identically to an org with zero data on every page -- this is what
 * exists instead of that ambiguity.
 */
export default function BackendDownBanner() {
  const unreachable = useSyncExternalStore(backendUnreachableStore.subscribe, backendUnreachableStore.get, () => false);

  if (!unreachable) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
      style={{
        zIndex: 500,
        // --sev-error is a fixed, validated color across all three themes
        // (see globals.css), so its contrasting text is fixed too --
        // --accent-contrast is the wrong token here, it's tuned to pair
        // with --accent (which varies wildly per theme), not with red.
        // White clears 4.5:1 against --sev-error; --accent-contrast would
        // be near-black in midnight/amber, well under AA on this red.
        background: "var(--sev-error)",
        color: "#ffffff",
      }}
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      Can&apos;t reach the LogMetric API. Check that the backend is running on :8081.
    </div>
  );
}
