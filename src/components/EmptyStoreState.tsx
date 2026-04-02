/**
 * Shown when the user has no stores yet.
 *
 * Same pattern as EmptyListState — a simple presentational component.
 */
export function EmptyStoreState() {
  return (
    <div className="py-12 text-center">
      <p className="text-lg font-medium text-zinc-400">No stores yet</p>
      <p className="mt-1 text-sm text-zinc-400">
        Add your first store above to start tracking prices!
      </p>
    </div>
  );
}
