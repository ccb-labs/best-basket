import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchListPageData } from "@/lib/list-data";
import { AddItemForm } from "@/components/AddItemForm";
import { ListItemsSection } from "@/components/ListItemsSection";
import { EmptyItemState } from "@/components/EmptyItemState";
import { ShareListSection } from "@/components/ShareListSection";
import { SubmitButton } from "@/components/SubmitButton";
import { ActionFormButton } from "@/components/ActionFormButton";
import { CategorySortEditor } from "@/components/CategorySortEditor";
import {
  addItem,
  addItemToMultipleLists,
  updateItem,
  deleteItem,
  createCategory,
  addPrice,
  updatePrice,
  deletePrice,
  addDiscount,
  updateDiscount,
  deleteDiscount,
  shareList,
  unshareList,
  saveAsTemplate,
  createListFromTemplate,
  saveCategorySortOrder,
} from "@/app/(protected)/actions";

/**
 * List detail page — shows a shopping list's items with the ability
 * to add, edit, delete, and categorize products.
 *
 * Also shows prices per item at different stores (Phase 4).
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

  // Fetch all list data using the shared helper (also used by the compare page)
  const data = await fetchListPageData(id);

  // If the list doesn't exist (or doesn't belong to this user), show 404
  if (!data) {
    notFound();
  }

  const {
    list,
    items,
    categories,
    units,
    stores,
    pricesByProduct,
    allDiscounts,
    categorySortByName,
    isOwner,
  } = data;

  // Fetch the list of shared users (only returns results for the owner)
  let shares: { id: string; user_id: string; email: string }[] = [];
  if (isOwner) {
    const supabase = await createClient();
    const { data: sharesData } = await supabase.rpc(
      "get_list_shares_with_email",
      { p_list_id: id }
    );
    shares = sharesData ?? [];
  }

  // When viewing a template, fetch the user's shopping lists so the
  // "Also add to these lists?" dialog can show them after adding an item.
  let userLists: { id: string; name: string; source_template_id: string | null }[] = [];
  if (list.is_template) {
    const supabase = await createClient();
    const { data: listsData } = await supabase
      .from("shopping_lists")
      .select("id, name, source_template_id")
      .eq("is_template", false)
      .order("created_at", { ascending: false });
    userLists = (listsData ?? []) as typeof userLists;
  }

  // Convert the prices Map into a plain object so it can be passed to a
  // Client Component (Maps aren't serializable across the server/client boundary).
  const pricesByProductObj = Object.fromEntries(pricesByProduct);

  // Build the list of categories actually used in this list (for the reorder UI).
  // We need both the category ID and name so the editor can save by ID.
  const usedCategories = items.reduce<{ id: string; name: string }[]>(
    (acc, item) => {
      if (item.category_id && item.categories && !acc.some((c) => c.id === item.category_id)) {
        acc.push({ id: item.category_id, name: item.categories.name });
      }
      return acc;
    },
    []
  );

  return (
    <div>
      {/* Back link — goes to /templates when viewing a template, / otherwise */}
      <Link
        href={list.is_template ? "/templates" : "/"}
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; {list.is_template ? "Back to templates" : "Back to lists"}
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <h2 className="text-xl font-semibold">{list.name}</h2>
        {/* Recurrence badge — shown on templates with a schedule */}
        {list.is_template && list.recurrence && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            {list.recurrence === "weekly" ? "Weekly" : "Monthly"}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {/* Regular list buttons — shopping and compare */}
          {!list.is_template && items.length > 0 && (
            <>
              <Link
                href={`/lists/${id}/shop`}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Start Shopping
              </Link>
              <Link
                href={`/lists/${id}/shop?mode=live`}
                className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
              >
                Start Live Shopping
              </Link>
            </>
          )}

          {!list.is_template && pricesByProduct.size > 0 && (
            <Link
              href={`/lists/${id}/compare`}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Compare Prices
            </Link>
          )}

          {/* Use Template — creates a new list and redirects to it.
              Uses a plain form (not ActionFormButton) because the server
              action calls redirect(), which doesn't return a result.
              .bind(null, ...) pre-fills the previousState argument so the
              form only needs to pass formData. */}
          {list.is_template && (
            <form action={createListFromTemplate.bind(null, { error: null }) as unknown as (formData: FormData) => void}>
              <input type="hidden" name="template_id" value={id} />
              <SubmitButton
                label="Use Template"
                pendingLabel="Creating..."
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              />
            </form>
          )}

          {/* Save as Template — only on regular lists the user owns */}
          {!list.is_template && isOwner && (
            <ActionFormButton
              action={saveAsTemplate}
              hiddenInputName="list_id"
              hiddenInputValue={id}
              label="Save as Template"
              pendingLabel="Saving..."
              successMessage="Template saved!"
              buttonClassName="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            />
          )}
      </div>

      {/* Share management — only visible to the list owner */}
      {isOwner && (
        <div className="mt-3">
          <ShareListSection
            listId={id}
            shares={shares}
            shareAction={shareList}
            unshareAction={unshareList}
          />
        </div>
      )}

      {/* Badge for shared users so they know who owns the list */}
      {!isOwner && (
        <p className="mt-2 text-xs text-zinc-400">
          Shared with you — you can view and edit items
        </p>
      )}

      {/* Form to add new items — always visible at the top */}
      <div className="mt-4">
        <AddItemForm
          listId={id}
          categories={categories}
          units={units}
          addItemAction={addItem}
          createCategoryAction={createCategory}
          templateConfig={list.is_template && userLists.length > 0 ? {
            userLists,
            addToMultipleListsAction: addItemToMultipleLists,
          } : undefined}
        />
      </div>

      {/* Category reorder editor — only when there are categorized items */}
      {usedCategories.length > 1 && (
        <div className="mt-4">
          <CategorySortEditor
            listId={id}
            usedCategories={usedCategories}
            currentSortOrder={categorySortByName}
            saveAction={saveCategorySortOrder}
          />
        </div>
      )}

      {/* List items grouped by category, or empty state.
          The interactive list (with the search box and voice button) lives
          inside ListItemsSection — a Client Component — because it needs
          local state to filter as the user types. */}
      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyItemState />
        ) : (
          <ListItemsSection
            listId={id}
            items={items}
            categories={categories}
            units={units}
            stores={stores}
            pricesByProduct={pricesByProductObj}
            allDiscounts={allDiscounts}
            categorySortByName={categorySortByName}
            updateItemAction={updateItem}
            deleteItemAction={deleteItem}
            addPriceAction={addPrice}
            updatePriceAction={updatePrice}
            deletePriceAction={deletePrice}
            addDiscountAction={addDiscount}
            updateDiscountAction={updateDiscount}
            deleteDiscountAction={deleteDiscount}
          />
        )}
      </div>
    </div>
  );
}
