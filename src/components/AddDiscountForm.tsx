/**
 * A form to add a discount/coupon.
 *
 * Can be used for both store-level discounts (on the Stores page) and
 * product-level discounts (on the list detail page, for a specific price).
 *
 * The form includes:
 * - A type selector (percentage or fixed amount)
 * - A value input
 * - An optional description (e.g., "Spring coupon")
 */
"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionResult } from "@/app/(protected)/actions";

export function AddDiscountForm({
  storeId,
  itemPriceId,
  listId,
  addDiscountAction,
}: {
  /** The store this discount belongs to */
  storeId: string;
  /** If set, this discount targets a specific product price (product-level) */
  itemPriceId?: string;
  /** Optional list ID for revalidation (when used on list detail page) */
  listId?: string;
  /** Server Action to add the discount */
  addDiscountAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await addDiscountAction(previousState, formData);
      if (!result.error) {
        formRef.current?.reset();
      }
      return result;
    },
    { error: null }
  );

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex gap-2">
        <input type="hidden" name="store_id" value={storeId} />
        {itemPriceId && (
          <input type="hidden" name="item_price_id" value={itemPriceId} />
        )}
        {listId && <input type="hidden" name="list_id" value={listId} />}

        {/* Type selector — percentage (%) or fixed amount (€) */}
        <select
          name="type"
          required
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 focus:border-zinc-500 focus:outline-none"
        >
          <option value="percentage">%</option>
          <option value="fixed">€</option>
        </select>

        {/* Value input */}
        <input
          type="number"
          name="value"
          placeholder="0"
          min={0}
          step="0.01"
          required
          className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:border-zinc-500 focus:outline-none"
        />

        {/* Optional description */}
        <input
          type="text"
          name="description"
          placeholder="e.g., Spring coupon"
          className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:border-zinc-500 focus:outline-none"
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
