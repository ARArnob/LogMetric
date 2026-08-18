import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Lazily-created singleton. Undefined when the two env vars aren't set
 * (e.g. demo mode, or before the Supabase project is provisioned) so
 * callers can no-op instead of crashing the app.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : undefined;
