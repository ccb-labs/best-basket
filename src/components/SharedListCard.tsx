/**
 * A card that displays a shopping list shared with the current user.
 *
 * Unlike ShoppingListCard, this is read-only — shared users can't
 * rename or delete the list (only the owner can). It shows who
 * shared the list with you.
 */

import Link from "next/link";
import type { SharedList } from "@/lib/types";

export function SharedListCard({ list }: { list: SharedList }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <Link
        href={`/lists/${list.id}`}
        className="block text-sm font-medium text-zinc-900 hover:underline"
      >
        {list.name}
      </Link>
      <p className="text-xs text-zinc-400">
        Shared by {list.owner_email}
      </p>
    </div>
  );
}
