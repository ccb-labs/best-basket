import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components (browser-side).
 * Call this inside components that have "use client" at the top.
 *
 * Why a function instead of a global variable?
 * The @supabase/ssr library manages a singleton internally, but wrapping
 * it in a function lets it handle cookie syncing properly.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
