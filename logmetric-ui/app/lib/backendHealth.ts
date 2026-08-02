import { createSimpleStore } from "./simpleStore";

/**
 * True once a request to the API has failed at the network level (DNS/
 * connection refused -- fetch() itself throwing a TypeError), as opposed to
 * the server responding with an HTTP error status. Getting any HTTP
 * response at all, even a 4xx/5xx, proves the backend is reachable and
 * clears this. Without this distinction a dead backend looks identical to
 * an empty organization -- every page just shows "no data".
 */
export const backendUnreachableStore = createSimpleStore(false);
