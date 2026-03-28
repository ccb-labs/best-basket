import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback Route Handler.
 *
 * When a user clicks a confirmation email link or completes Google OAuth,
 * Supabase redirects them to this URL with a "code" parameter.
 * This route exchanges that code for a session (access + refresh tokens),
 * then redirects the user to the home page.
 *
 * You must add this URL to Supabase dashboard:
 * Authentication > URL Configuration > Redirect URLs > http://localhost:3000/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Session created successfully — send user to the home page
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Something went wrong — redirect to login with an error indicator
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
