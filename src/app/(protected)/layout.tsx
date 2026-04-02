import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

/**
 * Layout for all protected pages (pages that require login).
 *
 * This is a Server Component — it runs on the server, not in the browser.
 * That means it can directly call the Supabase server client to check
 * if the user is logged in.
 *
 * It also renders a shared header with the app name and logout button,
 * so every protected page automatically gets the header.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getUser() checks with the Supabase server (not just local cookies),
  // so it's the most secure way to verify auth status.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Safety net: the proxy should redirect unauthenticated users,
  // but this is a backup just in case.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header bar shown on all protected pages */}
      {/* Header bar shown on all protected pages */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Best Basket</h1>
          {/* Navigation links for the main sections */}
          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              Lists
            </Link>
            <Link
              href="/stores"
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              Stores
            </Link>
            <Link
              href="/products"
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              Products
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <LogoutButton />
        </div>
      </header>

      {/* Main content area — max-w-lg keeps it readable on large screens */}
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}
