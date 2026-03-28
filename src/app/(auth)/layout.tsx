/**
 * Layout for auth pages (login, signup).
 *
 * This uses a Next.js "route group" — the (auth) folder name is wrapped in
 * parentheses, which means it won't appear in the URL. So the login page
 * is at /login, not /auth/login.
 *
 * All auth pages share this centered layout, which looks good on mobile.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
