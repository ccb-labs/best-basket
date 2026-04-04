/**
 * A card that displays a single shopping list.
 *
 * Has two modes:
 * 1. View mode (default) — shows the list name as a link, creation date,
 *    and edit/delete buttons.
 * 2. Edit mode — the name becomes an input field with save/cancel buttons.
 *
 * "use client" is needed because we use useState to toggle between modes
 * and useActionState for the edit/delete Server Actions.
 */
"use client";

import { useState, useActionState, useRef } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { useConfirm } from "@/components/ConfirmDialog";
import type { ShoppingList } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function ShoppingListCard({
  list,
  updateAction,
  deleteAction,
}: {
  /** The shopping list data to display */
  list: ShoppingList;
  /** Server Action to rename the list */
  updateAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete the list */
  deleteAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  // Toggle between view mode and edit mode
  const [isEditing, setIsEditing] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const { requestConfirm, confirmDialog } = useConfirm();

  // Track errors from the update and delete actions
  const [updateState, updateFormAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await updateAction(previousState, formData);
      // Exit edit mode when the save succeeds
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

  // Format the date simply — e.g. "28 Mar 2026"
  const formattedDate = new Date(list.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Combine any error from either action
  const error = updateState.error || deleteState.error;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      {isEditing ? (
        // ─── Edit Mode ───
        <form action={updateFormAction} className="flex gap-2">
          {/* Hidden input to send the list ID with the form */}
          <input type="hidden" name="id" value={list.id} />
          <input
            type="text"
            name="name"
            defaultValue={list.name}
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
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <Link
              href={`/lists/${list.id}`}
              className="block text-sm font-medium text-zinc-900 hover:underline"
            >
              {list.name}
            </Link>
            <p className="text-xs text-zinc-400">{formattedDate}</p>
          </div>

          <div className="flex items-center gap-1">
            {/* Edit button */}
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
              aria-label={`Edit ${list.name}`}
            >
              Edit
            </button>

            {/* Delete button — wrapped in a form for the Server Action */}
            <form ref={deleteFormRef} className="flex" action={deleteFormAction}>
              <input type="hidden" name="id" value={list.id} />
              <button
                type="button"
                onClick={() =>
                  requestConfirm({
                    message: `Delete "${list.name}"? This cannot be undone.`,
                    onConfirm: () => deleteFormRef.current?.requestSubmit(),
                  })
                }
                className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Show error from either update or delete */}
      {error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {confirmDialog}
    </div>
  );
}
