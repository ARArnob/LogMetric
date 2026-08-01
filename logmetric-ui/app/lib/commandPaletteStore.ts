import { createSimpleStore } from "./simpleStore";

/** Lets AppShell's header button open the palette without CommandPalette needing to be a prop-drilled child. */
export const commandPaletteOpenStore = createSimpleStore(false);
