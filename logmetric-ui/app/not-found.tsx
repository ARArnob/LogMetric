import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
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
          style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
        >
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            404
          </p>
          <h1 className="text-lg font-bold mb-1">Page not found</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Nothing lives at this address. It may have moved, or the link might just be wrong.
          </p>
        </div>
        <Link href="/" className="btn btn-primary" style={{ padding: "8px 16px" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back home
        </Link>
      </div>
    </div>
  );
}
