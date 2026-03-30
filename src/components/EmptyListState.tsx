/**
 * Shown when the user has no shopping lists yet.
 *
 * This is a simple presentational component — no interactivity needed,
 * so it can be a Server Component (no "use client" directive).
 */
export function EmptyListState() {
  return (
    <div className="py-12 text-center">
      <p className="text-lg font-medium text-zinc-400">
        No shopping lists yet
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        Create your first list above to get started!
      </p>
    </div>
  );
}
