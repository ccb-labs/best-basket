/**
 * A card that displays a single product with view/edit/merge modes.
 *
 * Similar to StoreCard but with extra info:
 * - Shows how many list items use this product
 * - Shows how many prices are set for it
 * - Has a "Merge" button to combine with another product
 *
 * Renaming a product also updates all list items that use it,
 * so the display name stays in sync everywhere.
 */
"use client";

import { useState, useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { MergeProductForm } from "@/components/MergeProductForm";
import type { Product, ItemPriceWithStore } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

/** Product with usage counts, returned by the products page query */
export type ProductWithCounts = Product & {
  item_count: number;
  price_count: number;
};

export function ProductCard({
  product,
  prices,
  allProducts,
  updateAction,
  deleteAction,
  mergeAction,
}: {
  /** The product to display (with counts) */
  product: ProductWithCounts;
  /** Prices for this product (with store names) */
  prices: ItemPriceWithStore[];
  /** All products (for the merge dropdown) */
  allProducts: Product[];
  /** Server Action to rename the product */
  updateAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete the product */
  deleteAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to merge products */
  mergeAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

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
          <input type="hidden" name="id" value={product.id} />
          <input
            type="text"
            name="name"
            defaultValue={product.name}
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
        <div>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900">
                {product.name}
              </p>
              <p className="text-xs text-zinc-400">
                {product.item_count} item{product.item_count !== 1 ? "s" : ""}
                {" · "}
                {product.price_count} price{product.price_count !== 1 ? "s" : ""}
              </p>
              {/* Show store prices inline */}
              {prices.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {[...prices]
                    .sort((a, b) => a.stores.name.localeCompare(b.stores.name))
                    .map((p) => (
                      <span key={p.id} className="text-xs text-zinc-500">
                        {p.stores.name}: &euro;{Number(p.price).toFixed(2)}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
                aria-label={`Edit ${product.name}`}
              >
                Edit
              </button>

              <button
                onClick={() => setIsMerging(!isMerging)}
                className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
              >
                Merge
              </button>

              <form
                className="flex"
                action={deleteFormAction}
                onSubmit={(e) => {
                  const message =
                    product.item_count > 0
                      ? `Delete "${product.name}"? ${product.item_count} item(s) will lose their prices.`
                      : `Delete "${product.name}" and its prices?`;
                  const confirmed = window.confirm(message);
                  if (!confirmed) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={product.id} />
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Merge form — shown below the card when "Merge" is clicked */}
      {isMerging && (
        <MergeProductForm
          sourceId={product.id}
          allProducts={allProducts}
          mergeAction={mergeAction}
          onCancel={() => setIsMerging(false)}
        />
      )}

      {error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
