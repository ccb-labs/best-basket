/**
 * Loading UI for protected pages.
 *
 * Next.js shows this component automatically while a page is loading
 * (e.g., during navigation between routes). It replaces the page content
 * while the server fetches data for the next page.
 */
export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      {/* Simple spinning circle animation */}
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
      <p className="text-sm text-zinc-400">Loading...</p>
    </div>
  );
}
