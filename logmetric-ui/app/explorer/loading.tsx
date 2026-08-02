import AppShellSkeleton from "../components/AppShellSkeleton";

export default function Loading() {
  return (
    <AppShellSkeleton>
      <div className="skeleton mb-4" style={{ height: 64 }} />
      <div className="skeleton" style={{ height: 420 }} />
    </AppShellSkeleton>
  );
}
