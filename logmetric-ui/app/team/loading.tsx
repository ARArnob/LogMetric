import AppShellSkeleton from "../components/AppShellSkeleton";

export default function Loading() {
  return (
    <AppShellSkeleton>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="skeleton" style={{ height: 140 }} />
      </div>
      <div className="skeleton" style={{ height: 300 }} />
    </AppShellSkeleton>
  );
}
