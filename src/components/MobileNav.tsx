"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";

/**
 * Mobile navigation menu — a hamburger button that toggles a dropdown
 * with nav links and user info. Only visible on small screens (hidden
 * on md: and above via Tailwind).
 */
export function MobileNav({
  userEmail,
  logoutButton,
}: {
  userEmail: string;
  /** The LogoutButton component, passed from the server layout */
  logoutButton: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      {/* Hamburger button — three horizontal lines */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        className="flex flex-col gap-1 p-1"
      >
        <span className="block h-0.5 w-5 bg-zinc-600" />
        <span className="block h-0.5 w-5 bg-zinc-600" />
        <span className="block h-0.5 w-5 bg-zinc-600" />
      </button>

      {/* Dropdown menu — slides down when open */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 border-b border-zinc-200 bg-white shadow-md">
          <nav className="flex flex-col px-4 py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`py-2 text-sm ${
                  pathname === link.href
                    ? "font-medium text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
            <span className="text-sm text-zinc-500">{userEmail}</span>
            {logoutButton}
          </div>
        </div>
      )}
    </div>
  );
}
