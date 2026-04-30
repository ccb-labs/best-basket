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

import { useOptimistic, useTransition, useState, useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShoppingProgressBar } from "@/components/ShoppingProgressBar";
import { ShoppingItemCard } from "@/components/ShoppingItemCard";
import { LiveShoppingMode } from "@/components/LiveShoppingMode";
import { SearchInput } from "@/components/SearchInput";
import { useConfirm } from "@/components/ConfirmDialog";
import { filterItemsByName, groupItemsByCategory } from "@/lib/list-helpers";
import type { BestDealInfo } from "@/lib/types";
import type { ListItemWithCategory } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function ShoppingList({
  listId,
  items,
  bestDeals,
  categorySortByName,
  toggleAction,
  uncheckAllAction,
  deleteAction,
  initialLiveMode = false,
}: {
  /** The shopping list ID */
  listId: string;
  /** All items in the list (from the server) */
  items: ListItemWithCategory[];
  /** Best deal info per item name (from smart split calculation) */
  bestDeals: Record<string, BestDealInfo>;
  /** Custom category display order (category name → position) */
  categorySortByName?: Record<string, number>;
  /** Server Action to toggle an item's checked state */
  toggleAction: (
    itemId: string,
    listId: string,
    checked: boolean
  ) => Promise<{ error: string | null }>;
  /** Server Action to uncheck all items */
  uncheckAllAction: (listId: string) => Promise<{ error: string | null }>;
  /** Server Action to delete the list */
  deleteAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Whether to start in live shopping mode (from URL param) */
  initialLiveMode?: boolean;
}) {
  const router = useRouter();
  const [showPrices, setShowPrices] = useState(true);
  const [liveMode, setLiveMode] = useState(initialLiveMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const { requestConfirm, confirmDialog } = useConfirm();

  // Delete list action — redirects to home after successful deletion
  const [deleteState, deleteFormAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await deleteAction(previousState, formData);
      if (!result.error) {
        router.push("/");
        router.refresh();
      }
      return result;
    },
    { error: null }
  );

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
          ? {
              ...item,
              checked: update.checked,
              // Mirror what the server action writes, so the Done list
              // reorders instantly without waiting for revalidation.
              checked_at: update.checked ? new Date().toISOString() : null,
            }
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
    requestConfirm({
      message: "Uncheck all items? This will reset your shopping progress.",
      confirmLabel: "Uncheck all",
      destructive: false,
      onConfirm: () => {
        startTransition(() => {
          uncheckAllAction(listId);
        });
      },
    });
  }

  // Overall counts feed the progress bar — they ignore the search filter
  // so progress doesn't appear to jump while the user types.
  const totalCount = optimisticItems.length;
  const checkedCount = optimisticItems.reduce(
    (n, item) => n + (item.checked ? 1 : 0),
    0
  );

  const filteredItems = filterItemsByName(optimisticItems, searchQuery);

  // Done items are sorted by checked_at descending so the most recently
  // checked item shows at the top. Items without a timestamp (older data
  // before this column existed) fall to the bottom.
  const remainingItems = filteredItems.filter((item) => !item.checked);
  const doneItems = filteredItems
    .filter((item) => item.checked)
    .sort((a, b) => {
      if (!a.checked_at && !b.checked_at) return 0;
      if (!a.checked_at) return 1;
      if (!b.checked_at) return -1;
      return b.checked_at.localeCompare(a.checked_at);
    });

  // Group remaining items by category (using custom order if set)
  const sortedGroups = groupItemsByCategory(remainingItems, categorySortByName);
  const hasPrices = Object.keys(bestDeals).length > 0;

  // Live shopping overlay — renders on top of everything when active
  if (liveMode) {
    return (
      <LiveShoppingMode
        items={optimisticItems}
        bestDeals={bestDeals}
        categorySortByName={categorySortByName}
        onToggle={handleToggle}
        onClose={() => setLiveMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar — always reflects overall progress, ignoring the search filter */}
      <ShoppingProgressBar
        checkedCount={checkedCount}
        totalCount={totalCount}
      />

      {totalCount > 0 && (
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search items..."
        />
      )}

      {/* Start Live Shopping — based on unchecked items overall, ignoring the search filter */}
      {checkedCount < totalCount && (
        <button
          type="button"
          onClick={() => setLiveMode(true)}
          className="w-full rounded-md border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
        >
          Start Live Shopping
        </button>
      )}

      {searchQuery.trim() && remainingItems.length === 0 && doneItems.length === 0 && (
        <p className="text-center text-sm text-zinc-500">
          No items match &ldquo;{searchQuery}&rdquo;.
        </p>
      )}

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

      {/* Action buttons — Uncheck all (when items are checked) + Delete list */}
      <div className="mt-2 flex items-center justify-center gap-2">
        {doneItems.length > 0 && (
          <button
            type="button"
            onClick={handleUncheckAll}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Uncheck all
          </button>
        )}

        <form ref={deleteFormRef} action={deleteFormAction}>
          <input type="hidden" name="id" value={listId} />
          <button
            type="button"
            onClick={() =>
              requestConfirm({
                message: "Delete this list? This cannot be undone.",
                onConfirm: () => deleteFormRef.current?.requestSubmit(),
              })
            }
            className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete list
          </button>
        </form>
      </div>

      {deleteState.error && (
        <p className="mt-2 rounded-md bg-red-50 p-3 text-center text-sm text-red-600">
          {deleteState.error}
        </p>
      )}

      {confirmDialog}
    </div>
  );
}
