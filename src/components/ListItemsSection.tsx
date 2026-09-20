/**
 * Client wrapper around the grouped item cards on the list detail page.
 *
 * This is a Client Component so we can hold the search query in state and
 * filter items by name as the user types or speaks. Server Actions for
 * editing items, prices, and discounts are still defined in the server
 * actions module — they're just passed in as props (Next.js serializes
 * server action references across the server/client boundary).
 */
"use client";

import { useState } from "react";
import { ListItemCard } from "@/components/ListItemCard";
import { ItemPricesSection } from "@/components/ItemPricesSection";
import { SearchInput } from "@/components/SearchInput";
import {
  filterItemsByName,
  groupItemsByCategory,
  splitCheckedItems,
} from "@/lib/list-helpers";
import type {
  ListItemWithCategory,
  Category,
  Unit,
  Store,
  ItemPriceWithStore,
  Discount,
} from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

type ServerAction = (
  previousState: ActionResult,
  formData: FormData
) => Promise<ActionResult>;

export function ListItemsSection({
  listId,
  items,
  categories,
  units,
  stores,
  pricesByProduct,
  allDiscounts,
  categorySortByName,
  updateItemAction,
  deleteItemAction,
  addPriceAction,
  updatePriceAction,
  deletePriceAction,
  addDiscountAction,
  updateDiscountAction,
  deleteDiscountAction,
}: {
  listId: string;
  items: ListItemWithCategory[];
  categories: Category[];
  units: Unit[];
  stores: Store[];
  /** Prices keyed by product_id. A plain object (not a Map) because
   *  Maps don't serialize from Server to Client Components. */
  pricesByProduct: Record<string, ItemPriceWithStore[]>;
  allDiscounts: Discount[];
  categorySortByName?: Record<string, number>;
  updateItemAction: ServerAction;
  deleteItemAction: ServerAction;
  addPriceAction: ServerAction;
  updatePriceAction: ServerAction;
  deletePriceAction: ServerAction;
  addDiscountAction: ServerAction;
  updateDiscountAction: ServerAction;
  deleteDiscountAction: ServerAction;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = filterItemsByName(items, searchQuery);

  // Items already checked off are pulled out of the category groups and
  // shown in their own "Already Picked Up" section at the bottom — the same
  // behaviour as the "Done" section in shopping mode. This keeps everything
  // still to buy at the top of the screen, where it's easiest to reach.
  const { remainingItems, doneItems } = splitCheckedItems(filteredItems);

  const sortedGroups = groupItemsByCategory(remainingItems, categorySortByName);

  // Both sections render the exact same card, so we define it once here as a
  // small local function instead of repeating the JSX twice.
  function renderItemCard(item: ListItemWithCategory) {
    return (
      <div key={item.id} className="rounded-md border border-zinc-200 bg-white">
        <ListItemCard
          item={item}
          categories={categories}
          units={units}
          updateAction={updateItemAction}
          deleteAction={deleteItemAction}
        />
        {item.product_id && (
          <ItemPricesSection
            productId={item.product_id}
            listId={listId}
            prices={pricesByProduct[item.product_id] ?? []}
            stores={stores}
            discounts={allDiscounts}
            addPriceAction={addPriceAction}
            updatePriceAction={updatePriceAction}
            deletePriceAction={deletePriceAction}
            addDiscountAction={addDiscountAction}
            updateDiscountAction={updateDiscountAction}
            deleteDiscountAction={deleteDiscountAction}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search items..."
      />

      {sortedGroups.length === 0 && doneItems.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">
          No items match &ldquo;{searchQuery}&rdquo;.
        </p>
      ) : (
        <>
          {/* Items still to buy, grouped by category */}
          {sortedGroups.length > 0 && (
            <div className="flex flex-col gap-6">
              {sortedGroups.map(([categoryName, groupItems]) => (
                <div key={categoryName}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {categoryName}
                  </p>
                  <div className="flex flex-col gap-2">
                    {groupItems.map((item) => renderItemCard(item))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Already Picked Up — checked items collected at the bottom,
              most recently checked first (same as "Done" in shopping mode) */}
          {doneItems.length > 0 && (
            <div>
              {sortedGroups.length > 0 && (
                <hr className="mb-4 border-zinc-200" />
              )}
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">
                Already Picked Up ({doneItems.length})
              </p>
              <div className="flex flex-col gap-2">
                {doneItems.map((item) => renderItemCard(item))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
