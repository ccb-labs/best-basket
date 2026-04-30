/**
 * Shared helper functions for working with list items.
 *
 * These are small utilities used by multiple components and pages.
 * Extracting them here avoids duplicating the same logic in multiple
 * files (DRY principle).
 */

import type { ListItemWithCategory } from "@/lib/types";

/**
 * Compare two category names for sorting.
 *
 * "Uncategorized" always goes last. When a custom sort order is provided,
 * categories are sorted by position; otherwise alphabetically.
 * Categories not in the sort order appear after sorted ones, alphabetically.
 *
 * This comparator is shared by groupItemsByCategory (groups items on the
 * list/shop pages) and useLiveShopping (orders items for voice announcements).
 */
export function compareCategoryNames(
  a: string,
  b: string,
  sortOrder?: Record<string, number>
): number {
  if (a === "Uncategorized") return 1;
  if (b === "Uncategorized") return -1;

  if (sortOrder && Object.keys(sortOrder).length > 0) {
    const orderA = sortOrder[a] ?? Number.MAX_SAFE_INTEGER;
    const orderB = sortOrder[b] ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
  }

  return a.localeCompare(b);
}

/**
 * Group items by their category name.
 *
 * Items without a category are grouped under "Uncategorized", which
 * always appears last. This is the same grouping logic used on the
 * list detail page and in shopping mode.
 *
 * @param sortOrder Optional custom category ordering (category name → position).
 *   When provided, categories are sorted by position instead of alphabetically.
 *   Categories not in the map appear after sorted ones, in alphabetical order.
 * @returns An array of [categoryName, items[]] tuples
 */
export function groupItemsByCategory(
  items: ListItemWithCategory[],
  sortOrder?: Record<string, number>
): [string, ListItemWithCategory[]][] {
  const grouped = new Map<string, ListItemWithCategory[]>();

  for (const item of items) {
    const categoryName = item.categories?.name ?? "Uncategorized";
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, []);
    }
    grouped.get(categoryName)!.push(item);
  }

  return [...grouped.entries()].sort(([a], [b]) =>
    compareCategoryNames(a, b, sortOrder)
  );
}

/**
 * Filter items by a free-text search query (case-insensitive substring
 * match against the item name). An empty/whitespace-only query returns
 * the original array unchanged so callers don't need to special-case it.
 */
export function filterItemsByName<T extends { name: string }>(
  items: T[],
  query: string
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => item.name.toLowerCase().includes(normalized));
}

/**
 * Portuguese pluralization for unit names.
 *
 * Common patterns:
 *   - ending in "m" → replace with "ns" (embalagem → embalagens)
 *   - everything else → add "s" (unidade → unidades, litro → litros)
 */
export function pluralizePortuguese(name: string): string {
  if (name.endsWith("m")) return name.slice(0, -1) + "ns";
  return name + "s";
}

/**
 * Format a quantity and unit for display, pluralizing when needed.
 *
 * Examples: "2 Embalagens", "1 Quilograma", "3 Unidades"
 */
export function formatQuantity(
  quantity: number,
  unitName: string
): string {
  const displayUnit = quantity > 1 ? pluralizePortuguese(unitName) : unitName;
  return `${quantity} ${displayUnit}`;
}
