import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createCategory, updateCategory, deleteCategory } from "../actions";
import { CategoryForm } from "@/components/CategoryForm";
import { CategoryCard } from "@/components/CategoryCard";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "My Categories" };

/**
 * Categories page — shows all categories available to the user.
 *
 * Categories come in two types:
 * - Default categories (user_id = null): shared across all users,
 *   cannot be edited or deleted (shown with a "Default" badge)
 * - User-created categories (user_id = current user): can be renamed
 *   or deleted. Deleting one sets items using it to "Uncategorized".
 *
 * The page follows the same layout pattern as the Stores page:
 * a creation form at the top, then the list of existing categories.
 */
export default async function CategoriesPage() {
  const supabase = await createClient();

  // Fetch all categories the user can see:
  // default ones (user_id = null) + the user's own categories.
  // RLS handles the filtering automatically.
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  const allCategories = (categories ?? []) as Category[];

  // Split into user-created and default categories so we can
  // show them in separate sections for clarity
  const userCategories = allCategories.filter((c) => c.user_id !== null);
  const defaultCategories = allCategories.filter((c) => c.user_id === null);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">My Categories</h2>

      {/* Form to add a new category — always visible at the top */}
      <CategoryForm createAction={createCategory} />

      {/* User-created categories — these can be edited and deleted */}
      {userCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-500">Your Categories</h3>
          {userCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              updateAction={updateCategory}
              deleteAction={deleteCategory}
            />
          ))}
        </div>
      )}

      {/* Default categories — read-only, shown for reference */}
      {defaultCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-500">
            Default Categories
          </h3>
          {defaultCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              updateAction={updateCategory}
              deleteAction={deleteCategory}
            />
          ))}
        </div>
      )}

      {/* Empty state when there are no categories at all */}
      {allCategories.length === 0 && (
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
