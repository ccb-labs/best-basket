/**
 * Displays the total cost of a shopping list at each store.
 *
 * Each store is shown as a card with its total cost, how many items
 * it covers, and whether it has prices for every item in the list.
 * The cheapest store gets a green "Cheapest" badge.
 *
 * This is a Server Component — it just renders data, no interactivity.
 */

import type { StoreTotalResult } from "@/lib/comparison";

export function StoreTotalsSection({
  storeTotals,
}: {
  /** Store totals sorted cheapest first (from calculateStoreTotals) */
  storeTotals: StoreTotalResult[];
}) {
  if (storeTotals.length === 0) return null;

  const cheapestId = storeTotals[0].storeId;

  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Store Totals
      </h3>
      <div className="mt-2 flex flex-col gap-2">
        {storeTotals.map((store) => (
          <div
            key={store.storeId}
            className={`rounded-md border p-3 ${
              store.storeId === cheapestId
                ? "border-green-300 bg-green-50"
                : "border-zinc-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{store.storeName}</span>
                {store.storeId === cheapestId && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Cheapest
                  </span>
                )}
              </div>
              <span className="text-lg font-semibold">
                &euro;{store.total.toFixed(2)}
              </span>
            </div>

            {/* Coverage info — how many items this store has prices for */}
            <p className="mt-1 text-xs text-zinc-400">
              {store.isComplete ? (
                <span className="text-green-600">
                  All {store.totalPriceableItems} items available
                </span>
              ) : (
                <span className="text-amber-600">
                  {store.itemsCovered} of {store.totalPriceableItems} items
                  available
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
