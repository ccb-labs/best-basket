import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use on the server side — Server Components,
 * Route Handlers, and Server Actions.
 *
 * Why is this function async?
 * In Next.js 15+, the cookies() function returns a Promise, so we need
 * to await it before we can read or write cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies from the request
        getAll() {
          return cookieStore.getAll();
        },
        // Write cookies back to the response
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // This is called from Server Components where cookies can't
            // be modified. That's fine — the middleware handles token refresh.
          }
        },
      },
    }
  );
}
