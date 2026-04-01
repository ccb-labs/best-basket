/**
 * A form to add a new item to a shopping list.
 *
 * Always visible at the top of the list detail page (same pattern as
 * ShoppingListForm on the home page). Fields: name, quantity, unit,
 * and category — only name is required.
 *
 * Uses useActionState + formRef to clear the form after a successful
 * submission (same pattern as ShoppingListForm).
 */
"use client";

import { useActionState, useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { CreateCategoryForm } from "@/components/CreateCategoryForm";
import type { ActionResult } from "@/app/(protected)/actions";
import type { Category } from "@/lib/types";

export function AddItemForm({
  listId,
  categories,
  addItemAction,
  createCategoryAction,
}: {
  /** The shopping list this item will be added to */
  listId: string;
  /** Available categories (default + user-created) for the dropdown */
  categories: Category[];
  /** Server Action to add the item */
  addItemAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to create a new category */
  createCategoryAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [state, formAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await addItemAction(previousState, formData);
      if (!result.error) {
        formRef.current?.reset();
      }
      return result;
    },
    { error: null }
  );

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="list_id" value={listId} />

        {/* Item name — the only required field */}
        <input
          type="text"
          name="name"
          placeholder="Item name..."
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />

        {/* Quantity, unit, and category on the same row */}
        <div className="flex gap-2">
          <input
            type="number"
            name="quantity"
            defaultValue={1}
            min={0.01}
            step="any"
            className="w-20 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <input
            type="text"
            name="unit"
            placeholder="kg, L, pack..."
            className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <select
            name="category_id"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <SubmitButton label="Add item" pendingLabel="Adding..." />
      </form>

      {/* Link to create a new category */}
      {!showNewCategory && (
        <button
          type="button"
          onClick={() => setShowNewCategory(true)}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-700"
        >
          + New category
        </button>
      )}

      {/* Inline form to create a custom category */}
      {showNewCategory && (
        <CreateCategoryForm
          listId={listId}
          createCategoryAction={createCategoryAction}
          onCancel={() => setShowNewCategory(false)}
        />
      )}

      {state.error && (
        <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
