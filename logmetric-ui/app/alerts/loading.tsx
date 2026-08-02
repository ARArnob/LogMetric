import AppShellSkeleton from "../components/AppShellSkeleton";

export default function Loading() {
  return (
    <AppShellSkeleton>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 100 }} />
    </AppShellSkeleton>
  );
}
