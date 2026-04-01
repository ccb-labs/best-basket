/**
 * A small inline form to create a new custom category.
 *
 * Shown when the user clicks "+ New category" in AddItemForm.
 * Uses the same useActionState + formRef pattern as ShoppingListForm.
 */
"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionResult } from "@/app/(protected)/actions";

export function CreateCategoryForm({
  listId,
  createCategoryAction,
  onCancel,
}: {
  /** The list ID — needed so the server action can revalidate the right page */
  listId: string;
  /** Server Action to create the category */
  createCategoryAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Called when the user clicks Cancel or after a successful creation */
  onCancel: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await createCategoryAction(previousState, formData);
      // Close the form after a successful creation
      if (!result.error) {
        formRef.current?.reset();
        onCancel();
      }
      return result;
    },
    { error: null }
  );

  return (
    <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="mb-2 text-xs font-medium text-zinc-500">New category</p>
      <form ref={formRef} action={formAction} className="flex gap-2">
        <input type="hidden" name="list_id" value={listId} />
        <input
          type="text"
          name="name"
          placeholder="Category name..."
          required
          autoFocus
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <SubmitButton
          label="Add"
          pendingLabel="Adding..."
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
        >
          Cancel
        </button>
      </form>

      {state.error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
