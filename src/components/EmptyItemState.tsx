/**
 * Shown when a shopping list has no items yet.
 *
 * Same pattern as EmptyListState — a simple presentational component
 * with no interactivity, so it stays as a Server Component.
 */
export function EmptyItemState() {
  return (
    <div className="py-12 text-center">
      <p className="text-lg font-medium text-zinc-400">No items yet</p>
      <p className="mt-1 text-sm text-zinc-400">
        Add your first item above to get started!
      </p>
    </div>
  );
}
