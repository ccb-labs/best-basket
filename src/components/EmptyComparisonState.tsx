/**
 * Shown when a shopping list has no items with prices to compare.
 *
 * Same pattern as EmptyItemState — a simple presentational component
 * with no interactivity, so it stays as a Server Component.
 */
export function EmptyComparisonState() {
  return (
    <div className="py-12 text-center">
      <p className="text-lg font-medium text-zinc-400">
        Nothing to compare yet
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        Add prices to your items to see which store is cheapest.
      </p>
    </div>
  );
}
