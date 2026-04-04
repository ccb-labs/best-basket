import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchListPageData } from "@/lib/list-data";
import { AddItemForm } from "@/components/AddItemForm";
import { ListItemCard } from "@/components/ListItemCard";
import { ItemPricesSection } from "@/components/ItemPricesSection";
import { EmptyItemState } from "@/components/EmptyItemState";
import { ShareListSection } from "@/components/ShareListSection";
import { SubmitButton } from "@/components/SubmitButton";
import { ActionFormButton } from "@/components/ActionFormButton";
import {
  addItem,
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
} from "@/app/(protected)/actions";
import { groupItemsByCategory } from "@/lib/list-helpers";

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
    stores,
    pricesByProduct,
    allDiscounts,
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

  // Group items by category name so we can render them in sections
  const sortedGroups = groupItemsByCategory(items);

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
            <Link
              href={`/lists/${id}/shop`}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Start Shopping
            </Link>
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
          addItemAction={addItem}
          createCategoryAction={createCategory}
        />
      </div>

      {/* List items grouped by category, or empty state */}
      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyItemState />
        ) : (
          <div className="flex flex-col gap-6">
            {sortedGroups.map(([categoryName, groupItems]) => (
              <div key={categoryName}>
                {/* Category heading */}
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {categoryName}
                </p>
                <div className="flex flex-col gap-2">
                  {groupItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-zinc-200 bg-white"
                    >
                      {/* Item details (name, quantity, category, edit/delete) */}
                      <ListItemCard
                        item={item}
                        categories={categories}
                        updateAction={updateItem}
                        deleteAction={deleteItem}
                      />
                      {/* Prices section — only shown if item has a product link */}
                      {item.product_id && (
                        <ItemPricesSection
                          productId={item.product_id}
                          listId={id}
                          prices={pricesByProduct.get(item.product_id) ?? []}
                          stores={stores}
                          discounts={allDiscounts}
                          addPriceAction={addPrice}
                          updatePriceAction={updatePrice}
                          deletePriceAction={deletePrice}
                          addDiscountAction={addDiscount}
                          updateDiscountAction={updateDiscount}
                          deleteDiscountAction={deleteDiscount}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
