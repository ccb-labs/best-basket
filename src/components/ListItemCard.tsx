/**
 * Displays a single list item with view/edit mode toggle.
 *
 * Same dual-mode pattern as ShoppingListCard:
 * - View mode: shows item details + edit/delete buttons
 * - Edit mode: inline form with save/cancel buttons
 */
"use client";

import { useState, useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ListItemWithCategory, Category } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function ListItemCard({
  item,
  categories,
  updateAction,
  deleteAction,
}: {
  /** The item to display (includes joined category name) */
  item: ListItemWithCategory;
  /** Available categories for the edit dropdown */
  categories: Category[];
  /** Server Action to update the item */
  updateAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete the item */
  deleteAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const [updateState, updateFormAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await updateAction(previousState, formData);
      if (!result.error) {
        setIsEditing(false);
      }
      return result;
    },
    { error: null }
  );
  const [deleteState, deleteFormAction] = useActionState(deleteAction, {
    error: null,
  });

  // Format quantity + unit for display (e.g. "2 kg" or just "2")
  const quantityDisplay = item.unit
    ? `${item.quantity} ${item.unit}`
    : `${item.quantity}`;

  const error = updateState.error || deleteState.error;

  return (
    <div className="p-3">
      {isEditing ? (
        // ─── Edit Mode ───
        <form action={updateFormAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="list_id" value={item.list_id} />
          <input
            type="text"
            name="name"
            defaultValue={item.name}
            required
            autoFocus
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              name="quantity"
              defaultValue={item.quantity}
              min={0.01}
              step="any"
              className="w-20 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
            />
            <input
              type="text"
              name="unit"
              defaultValue={item.unit ?? ""}
              placeholder="kg, L, pack..."
              className="w-28 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
            />
            <select
              name="category_id"
              defaultValue={item.category_id ?? ""}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <SubmitButton
              label="Save"
              pendingLabel="Saving..."
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        // ─── View Mode ───
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">{item.name}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-zinc-400">{quantityDisplay}</p>
              {item.categories && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                  {item.categories.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
              aria-label={`Edit ${item.name}`}
            >
              Edit
            </button>

            <form
              className="flex"
              action={deleteFormAction}
              onSubmit={(e) => {
                const confirmed = window.confirm(
                  `Delete "${item.name}"? This cannot be undone.`
                );
                if (!confirmed) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="list_id" value={item.list_id} />
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
