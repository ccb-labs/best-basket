/**
 * Progress bar for shopping mode.
 *
 * Shows how many items have been checked off (e.g., "3 of 8 items")
 * with a visual bar that fills up as items are checked. When all items
 * are done, the text changes to "All done!" with a green color.
 */

export function ShoppingProgressBar({
  checkedCount,
  totalCount,
}: {
  /** How many items have been checked off */
  checkedCount: number;
  /** Total number of items in the list */
  totalCount: number;
}) {
  const allDone = totalCount > 0 && checkedCount === totalCount;
  const percentage = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <div>
      <p className={`text-sm font-medium ${allDone ? "text-green-600" : "text-zinc-600"}`}>
        {allDone ? "All done!" : `${checkedCount} of ${totalCount} items`}
      </p>
      <div className="mt-1 h-2 rounded-full bg-zinc-200">
        <div
          className={`h-2 rounded-full transition-all ${allDone ? "bg-green-500" : "bg-zinc-900"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
