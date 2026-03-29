import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy runs on every request before the page loads.
 * (Next.js 16 renamed "middleware" to "proxy" — same concept, new name.)
 *
 * What does it do?
 * 1. Refreshes the user's auth token if it has expired (keeps them logged in)
 * 2. Redirects unauthenticated users to /login (protects private pages)
 *
 * Without this proxy, users would get randomly logged out when their
 * short-lived access token expires.
 */
export async function proxy(request: NextRequest) {
  // Start with the default "pass through" response
  let supabaseResponse = NextResponse.next({ request });

  // Create a Supabase client that can read/write cookies on the request/response.
  // This is different from the server.ts client because middleware has access to
  // both the incoming request and the outgoing response.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request (so downstream server code sees them)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Also set cookies on the response (so the browser stores them)
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This call refreshes the session if the access token has expired.
  // IMPORTANT: Do NOT remove this line — it keeps the user logged in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the user is NOT logged in and tries to access a protected page,
  // redirect them to the login page.
  // Pages that don't require login: /login, /signup, /auth/*
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/signup") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Tell Next.js which routes the proxy should run on.
// This pattern excludes static files, images, and the favicon so the
// middleware only runs on actual page/API requests.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
