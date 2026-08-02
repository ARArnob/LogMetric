import AppShellSkeleton from "../components/AppShellSkeleton";

export default function Loading() {
  return (
    <AppShellSkeleton>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 160 }} />
        ))}
      </div>
    </AppShellSkeleton>
  );
}
