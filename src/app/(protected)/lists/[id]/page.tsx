import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * List detail page — shows a single shopping list.
 *
 * For now this is a placeholder. In Phase 3, this will show the list's
 * items with the ability to add, edit, and delete products.
 *
 * This is a dynamic route — the [id] in the folder name means Next.js
 * will pass the list ID from the URL as params.id. For example,
 * /lists/abc-123 will have params.id = "abc-123".
 */
export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // In Next.js 15+, params is a Promise that we need to await
  const { id } = await params;

  const supabase = await createClient();

  // Fetch this specific list — RLS ensures we can only see our own lists
  const { data: list } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("id", id)
    .single();

  // If the list doesn't exist (or doesn't belong to this user), show 404
  if (!list) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; Back to lists
      </Link>

      <h2 className="mt-3 text-xl font-semibold">{list.name}</h2>

      <p className="mt-4 text-zinc-500">
        List items will appear here. Coming in Phase 3!
      </p>
    </div>
  );
}
