import { createClient } from "@/lib/supabase/server";
import { createList, updateList, deleteList } from "./actions";
import { ShoppingListForm } from "@/components/ShoppingListForm";
import { ShoppingListCard } from "@/components/ShoppingListCard";
import { SharedListCard } from "@/components/SharedListCard";
import { EmptyListState } from "@/components/EmptyListState";
import { TemplateReminderBanner } from "@/components/TemplateReminderBanner";
import type { ShoppingList, SharedList } from "@/lib/types";

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

  // Fetch the current user (needed to filter owned lists)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch owned lists, shared lists, and recurring templates in parallel.
  // - Owned lists: filter by user_id explicitly so RLS-visible shared lists
  //   aren't included (we show those separately with owner email from the RPC).
  // - Shared lists: uses a database function that joins auth.users for email.
  // - Recurring templates: templates with a recurrence set, for reminder banners.
  const [{ data: lists }, { data: sharedListsData }, { data: recurringData }] =
    await Promise.all([
      supabase
        .from("shopping_lists")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_template", false)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_shared_lists"),
      supabase
        .from("shopping_lists")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_template", true)
        .not("recurrence", "is", null),
    ]);

  const shoppingLists = (lists ?? []) as ShoppingList[];
  const sharedLists = (sharedListsData ?? []) as SharedList[];
  const recurringTemplates = (recurringData ?? []) as ShoppingList[];

  // Find templates that are "due" — their recurrence period has passed.
  // We compare last_used_at (or created_at if never used) against the threshold.
  const now = new Date();
  const dueTemplates = recurringTemplates.filter((t) => {
    const lastUsed = new Date(t.last_used_at ?? t.created_at);
    const daysSinceUse =
      (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    if (t.recurrence === "weekly") return daysSinceUse >= 7;
    if (t.recurrence === "monthly") return daysSinceUse >= 30;
    return false;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Reminder banners for templates that are due */}
      <TemplateReminderBanner dueTemplates={dueTemplates} />

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

      {/* Lists that other users have shared with the current user */}
      {sharedLists.length > 0 && (
        <>
          <h2 className="mt-6 text-xl font-semibold">Shared with me</h2>
          <div className="flex flex-col gap-2">
            {sharedLists.map((list) => (
              <SharedListCard key={list.id} list={list} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
