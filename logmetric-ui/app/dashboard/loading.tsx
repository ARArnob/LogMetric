import AppShellSkeleton from "../components/AppShellSkeleton";

export default function Loading() {
  return (
    <AppShellSkeleton>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 96 }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="skeleton lg:col-span-2" style={{ height: 200 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
      <div className="skeleton" style={{ height: 300 }} />
    </AppShellSkeleton>
  );
}
