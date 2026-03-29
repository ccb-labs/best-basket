"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Login page — lets users sign in with email and password.
 *
 * "use client" at the top makes this a Client Component, which means it
 * runs in the browser. We need this because the form uses useState and
 * event handlers, which only work in the browser.
 */
export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    const supabase = createClient();

    // signInWithOAuth redirects the user to Google's consent screen.
    // After they approve, Google sends them back to our /auth/callback route,
    // which exchanges the code for a session.
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleLogin(e: React.FormEvent) {
    // Prevent the browser from refreshing the page on form submit
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      // Ask Supabase to check the email + password
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Show the error message from Supabase (e.g., "Invalid login credentials")
        setError(error.message);
        return;
      }

      // Login successful — go to the home page
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold">
        Sign in to Best Basket
      </h1>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        {/* Show error message if login fails */}
        {error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Divider between email form and Google button */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-sm text-zinc-400">or</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      {/* Google OAuth button */}
      <button
        onClick={handleGoogleLogin}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Sign in with Google
      </button>

      <p className="mt-4 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-zinc-900 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

// Next.js needs a default export for page files
export default LoginPage;
