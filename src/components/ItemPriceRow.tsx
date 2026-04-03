/**
 * Displays a single price entry (store name + price) with edit/delete.
 *
 * Also shows any discounts that apply to this price:
 * - Store-level discounts are shown as read-only labels (edited on Stores page)
 * - Product-level discounts can be edited/deleted inline
 * - When discounts apply, shows the original price crossed out and the
 *   discounted price in green
 */
"use client";

import { useState, useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { StoreDiscountRow } from "@/components/StoreDiscountRow";
import { AddDiscountForm } from "@/components/AddDiscountForm";
import {
  calculateDiscountedPrice,
  getApplicableDiscounts,
  formatDiscountLabel,
} from "@/lib/discounts";
import type { Discount, ItemPriceWithStore } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function ItemPriceRow({
  price,
  listId,
  discounts,
  updatePriceAction,
  deletePriceAction,
  addDiscountAction,
  updateDiscountAction,
  deleteDiscountAction,
}: {
  /** The price entry to display (includes store name) */
  price: ItemPriceWithStore;
  /** The list ID — needed for revalidation */
  listId: string;
  /** All discounts that could apply to this price */
  discounts: Discount[];
  /** Server Action to update the price */
  updatePriceAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete the price */
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
  const [isEditing, setIsEditing] = useState(false);
  const [showAddDiscount, setShowAddDiscount] = useState(false);

  const [updateState, updateFormAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await updatePriceAction(previousState, formData);
      if (!result.error) {
        setIsEditing(false);
      }
      return result;
    },
    { error: null }
  );
  const [deleteState, deleteFormAction] = useActionState(deletePriceAction, {
    error: null,
  });

  const error = updateState.error || deleteState.error;

  // Find all discounts that apply to this specific price
  const applicableDiscounts = getApplicableDiscounts(price, discounts);
  const discountedPrice = calculateDiscountedPrice(
    Number(price.price),
    applicableDiscounts
  );
  const hasDiscount = applicableDiscounts.length > 0;

  // Split discounts into store-level (read-only here) and product-level (editable)
  const storeDiscounts = applicableDiscounts.filter(
    (d) => d.item_price_id === null
  );
  const productDiscounts = applicableDiscounts.filter(
    (d) => d.item_price_id !== null
  );

  return (
    <div className="flex flex-col">
      {isEditing ? (
        // ─── Edit Mode ───
        <form action={updateFormAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={price.id} />
          <input type="hidden" name="list_id" value={listId} />
          <span className="text-xs text-zinc-500">{price.stores.name}</span>
          <input
            type="number"
            name="price"
            defaultValue={price.price}
            min={0}
            step="0.01"
            required
            autoFocus
            className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
          />
          <SubmitButton
            label="Save"
            pendingLabel="..."
            className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
        </form>
      ) : (
        // ─── View Mode ───
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-600">
                {price.stores.name}
              </span>
              {hasDiscount ? (
                <>
                  <span className="text-xs text-zinc-300 line-through">
                    &euro;{Number(price.price).toFixed(2)}
                  </span>
                  <span className="text-xs font-medium text-green-600">
                    &euro;{discountedPrice.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-xs text-zinc-400">
                  &euro;{Number(price.price).toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddDiscount(!showAddDiscount)}
                className="rounded-md px-1.5 py-0.5 text-xs text-green-600 hover:bg-green-50"
                aria-label={`Add discount at ${price.stores.name}`}
              >
                {showAddDiscount ? "Cancel" : "+ Discount"}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-md px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                aria-label={`Edit price at ${price.stores.name}`}
              >
                Edit
              </button>

              <form
                className="flex"
                action={deleteFormAction}
                onSubmit={(e) => {
                  const confirmed = window.confirm(
                    `Delete price at ${price.stores.name}?`
                  );
                  if (!confirmed) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={price.id} />
                <input type="hidden" name="list_id" value={listId} />
                <button
                  type="submit"
                  className="rounded-md px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>

          {/* Store-level discounts — read-only labels (managed on Stores page) */}
          {storeDiscounts.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {storeDiscounts.map((d) => (
                <span
                  key={d.id}
                  className="rounded-full bg-green-50 px-1.5 py-0.5 text-xs text-green-700"
                >
                  Store: {formatDiscountLabel(d)}
                  {d.description ? ` — ${d.description}` : ""}
                </span>
              ))}
            </div>
          )}

          {/* Product-level discounts — editable via StoreDiscountRow */}
          {productDiscounts.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {productDiscounts.map((d) => (
                <StoreDiscountRow
                  key={d.id}
                  discount={d}
                  listId={listId}
                  updateDiscountAction={updateDiscountAction}
                  deleteDiscountAction={deleteDiscountAction}
                />
              ))}
            </div>
          )}

          {/* Inline form to add a product-level discount */}
          {showAddDiscount && (
            <div className="mt-1">
              <AddDiscountForm
                storeId={price.store_id}
                itemPriceId={price.id}
                listId={listId}
                addDiscountAction={addDiscountAction}
              />
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
