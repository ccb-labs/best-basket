/**
 * Inline editor for reordering categories on a list or template.
 *
 * Shows a toggle button that reveals a list of categories with up/down
 * arrow buttons. Only categories that have items in the current list
 * are shown. "Uncategorized" always stays at the bottom and can't be moved.
 *
 * The sort order is saved per-list via the saveCategorySortOrder action.
 */
"use client";

import { useState, useTransition, useRef } from "react";
import { compareCategoryNames } from "@/lib/list-helpers";

export function CategorySortEditor({
  listId,
  usedCategories,
  currentSortOrder,
  saveAction,
}: {
  /** The list or template ID */
  listId: string;
  /** Categories that have items in this list (id + name) */
  usedCategories: { id: string; name: string }[];
  /** Current custom sort order (category name → position) */
  currentSortOrder: Record<string, number>;
  /** Server action to persist the new order */
  saveAction: (
    listId: string,
    order: { category_id: string; sort_order: number }[]
  ) => Promise<{ error: string | null }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Track whether the user changed the order (so we only save when needed)
  const hasChangedRef = useRef(false);

  const [orderedCategories, setOrderedCategories] = useState(() =>
    [...usedCategories].sort((a, b) =>
      compareCategoryNames(a.name, b.name, currentSortOrder)
    )
  );

  function swap(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedCategories.length) return;

    const newOrder = [...orderedCategories];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setOrderedCategories(newOrder);
    hasChangedRef.current = true;
  }

  function save(orderToSave: { category_id: string; sort_order: number }[]) {
    setError(null);
    startTransition(async () => {
      const result = await saveAction(listId, orderToSave);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  function handleDone() {
    if (hasChangedRef.current) {
      const orderPayload = orderedCategories.map((cat, i) => ({
        category_id: cat.id,
        sort_order: i,
      }));
      save(orderPayload);
      hasChangedRef.current = false;
    }
    setIsOpen(false);
  }

  function resetToAlphabetical() {
    const sorted = [...usedCategories].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setOrderedCategories(sorted);
    hasChangedRef.current = false;
    save([]);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs font-medium text-zinc-500 hover:text-zinc-700"
      >
        {isOpen ? "Hide category order" : "Reorder categories"}
      </button>

      {isOpen && (
        <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-col gap-1">
            {orderedCategories.map((cat, index) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  onClick={() => swap(index, "up")}
                  disabled={index === 0 || isPending}
                  className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
                  aria-label={`Move ${cat.name} up`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => swap(index, "down")}
                  disabled={index === orderedCategories.length - 1 || isPending}
                  className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
                  aria-label={`Move ${cat.name} down`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <span className="flex-1">{cat.name}</span>
              </div>
            ))}

            <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400">
              <span className="h-4 w-4" />
              <span className="h-4 w-4" />
              <span className="flex-1 italic">Uncategorized (always last)</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={resetToAlphabetical}
              disabled={isPending}
              className="rounded-md border border-zinc-200 px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
            >
              Reset to A-Z
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={isPending}
              className="rounded-md bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Done
            </button>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
