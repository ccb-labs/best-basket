/**
 * A form to add a price for a product at a specific store.
 *
 * Shows a store dropdown and price input. If the user has no stores,
 * it shows a link to the /stores page instead.
 *
 * The store dropdown excludes stores that already have a price for this
 * product — each product can only have one price per store.
 */
"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionResult } from "@/app/(protected)/actions";
import type { Store, ItemPriceWithStore } from "@/lib/types";

export function AddPriceForm({
  productId,
  listId,
  stores,
  existingPrices,
  addPriceAction,
}: {
  /** The product this price will be added to */
  productId: string;
  /** The list ID — needed for revalidation after adding */
  listId: string;
  /** All of the user's stores */
  stores: Store[];
  /** Prices already set for this item (used to filter out taken stores) */
  existingPrices: ItemPriceWithStore[];
  /** Server Action to add the price */
  addPriceAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await addPriceAction(previousState, formData);
      if (!result.error) {
        formRef.current?.reset();
      }
      return result;
    },
    { error: null }
  );

  // Filter out stores that already have a price for this item
  const storesWithPrice = new Set(existingPrices.map((p) => p.store_id));
  const availableStores = stores.filter((s) => !storesWithPrice.has(s.id));

  // If the user has no stores at all, point them to the stores page
  if (stores.length === 0) {
    return (
      <p className="text-xs text-zinc-400">
        <Link href="/stores" className="underline hover:text-zinc-600">
          Add stores
        </Link>{" "}
        first to start tracking prices.
      </p>
    );
  }

  // If all stores already have prices for this item, show a message
  if (availableStores.length === 0) {
    return (
      <p className="text-xs text-zinc-400">
        All stores have prices for this item.
      </p>
    );
  }

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex gap-2">
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="list_id" value={listId} />

        {/* Store dropdown — only shows stores without a price for this item */}
        <select
          name="store_id"
          required
          className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">Select store...</option>
          {availableStores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>

        {/* Price input — allows cents (step 0.01) */}
        <input
          type="number"
          name="price"
          placeholder="0.00"
          min={0}
          step="0.01"
          required
          className="w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:border-zinc-500 focus:outline-none"
        />

        <SubmitButton
          label="Add"
          pendingLabel="..."
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        />
      </form>

      {state.error && (
        <p className="mt-1 text-xs text-red-600">{state.error}</p>
      )}
    </div>
  );
}
