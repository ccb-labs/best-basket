/**
 * Collapsible section showing prices for a product.
 *
 * When collapsed, shows a summary (cheapest price or "No prices yet").
 * When expanded, shows all prices with edit/delete + a form to add more.
 *
 * Prices are on products (shared across lists), so if "Milk" costs €0.89
 * at Lidl, every list with "Milk" shows the same price.
 *
 * This component is placed below each ListItemCard in the list detail page.
 */
"use client";

import { useState } from "react";
import { ItemPriceRow } from "@/components/ItemPriceRow";
import { AddPriceForm } from "@/components/AddPriceForm";
import type { Store, ItemPriceWithStore } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function ItemPricesSection({
  productId,
  listId,
  prices,
  stores,
  addPriceAction,
  updatePriceAction,
  deletePriceAction,
}: {
  /** The product these prices belong to */
  productId: string;
  /** The list ID — needed for revalidation */
  listId: string;
  /** Existing prices for this product (with store names) */
  prices: ItemPriceWithStore[];
  /** All of the user's stores */
  stores: Store[];
  /** Server Action to add a price */
  addPriceAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to update a price */
  updatePriceAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete a price */
  deletePriceAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Find the cheapest price to show in the summary
  const cheapest =
    prices.length > 0
      ? prices.reduce((min, p) =>
          Number(p.price) < Number(min.price) ? p : min
        )
      : null;

  // Sort prices by store name for consistent display
  const sortedPrices = [...prices].sort((a, b) =>
    a.stores.name.localeCompare(b.stores.name)
  );

  return (
    <div className="border-t border-zinc-100 px-3 pb-2">
      {/* Clickable summary row — toggles expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-1.5 text-left"
      >
        <span className="text-xs text-zinc-400">
          {cheapest
            ? `Best: €${Number(cheapest.price).toFixed(2)} at ${cheapest.stores.name}`
            : "No prices yet"}
        </span>
        <span className="text-xs text-zinc-300">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded content: list of prices + add form */}
      {isExpanded && (
        <div className="flex flex-col gap-2 pb-1">
          {/* Existing prices */}
          {sortedPrices.length > 0 && (
            <div className="flex flex-col gap-1">
              {sortedPrices.map((price) => (
                <ItemPriceRow
                  key={price.id}
                  price={price}
                  listId={listId}
                  updatePriceAction={updatePriceAction}
                  deletePriceAction={deletePriceAction}
                />
              ))}
            </div>
          )}

          {/* Form to add a new price */}
          <AddPriceForm
            productId={productId}
            listId={listId}
            stores={stores}
            existingPrices={prices}
            addPriceAction={addPriceAction}
          />
        </div>
      )}
    </div>
  );
}
