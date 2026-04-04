/**
 * Main shopping mode component.
 *
 * This Client Component manages the interactive shopping experience:
 * - Uses useOptimistic for instant check/uncheck feedback
 * - Groups items by category with unchecked items first
 * - Shows a "Done" section at the bottom for checked items
 * - Toggle to show/hide prices
 * - "Uncheck all" button to reset for the next shopping trip
 *
 * Why useOptimistic? It's a React 19 hook that shows the new value
 * immediately while the Server Action runs in the background. If the
 * action fails, React automatically reverts to the server state.
 * This makes checking items feel instant — no loading spinner needed.
 */
"use client";

import { useOptimistic, useTransition, useState } from "react";
import { ShoppingProgressBar } from "@/components/ShoppingProgressBar";
import { ShoppingItemCard } from "@/components/ShoppingItemCard";
import { groupItemsByCategory } from "@/lib/list-helpers";
import type { BestDealInfo } from "@/lib/types";
import type { ListItemWithCategory } from "@/lib/types";

export function ShoppingList({
  listId,
  items,
  bestDeals,
  toggleAction,
  uncheckAllAction,
}: {
  /** The shopping list ID */
  listId: string;
  /** All items in the list (from the server) */
  items: ListItemWithCategory[];
  /** Best deal info per item name (from smart split calculation) */
  bestDeals: Record<string, BestDealInfo>;
  /** Server Action to toggle an item's checked state */
  toggleAction: (
    itemId: string,
    listId: string,
    checked: boolean
  ) => Promise<{ error: string | null }>;
  /** Server Action to uncheck all items */
  uncheckAllAction: (listId: string) => Promise<{ error: string | null }>;
}) {
  const [showPrices, setShowPrices] = useState(true);
  const [, startTransition] = useTransition();

  // useOptimistic gives us a way to show the checked state immediately
  // while the server action runs in the background. The first argument
  // is the current server state, and the second is a function that
  // computes the optimistic state from the current state + the action.
  // We pass an explicit { itemId, checked } object (not just the ID)
  // so that rapid double-taps don't cause a toggle-race — both the
  // optimistic UI and the server action use the same target value.
  const [optimisticItems, setOptimisticItem] = useOptimistic(
    items,
    (
      currentItems: ListItemWithCategory[],
      update: { itemId: string; checked: boolean }
    ) =>
      currentItems.map((item) =>
        item.id === update.itemId
          ? { ...item, checked: update.checked }
          : item
      )
  );

  function handleToggle(itemId: string, newChecked: boolean) {
    // Show the change immediately (optimistic update)
    startTransition(() => {
      setOptimisticItem({ itemId, checked: newChecked });
      // Call the server action in the background
      toggleAction(itemId, listId, newChecked);
    });
  }

  function handleUncheckAll() {
    const confirmed = window.confirm(
      "Uncheck all items? This will reset your shopping progress."
    );
    if (!confirmed) return;

    startTransition(() => {
      uncheckAllAction(listId);
    });
  }

  // Split items into unchecked (remaining) and checked (done)
  const remainingItems = optimisticItems.filter((item) => !item.checked);
  const doneItems = optimisticItems.filter((item) => item.checked);

  // Group remaining items by category
  const sortedGroups = groupItemsByCategory(remainingItems);
  const hasPrices = Object.keys(bestDeals).length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <ShoppingProgressBar
        checkedCount={doneItems.length}
        totalCount={optimisticItems.length}
      />

      {/* Price toggle — only shown if there are prices to display */}
      {hasPrices && (
        <button
          type="button"
          onClick={() => setShowPrices(!showPrices)}
          className="self-end rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
        >
          {showPrices ? "Hide prices" : "Show prices"}
        </button>
      )}

      {/* Remaining items grouped by category */}
      {sortedGroups.length > 0 && (
        <div className="flex flex-col gap-4">
          {sortedGroups.map(([categoryName, groupItems]) => (
            <div key={categoryName}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {categoryName}
              </p>
              <div className="flex flex-col gap-1.5">
                {groupItems.map((item) => (
                  <ShoppingItemCard
                    key={item.id}
                    item={item}
                    checked={false}
                    bestDeal={bestDeals[item.name] ?? null}
                    showPrices={showPrices}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Done section — checked items at the bottom */}
      {doneItems.length > 0 && (
        <div>
          {remainingItems.length > 0 && (
            <hr className="mb-4 border-zinc-200" />
          )}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">
            Done ({doneItems.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {doneItems.map((item) => (
              <ShoppingItemCard
                key={item.id}
                item={item}
                checked={true}
                bestDeal={bestDeals[item.name] ?? null}
                showPrices={showPrices}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Uncheck all button — only shown if there are checked items */}
      {doneItems.length > 0 && (
        <button
          type="button"
          onClick={handleUncheckAll}
          className="mt-2 self-center rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
        >
          Uncheck all
        </button>
      )}
    </div>
  );
}
