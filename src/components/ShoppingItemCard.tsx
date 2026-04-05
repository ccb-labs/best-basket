/**
 * A single item row in shopping mode.
 *
 * Unlike ListItemCard (used for editing), this component is focused on
 * the shopping experience: a large tappable area to check/uncheck items.
 * No edit or delete buttons — just a checkbox, item name, quantity, and
 * optionally the best price and store name.
 *
 * The entire row is tappable (not just a small checkbox) so it's easy
 * to use on a phone with one hand. The minimum height is 44px to meet
 * touch target guidelines.
 */
"use client";

import type { ListItemWithCategory, BestDealInfo } from "@/lib/types";
import { formatQuantity } from "@/lib/list-helpers";

export function ShoppingItemCard({
  item,
  checked,
  bestDeal,
  showPrices,
  onToggle,
}: {
  /** The item to display */
  item: ListItemWithCategory;
  /** Whether the item is currently checked (from optimistic state) */
  checked: boolean;
  /** Best deal info from smart split (null if no prices) */
  bestDeal: BestDealInfo | null;
  /** Whether to show price info */
  showPrices: boolean;
  /** Called when the user taps the row */
  onToggle: (itemId: string, newChecked: boolean) => void;
}) {
  const quantityDisplay = formatQuantity(item.quantity, item.units.name);

  return (
    <button
      type="button"
      onClick={() => onToggle(item.id, !checked)}
      className={`flex w-full min-h-[44px] items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors active:bg-zinc-100 ${
        checked
          ? "border-zinc-100 bg-zinc-50 opacity-60"
          : "border-zinc-200 bg-white"
      }`}
      aria-label={`${checked ? "Uncheck" : "Check"} ${item.name}`}
    >
      {/* Checkbox indicator */}
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          checked
            ? "border-green-500 bg-green-500 text-white"
            : "border-zinc-300"
        }`}
      >
        {checked && (
          // Simple checkmark using CSS — no icon library needed
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Item name and quantity */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            checked ? "text-zinc-400 line-through" : "text-zinc-900"
          }`}
        >
          {item.name}
        </p>
        <p className="text-xs text-zinc-400">{quantityDisplay}</p>
      </div>

      {/* Best price and store (optional) */}
      {showPrices && bestDeal && (
        <div className="shrink-0 text-right">
          <p className={`text-sm ${checked ? "text-zinc-400" : "text-zinc-600"}`}>
            &euro;{bestDeal.lineTotal.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400">@ {bestDeal.storeName}</p>
        </div>
      )}
    </button>
  );
}
