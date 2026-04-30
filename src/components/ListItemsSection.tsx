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
import { filterItemsByName, groupItemsByCategory } from "@/lib/list-helpers";
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
  const sortedGroups = groupItemsByCategory(filteredItems, categorySortByName);

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search items..."
      />

      {sortedGroups.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">
          No items match &ldquo;{searchQuery}&rdquo;.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedGroups.map(([categoryName, groupItems]) => (
            <div key={categoryName}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {categoryName}
              </p>
              <div className="flex flex-col gap-2">
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-zinc-200 bg-white"
                  >
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
