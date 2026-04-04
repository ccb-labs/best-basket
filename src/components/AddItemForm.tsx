/**
 * A form to add a new item to a shopping list.
 *
 * Always visible at the top of the list detail page (same pattern as
 * ShoppingListForm on the home page). Fields: name, quantity, unit,
 * and category — only name is required.
 *
 * The name field has autocomplete — as you type, it suggests matching
 * products from your existing product catalog. Picking a suggestion
 * reuses that product (so prices and category carry over automatically).
 *
 * Uses useActionState + formRef to clear the form after a successful
 * submission (same pattern as ShoppingListForm).
 */
"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { CreateCategoryForm } from "@/components/CreateCategoryForm";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/app/(protected)/actions";
import type { Category, Product } from "@/lib/types";

const MIN_SEARCH_LENGTH = 2;

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

  // ─── Autocomplete state ───
  const [nameValue, setNameValue] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced search: query products after the user stops typing for 300ms.
  // Both branches run inside setTimeout so setState is never called
  // synchronously in the effect body (avoids cascading renders).
  useEffect(() => {
    const trimmed = nameValue.trim();

    const timer = setTimeout(
      async () => {
        if (trimmed.length < MIN_SEARCH_LENGTH) {
          setSuggestions([]);
          return;
        }

        const supabase = createClient();
        const { data } = await supabase
          .from("products")
          .select("id, name, user_id")
          .ilike("name", `%${trimmed}%`)
          .order("name")
          .limit(5);

        setSuggestions((data ?? []) as Product[]);
        setShowSuggestions(true);
      },
      trimmed.length < MIN_SEARCH_LENGTH ? 0 : 300
    );

    return () => clearTimeout(timer);
  }, [nameValue]);

  const [state, formAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await addItemAction(previousState, formData);
      if (!result.error) {
        formRef.current?.reset();
        setNameValue("");
        setSuggestions([]);
      }
      return result;
    },
    { error: null }
  );

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="list_id" value={listId} />

        {/* Item name with autocomplete suggestions */}
        <div className="relative">
          <input
            type="text"
            name="name"
            placeholder="Item name..."
            required
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              // Small delay so click on suggestion registers before hiding
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            autoComplete="off"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-md">
              {suggestions.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // onMouseDown fires before onBlur, so the click registers
                      e.preventDefault();
                      setNameValue(product.name);
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    {product.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
