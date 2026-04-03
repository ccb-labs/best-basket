/**
 * Collapsible section showing prices for a product.
 *
 * When collapsed, shows a summary (cheapest price or "No prices yet").
 * When expanded, shows all prices with edit/delete + a form to add more.
 *
 * Prices are on products (shared across lists), so if "Milk" costs €0.89
 * at Lidl, every list with "Milk" shows the same price.
 *
 * The "Best" price in the summary considers discounts — if a store has
 * a coupon that makes its price lower, that's reflected here.
 *
 * This component is placed below each ListItemCard in the list detail page.
 */
"use client";

import { useState } from "react";
import { ItemPriceRow } from "@/components/ItemPriceRow";
import { AddPriceForm } from "@/components/AddPriceForm";
import {
  calculateDiscountedPrice,
  getApplicableDiscounts,
} from "@/lib/discounts";
import type { Store, ItemPriceWithStore, Discount } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function ItemPricesSection({
  productId,
  listId,
  prices,
  stores,
  discounts,
  addPriceAction,
  updatePriceAction,
  deletePriceAction,
  addDiscountAction,
  updateDiscountAction,
  deleteDiscountAction,
}: {
  /** The product these prices belong to */
  productId: string;
  /** The list ID — needed for revalidation */
  listId: string;
  /** Existing prices for this product (with store names) */
  prices: ItemPriceWithStore[];
  /** All of the user's stores */
  stores: Store[];
  /** All discounts that could apply to these prices */
  discounts: Discount[];
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
  /** Server Action to add a discount */
  addDiscountAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to update a discount */
  updateDiscountAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete a discount */
  deleteDiscountAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Find the cheapest price considering discounts.
  // We track both the cheapest price object and its discounted value
  // in one pass to avoid recalculating after the reduce.
  let cheapest: ItemPriceWithStore | null = null;
  let cheapestDiscounted: number | null = null;

  if (prices.length > 0) {
    let minDiscounted = Infinity;
    for (const p of prices) {
      const d = calculateDiscountedPrice(
        Number(p.price),
        getApplicableDiscounts(p, discounts)
      );
      if (d < minDiscounted) {
        minDiscounted = d;
        cheapest = p;
        cheapestDiscounted = d;
      }
    }
  }

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
          {cheapest && cheapestDiscounted !== null
            ? `Best: €${cheapestDiscounted.toFixed(2)} at ${cheapest.stores.name}`
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
                  discounts={discounts}
                  updatePriceAction={updatePriceAction}
                  deletePriceAction={deletePriceAction}
                  addDiscountAction={addDiscountAction}
                  updateDiscountAction={updateDiscountAction}
                  deleteDiscountAction={deleteDiscountAction}
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
