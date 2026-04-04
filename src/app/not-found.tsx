import Link from "next/link";

/**
 * Custom 404 page — shown when a URL doesn't match any route.
 *
 * Next.js uses this file automatically for any unmatched URL.
 * It also shows when a page calls notFound().
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900">404</h1>
        <p className="mt-2 text-sm text-zinc-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Go to my lists
        </Link>
      </div>
    </div>
  );
}
