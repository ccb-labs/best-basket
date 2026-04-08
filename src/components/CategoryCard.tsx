/**
 * A card that displays a single category with view/edit modes.
 *
 * Same dual-mode pattern as StoreCard:
 * - View mode: shows category name + edit/delete buttons
 * - Edit mode: input with save/cancel buttons
 *
 * Default categories (user_id = null) are shared across all users and
 * cannot be edited or deleted — only user-created categories show the
 * edit/delete buttons.
 *
 * Deleting a category sets any list items using it to "Uncategorized"
 * (ON DELETE SET NULL), so no items are lost.
 */
"use client";

import { useState, useActionState, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Category } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function CategoryCard({
  category,
  updateAction,
  deleteAction,
}: {
  /** The category data to display */
  category: Category;
  /** Server Action to rename the category */
  updateAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete the category */
  deleteAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const { requestConfirm, confirmDialog } = useConfirm();

  // Whether this is a default category (shared, not editable)
  const isDefault = category.user_id === null;

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
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      {isEditing ? (
        // ─── Edit Mode ───
        <form action={updateFormAction} className="flex gap-2">
          <input type="hidden" name="id" value={category.id} />
          <input
            type="text"
            name="name"
            defaultValue={category.name}
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
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-900">
              {category.name}
            </p>
            {isDefault && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                Default
              </span>
            )}
          </div>

          {/* Only show edit/delete for user-created categories */}
          {!isDefault && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
                aria-label={`Edit ${category.name}`}
              >
                Edit
              </button>

              <form
                ref={deleteFormRef}
                className="flex"
                action={deleteFormAction}
              >
                <input type="hidden" name="id" value={category.id} />
                <button
                  type="button"
                  onClick={() =>
                    requestConfirm({
                      message: `Delete "${category.name}"? Items using this category will become "Uncategorized".`,
                      onConfirm: () => deleteFormRef.current?.requestSubmit(),
                    })
                  }
                  className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {confirmDialog}
    </div>
  );
}
