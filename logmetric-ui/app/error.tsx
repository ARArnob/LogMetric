"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

/**
 * Next.js App Router error boundary -- catches render/lifecycle errors
 * anywhere below the root layout and replaces Next's own default error
 * screen (which doesn't match the app's theme and offers no recovery
 * action beyond a browser refresh).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div
        className="card p-8 max-w-md w-full text-center flex flex-col items-center gap-4"
        style={{ boxShadow: "var(--shadow-lift)" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "var(--sev-error-dim)", color: "var(--sev-error-text)" }}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold mb-1">Something went wrong</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            An unexpected error interrupted this page. Reloading usually clears it; if it keeps
            happening, the detail below is worth including in a bug report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="btn btn-primary" style={{ padding: "8px 16px" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Try again
          </button>
          <Link href="/dashboard" className="btn btn-ghost" style={{ padding: "8px 16px" }}>
            <Home className="w-3.5 h-3.5" />
            Dashboard
          </Link>
        </div>
        {error.message && (
          <pre
            className="w-full text-left text-[11px] font-mono p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
          >
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
