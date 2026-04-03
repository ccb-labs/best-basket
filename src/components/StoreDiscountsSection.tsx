/**
 * Collapsible section showing store-level discounts.
 *
 * Displayed below each StoreCard on the Stores page.
 * Same expand/collapse pattern as ItemPricesSection.
 *
 * When collapsed, shows a summary ("2 discounts" or "No discounts").
 * When expanded, shows each discount with edit/delete + a form to add more.
 */
"use client";

import { useState } from "react";
import { StoreDiscountRow } from "@/components/StoreDiscountRow";
import { AddDiscountForm } from "@/components/AddDiscountForm";
import type { Discount } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function StoreDiscountsSection({
  storeId,
  discounts,
  addDiscountAction,
  updateDiscountAction,
  deleteDiscountAction,
}: {
  /** The store these discounts belong to */
  storeId: string;
  /** Existing store-level discounts (item_price_id = null) */
  discounts: Discount[];
  /** Server Action to add a discount */
  addDiscountAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to update a discount */
  updateDiscountAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete a discount */
  deleteDiscountAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Summary text for collapsed state
  const summary =
    discounts.length === 0
      ? "No discounts"
      : discounts.length === 1
        ? "1 discount"
        : `${discounts.length} discounts`;

  return (
    <div className="border-t border-zinc-100 px-3 pb-2">
      {/* Clickable summary row — toggles expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-1.5 text-left"
      >
        <span className="text-xs text-zinc-400">{summary}</span>
        <span className="text-xs text-zinc-300">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded content: list of discounts + add form */}
      {isExpanded && (
        <div className="flex flex-col gap-2 pb-1">
          {/* Existing discounts */}
          {discounts.length > 0 && (
            <div className="flex flex-col gap-1">
              {discounts.map((discount) => (
                <StoreDiscountRow
                  key={discount.id}
                  discount={discount}
                  updateDiscountAction={updateDiscountAction}
                  deleteDiscountAction={deleteDiscountAction}
                />
              ))}
            </div>
          )}

          {/* Form to add a new store-level discount */}
          <AddDiscountForm
            storeId={storeId}
            addDiscountAction={addDiscountAction}
          />
        </div>
      )}
    </div>
  );
}
