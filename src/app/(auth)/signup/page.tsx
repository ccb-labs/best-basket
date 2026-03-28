"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Signup page — lets new users create an account with email and password.
 *
 * After signing up, Supabase sends a confirmation email (if enabled in
 * dashboard). The user clicks the link in the email, which redirects to
 * /auth/callback to complete the sign-up.
 */
export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignup() {
    const supabase = createClient();

    // For OAuth, signInWithOAuth handles both login and signup —
    // if the user doesn't have an account yet, Supabase creates one automatically.
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Show a success message — user needs to check their email
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // After successful signup, show a message instead of the form
  if (success) {
    return (
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-zinc-500">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-zinc-900 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold">
        Create your account
      </h1>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
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
            placeholder="At least 6 characters"
            required
            minLength={6}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
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
        onClick={handleGoogleSignup}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Sign up with Google
      </button>

      <p className="mt-4 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default SignupPage;
