/**
 * A card that displays a single store with view/edit modes.
 *
 * Same dual-mode pattern as ShoppingListCard:
 * - View mode: shows store name + edit/delete buttons
 * - Edit mode: input with save/cancel buttons
 *
 * Deleting a store also deletes all prices at that store (ON DELETE CASCADE),
 * so the confirmation dialog warns the user about this.
 */
"use client";

import { useState, useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { Store } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function StoreCard({
  store,
  updateAction,
  deleteAction,
}: {
  /** The store data to display */
  store: Store;
  /** Server Action to rename the store */
  updateAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete the store */
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

  const error = updateState.error || deleteState.error;

  return (
    <div className="p-3">
      {isEditing ? (
        // ─── Edit Mode ───
        <form action={updateFormAction} className="flex gap-2">
          <input type="hidden" name="id" value={store.id} />
          <input
            type="text"
            name="name"
            defaultValue={store.name}
            required
            autoFocus
            className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          />
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
        </form>
      ) : (
        // ─── View Mode ───
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-900">{store.name}</p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
              aria-label={`Edit ${store.name}`}
            >
              Edit
            </button>

            <form
              className="flex"
              action={deleteFormAction}
              onSubmit={(e) => {
                const confirmed = window.confirm(
                  `Delete "${store.name}"? All prices at this store will also be deleted.`
                );
                if (!confirmed) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={store.id} />
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
