import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchListPageData } from "@/lib/list-data";
import { calculateStoreTotals, calculateSmartSplit } from "@/lib/comparison";
import { ShoppingList } from "@/components/ShoppingList";
import type { BestDealInfo } from "@/lib/types";
import {
  toggleItemChecked,
  uncheckAllItems,
  deleteList,
} from "@/app/(protected)/actions";

/**
 * Shopping mode page — a streamlined view for checking off items
 * while shopping in a store.
 *
 * This is a Server Component that fetches data and passes it to the
 * ShoppingList Client Component (which handles the interactive parts
 * like checking items off with instant feedback).
 *
 * It reuses the same data fetching as the list detail and compare pages,
 * plus the smart split calculation to show the best price per item.
 */
export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;

  // Reuse the shared data fetching helper
  const data = await fetchListPageData(id);

  if (!data) {
    notFound();
  }

  const { list, items, pricesByProduct, allDiscounts, categorySortByName } = data;

  // Calculate the smart split to get best-deal info for each item.
  // This tells us the cheapest store and price for every item.
  const storeTotals = calculateStoreTotals(
    items,
    pricesByProduct,
    allDiscounts
  );
  const smartSplit = calculateSmartSplit(
    items,
    pricesByProduct,
    allDiscounts,
    storeTotals
  );

  // Build a lookup object: item name → best deal info.
  // We use a plain object (not a Map) because Maps can't be passed
  // from Server Components to Client Components — they're not serializable.
  const bestDeals: Record<string, BestDealInfo> = {};
  for (const group of smartSplit.storeGroups) {
    for (const splitItem of group.items) {
      bestDeals[splitItem.itemName] = {
        storeName: splitItem.storeName,
        unitPrice: splitItem.unitPrice,
        lineTotal: splitItem.lineTotal,
      };
    }
  }

  return (
    <div>
      <Link
        href={`/lists/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; Back to list
      </Link>

      <h2 className="mt-3 text-xl font-semibold">{list.name}</h2>

      {items.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            No items in this list yet.
          </p>
          <Link
            href={`/lists/${id}`}
            className="mt-2 inline-block text-sm text-zinc-700 underline hover:text-zinc-900"
          >
            Add items from the list page
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <ShoppingList
            listId={id}
            items={items}
            bestDeals={bestDeals}
            categorySortByName={categorySortByName}
            toggleAction={toggleItemChecked}
            uncheckAllAction={uncheckAllItems}
            deleteAction={deleteList}
            initialLiveMode={mode === "live"}
          />
        </div>
      )}
    </div>
  );
}
