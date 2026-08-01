import { createSimpleStore } from "./simpleStore";

/** Shared across LogStream (owns the effect that subscribes/unsubscribes from SSE) and CommandPalette (toggles it from anywhere). */
export const liveTailPausedStore = createSimpleStore(false);
