import { createClient } from "@/lib/supabase/server";

/**
 * Home page — the first page users see after logging in.
 *
 * For now it just shows a welcome message. In Phase 2, this will display
 * the user's shopping lists.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Extract the part before @ to use as a display name
  const displayName = user?.email?.split("@")[0] ?? "there";

  return (
    <div>
      <h2 className="text-xl font-semibold">Welcome, {displayName}!</h2>
      <p className="mt-2 text-zinc-500">
        Your shopping lists will appear here. Coming in Phase 2!
      </p>
    </div>
  );
}
