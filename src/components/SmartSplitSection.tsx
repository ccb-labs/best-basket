/**
 * Displays the "smart split" — the optimal way to split purchases
 * across stores to get the lowest total price.
 *
 * Shows items grouped by the store they should be bought at, with
 * subtotals per store and a grand total. If splitting saves money
 * vs. buying everything at the cheapest single store, a savings
 * badge is shown.
 *
 * This is a Server Component — it just renders data, no interactivity.
 */

import type { SmartSplitResult, SmartSplitItem, UnpricedItem } from "@/lib/comparison";

/** Formats quantity and unit for display, e.g., "(2 kg)" or "(3)" */
function QuantityLabel({ item }: { item: Pick<SmartSplitItem | UnpricedItem, "quantity" | "unit"> }) {
  if (item.quantity <= 1 && !item.unit) return null;
  return (
    <span className="ml-1">
      ({item.quantity}{item.unit ? ` ${item.unit}` : ""})
    </span>
  );
}

export function SmartSplitSection({
  smartSplit,
}: {
  /** The smart split result from calculateSmartSplit */
  smartSplit: SmartSplitResult;
}) {
  const { storeGroups, grandTotal, unpricedItems, savingsVsCheapest } =
    smartSplit;

  if (storeGroups.length === 0) return null;

  return (
    <section>
      {/* Header with grand total and savings badge */}
      <div className="flex items-center justify-between pr-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Smart Split
        </h3>
        <div className="flex items-center gap-2">
          {savingsVsCheapest > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Save &euro;{savingsVsCheapest.toFixed(2)}
            </span>
          )}
          <span className="text-lg font-semibold">
            &euro;{grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Store groups — each group shows which items to buy at that store */}
      <div className="mt-2 flex flex-col gap-3">
        {storeGroups.map((group) => (
          <div
            key={group.storeId}
            className="rounded-md border border-zinc-200 bg-white"
          >
            {/* Store name and subtotal */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
              <span className="text-sm font-medium">{group.storeName}</span>
              <span className="text-sm font-medium text-zinc-500">
                &euro;{group.storeTotal.toFixed(2)}
              </span>
            </div>

            {/* Items to buy at this store */}
            <div className="divide-y divide-zinc-50 px-3">
              {group.items.map((item, index) => (
                <div
                  key={`${item.storeId}-${item.itemName}-${index}`}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-sm text-zinc-600">
                    {item.itemName}
                    <QuantityLabel item={item} />
                  </span>
                  <span className="text-sm text-zinc-500">
                    &euro;{item.lineTotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Unpriced items — shown when some items have no prices anywhere */}
      {unpricedItems.length > 0 && (
        <div className="mt-3 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2">
          <p className="text-xs font-medium text-zinc-400">
            No prices available
          </p>
          <div className="mt-1 flex flex-col gap-0.5">
            {unpricedItems.map((item, index) => (
              <span
                key={`${item.itemName}-${index}`}
                className="text-sm text-zinc-400"
              >
                {item.itemName}
                <QuantityLabel item={item} />
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
