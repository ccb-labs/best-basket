import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchListPageData } from "@/lib/list-data";
import { calculateStoreTotals, calculateSmartSplit } from "@/lib/comparison";
import { StoreTotalsSection } from "@/components/StoreTotalsSection";
import { SmartSplitSection } from "@/components/SmartSplitSection";
import { EmptyComparisonState } from "@/components/EmptyComparisonState";

/**
 * Price comparison page — shows how much a shopping list costs at
 * each store and the smartest way to split purchases to save money.
 *
 * This is a Server Component — it fetches data on the server and
 * renders the results. No client-side JavaScript needed since the
 * dashboard is read-only (no forms, no toggles).
 */
export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Reuse the same data fetching as the list detail page
  const data = await fetchListPageData(id);

  if (!data) {
    notFound();
  }

  const { list, items, pricesByProduct, allDiscounts } = data;

  // Run the comparison calculations
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

  // Check if there's anything to compare (at least one item with a price)
  const hasData = storeTotals.length > 0;

  return (
    <div>
      <Link
        href={`/lists/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; Back to list
      </Link>

      <h2 className="mt-3 text-xl font-semibold">
        Compare Prices: {list.name}
      </h2>

      {hasData ? (
        <div className="mt-6 flex flex-col gap-8">
          <StoreTotalsSection storeTotals={storeTotals} />
          <SmartSplitSection smartSplit={smartSplit} />
        </div>
      ) : (
        <EmptyComparisonState />
      )}
    </div>
  );
}
