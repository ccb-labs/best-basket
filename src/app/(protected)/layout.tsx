import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileNav } from "@/components/MobileNav";
import { NAV_LINKS } from "@/lib/constants";

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

  // Bootstrap default categories into the user's account.
  // The RPC copies the shared defaults (user_id = null) so the user
  // owns them and can edit/delete freely. It's idempotent (uses
  // ON CONFLICT DO NOTHING), so we call it on every protected page
  // load — a handful of conflict-skipped inserts is cheaper than a
  // fragile "have they been bootstrapped yet?" gate, and it ensures
  // every user always has their defaults.
  await supabase.rpc("bootstrap_user_categories", {
    target_user_id: user.id,
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header bar shown on all protected pages */}
      <header className="relative flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Best Basket</h1>
          {/* Desktop navigation — hidden on small screens */}
          <nav className="hidden items-center gap-3 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        {/* Desktop user info — hidden on small screens */}
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <LogoutButton />
        </div>
        {/* Mobile hamburger menu — visible only on small screens */}
        <MobileNav userEmail={user.email ?? ""} logoutButton={<LogoutButton />} />
      </header>

      {/* Main content area — max-w-lg keeps it readable on large screens */}
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}
