/**
 * Displays a single price entry (store name + price) with edit/delete.
 *
 * Same dual-mode pattern as ShoppingListCard and ListItemCard:
 * - View mode: shows "Lidl — €0.89" with edit/delete buttons
 * - Edit mode: price input with save/cancel buttons
 */
"use client";

import { useState, useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ItemPriceWithStore } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function ItemPriceRow({
  price,
  listId,
  updatePriceAction,
  deletePriceAction,
}: {
  /** The price entry to display (includes store name) */
  price: ItemPriceWithStore;
  /** The list ID — needed for revalidation */
  listId: string;
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
}) {
  const [isEditing, setIsEditing] = useState(false);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-600">
              {price.stores.name}
            </span>
            <span className="text-xs text-zinc-400">
              &euro;{Number(price.price).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1">
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
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
