"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * A button that signs the user out and redirects to the login page.
 *
 * "use client" is needed because we use useRouter() and onClick,
 * which only work in the browser.
 */
export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
    >
      Log out
    </button>
  );
}
