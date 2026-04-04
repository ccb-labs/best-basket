/**
 * Shown when the user has no templates yet.
 *
 * Guides the user to create their first template by saving an
 * existing shopping list as a template.
 */
export function EmptyTemplateState() {
  return (
    <div className="py-12 text-center">
      <p className="text-lg font-medium text-zinc-400">No templates yet</p>
      <p className="mt-1 text-sm text-zinc-400">
        Open a shopping list and tap &quot;Save as Template&quot; to create one!
      </p>
    </div>
  );
}
