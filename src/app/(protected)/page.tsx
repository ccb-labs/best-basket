import { createClient } from "@/lib/supabase/server";
import { createList, updateList, deleteList } from "./actions";
import { ShoppingListForm } from "@/components/ShoppingListForm";
import { ShoppingListCard } from "@/components/ShoppingListCard";
import { EmptyListState } from "@/components/EmptyListState";
import type { ShoppingList } from "@/lib/types";

/**
 * Home page — shows the user's shopping lists.
 *
 * This is a Server Component, which means it runs on the server and can
 * fetch data directly from the database. The HTML arrives with the data
 * already rendered — no loading spinners needed!
 *
 * The interactive parts (create form, edit/delete buttons) are Client
 * Components that receive Server Actions as props.
 */
export default async function HomePage() {
  const supabase = await createClient();

  // Fetch all shopping lists for the current user, newest first.
  // We filter out templates (is_template = false) since those are
  // a separate feature for a later phase.
  // RLS ensures we only get the logged-in user's lists.
  const { data: lists } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("is_template", false)
    .order("created_at", { ascending: false });

  // Cast to our TypeScript type for proper autocomplete
  const shoppingLists = (lists ?? []) as ShoppingList[];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">My Shopping Lists</h2>

      {/* Form to create a new list — always visible at the top */}
      <ShoppingListForm createAction={createList} />

      {/* Show the lists, or an empty state if there are none */}
      {shoppingLists.length === 0 ? (
        <EmptyListState />
      ) : (
        <div className="flex flex-col gap-2">
          {shoppingLists.map((list) => (
            <ShoppingListCard
              key={list.id}
              list={list}
              updateAction={updateList}
              deleteAction={deleteList}
            />
          ))}
        </div>
      )}
    </div>
  );
}
