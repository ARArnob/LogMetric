/**
 * Minimal external store for state that needs to be shared between
 * components mounted at different points in the tree without threading
 * props or standing up a full React context -- e.g. "is the live tail
 * paused" (owned by LogStream on /dashboard, toggled from CommandPalette
 * which lives in AppShell on every page). Pair with useSyncExternalStore.
 */
export function createSimpleStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set: (next: T) => {
      if (value === next) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
