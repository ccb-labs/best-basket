/**
 * Displays a single discount with view/edit/delete modes.
 *
 * Same dual-mode pattern as ItemPriceRow:
 * - View mode: shows "10% off — Spring Sale" with edit/delete buttons
 * - Edit mode: type select, value input, description input, save/cancel
 */
"use client";

import { useState, useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDiscountLabel } from "@/lib/discounts";
import type { Discount } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function StoreDiscountRow({
  discount,
  listId,
  updateDiscountAction,
  deleteDiscountAction,
}: {
  /** The discount to display */
  discount: Discount;
  /** Optional list ID for revalidation (when shown on list detail page) */
  listId?: string;
  /** Server Action to update the discount */
  updateDiscountAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete the discount */
  deleteDiscountAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const [updateState, updateFormAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await updateDiscountAction(previousState, formData);
      if (!result.error) {
        setIsEditing(false);
      }
      return result;
    },
    { error: null }
  );
  const [deleteState, deleteFormAction] = useActionState(
    deleteDiscountAction,
    { error: null }
  );

  const error = updateState.error || deleteState.error;

  const label = formatDiscountLabel(discount);

  return (
    <div className="flex flex-col">
      {isEditing ? (
        // ─── Edit Mode ───
        <form action={updateFormAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={discount.id} />
          {listId && <input type="hidden" name="list_id" value={listId} />}

          <div className="flex items-center gap-2">
            <select
              name="type"
              defaultValue={discount.type}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
            >
              <option value="percentage">%</option>
              <option value="fixed">€</option>
            </select>
            <input
              type="number"
              name="value"
              defaultValue={discount.value}
              min={0}
              step="0.01"
              required
              autoFocus
              className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
            />
            <input
              type="text"
              name="description"
              defaultValue={discount.description ?? ""}
              placeholder="Description"
              className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </form>
      ) : (
        // ─── View Mode ───
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-700">
            {label}
            {discount.description ? ` — ${discount.description}` : ""}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              aria-label="Edit discount"
            >
              Edit
            </button>

            <form
              className="flex"
              action={deleteFormAction}
              onSubmit={(e) => {
                const confirmed = window.confirm("Delete this discount?");
                if (!confirmed) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={discount.id} />
              {listId && <input type="hidden" name="list_id" value={listId} />}
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
