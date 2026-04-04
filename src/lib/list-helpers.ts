/**
 * Shared helper functions for working with list items.
 *
 * These are small utilities used by multiple components and pages.
 * Extracting them here avoids duplicating the same logic in multiple
 * files (DRY principle).
 */

import type { ListItemWithCategory } from "@/lib/types";

/**
 * Group items by their category name, sorted alphabetically.
 *
 * Items without a category are grouped under "Uncategorized", which
 * always appears last. This is the same grouping logic used on the
 * list detail page and in shopping mode.
 *
 * @returns An array of [categoryName, items[]] tuples, sorted by name
 */
export function groupItemsByCategory(
  items: ListItemWithCategory[]
): [string, ListItemWithCategory[]][] {
  const grouped = new Map<string, ListItemWithCategory[]>();

  for (const item of items) {
    const categoryName = item.categories?.name ?? "Uncategorized";
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, []);
    }
    grouped.get(categoryName)!.push(item);
  }

  // Sort alphabetically, but put "Uncategorized" last
  return [...grouped.entries()].sort(([a], [b]) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });
}

/**
 * Format a quantity and optional unit for display.
 *
 * Examples: "2 kg", "1 L", "3" (when no unit)
 */
export function formatQuantity(
  quantity: number,
  unit: string | null
): string {
  return unit ? `${quantity} ${unit}` : `${quantity}`;
}
