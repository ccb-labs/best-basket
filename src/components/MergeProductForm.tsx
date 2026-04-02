/**
 * A small inline form to merge one product into another.
 *
 * Shows a dropdown of all other products. When submitted, all list items
 * and prices from the source product are moved to the target, and the
 * source is deleted. This is useful for cleaning up duplicates.
 */
"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionResult } from "@/app/(protected)/actions";
import type { Product } from "@/lib/types";

export function MergeProductForm({
  sourceId,
  allProducts,
  mergeAction,
  onCancel,
}: {
  /** The product being merged (will be deleted after merge) */
  sourceId: string;
  /** All products (used to pick the target — source is excluded) */
  allProducts: Product[];
  /** Server Action to merge the products */
  mergeAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Called when the user cancels */
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await mergeAction(previousState, formData);
      if (!result.error) {
        onCancel();
      }
      return result;
    },
    { error: null }
  );

  // Exclude the source product from the dropdown
  const targetOptions = allProducts.filter((p) => p.id !== sourceId);

  return (
    <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="mb-2 text-xs font-medium text-zinc-500">Merge into:</p>
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="source_id" value={sourceId} />
        <select
          name="target_id"
          required
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">Select product...</option>
          {targetOptions.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <SubmitButton
          label="Merge"
          pendingLabel="Merging..."
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
