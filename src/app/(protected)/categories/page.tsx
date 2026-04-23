import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createCategory, updateCategory, deleteCategory } from "../actions";
import { CategoryForm } from "@/components/CategoryForm";
import { CategoryCard } from "@/components/CategoryCard";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "My Categories" };

/**
 * Categories page — shows the user's categories.
 *
 * All categories are user-owned. Default categories (like "Bebidas",
 * "Frutas", etc.) are copied into each user's account by the
 * bootstrap_user_categories() database function — the protected
 * layout calls it on every page load (it's idempotent), so every
 * user always has their defaults and can freely rename or delete them.
 *
 * The page follows the same layout pattern as the Stores page:
 * a creation form at the top, then the list of existing categories.
 */
export default async function CategoriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch only the current user's categories (all editable)
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user!.id)
    .order("name");

  const userCategories = (categories ?? []) as Category[];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">My Categories</h2>

      {/* Form to add a new category — always visible at the top */}
      <CategoryForm createAction={createCategory} />

      {/* List of categories — all editable and deletable */}
      {userCategories.length > 0 ? (
        <div className="flex flex-col gap-2">
          {userCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              updateAction={updateCategory}
              deleteAction={deleteCategory}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-lg font-medium text-zinc-400">
            No categories yet
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Add your first category above to organize your shopping items!
          </p>
        </div>
      )}
    </div>
  );
}
