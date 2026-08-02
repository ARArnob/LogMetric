import { ReactNode } from "react";
import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <header className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}
          >
            <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          </div>
          <span className="text-sm font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Log<span style={{ color: "var(--accent)" }}>Metric</span>
          </span>
        </Link>
        <Link href="/signup" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign up
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-5 pb-24 pt-6">
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          Last updated {updated}
        </p>
        <h1 className="text-3xl font-black tracking-tight mb-8" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        <div className="flex flex-col gap-8">{children}</div>
      </main>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-2.5" style={{ color: "var(--text-primary)" }}>
        {heading}
      </h2>
      <div
        className="text-sm flex flex-col gap-2.5"
        style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
      >
        {children}
      </div>
    </section>
  );
}
