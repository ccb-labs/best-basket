/**
 * Shown when the user has no products yet.
 *
 * Products are created automatically when adding items to lists,
 * so this state is rare — only shows for brand new users.
 */
export function EmptyProductState() {
  return (
    <div className="py-12 text-center">
      <p className="text-lg font-medium text-zinc-400">No products yet</p>
      <p className="mt-1 text-sm text-zinc-400">
        Products are created automatically when you add items to your lists.
      </p>
    </div>
  );
}
