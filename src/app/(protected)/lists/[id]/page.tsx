import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchListPageData } from "@/lib/list-data";
import { AddItemForm } from "@/components/AddItemForm";
import { ListItemCard } from "@/components/ListItemCard";
import { ItemPricesSection } from "@/components/ItemPricesSection";
import { EmptyItemState } from "@/components/EmptyItemState";
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
} from "@/app/(protected)/actions";
import type { ListItemWithCategory } from "@/lib/types";

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

  const { list, items, categories, stores, pricesByProduct, allDiscounts } =
    data;

  // Group items by category name so we can render them in sections.
  // Items without a category go into "Uncategorized".
  const grouped = new Map<string, ListItemWithCategory[]>();
  for (const item of items) {
    const categoryName = item.categories?.name ?? "Uncategorized";
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, []);
    }
    grouped.get(categoryName)!.push(item);
  }

  // Sort the groups alphabetically, but put "Uncategorized" last
  const sortedGroups = [...grouped.entries()].sort(([a], [b]) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; Back to lists
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{list.name}</h2>

        {/* Show "Compare Prices" link only when there are prices to compare */}
        {pricesByProduct.size > 0 && (
          <Link
            href={`/lists/${id}/compare`}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Compare Prices
          </Link>
        )}
      </div>

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
