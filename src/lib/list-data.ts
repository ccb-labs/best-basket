/**
 * Shared data fetching for shopping list pages.
 *
 * Both the list detail page (/lists/[id]) and the compare page
 * (/lists/[id]/compare) need the same data: list info, items, stores,
 * prices grouped by product, and discounts. This file extracts that
 * shared logic so we don't duplicate ~50 lines of Supabase queries.
 *
 * Why a separate file? The DRY principle — if we ever change how
 * prices or discounts are fetched (e.g., adding a new join), we only
 * need to update one place.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ShoppingList,
  ListItemWithCategory,
  Category,
  Unit,
  Store,
  ItemPriceWithStore,
  Discount,
} from "@/lib/types";

/** Everything both pages need about a shopping list */
export type ListPageData = {
  list: ShoppingList;
  items: ListItemWithCategory[];
  categories: Category[];
  units: Unit[];
  stores: Store[];
  pricesByProduct: Map<string, ItemPriceWithStore[]>;
  allDiscounts: Discount[];
  /** True if the current user owns this list, false if it's shared with them */
  isOwner: boolean;
};

/**
 * Fetch all data needed to display or compare a shopping list.
 *
 * Returns null if the list doesn't exist or doesn't belong to the
 * current user (Supabase RLS handles the access check).
 */
export async function fetchListPageData(
  listId: string
): Promise<ListPageData | null> {
  const supabase = await createClient();

  // Get the current user (needed for category filtering)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the list — RLS ensures we can only see our own
  const { data: list } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("id", listId)
    .single();

  if (!list) return null;

  // Fetch items, categories, units, and stores in parallel (independent queries)
  const [{ data: items }, { data: categories }, { data: units }, { data: stores }] =
    await Promise.all([
      supabase
        .from("list_items")
        .select("*, categories(name), units(abbreviation)")
        .eq("list_id", listId)
        .order("name"),
      supabase
        .from("categories")
        .select("*")
        .or(`user_id.is.null,user_id.eq.${user?.id}`)
        .order("name"),
      supabase.from("units").select("*").order("name"),
      supabase.from("stores").select("*").order("name"),
    ]);

  // Collect unique product IDs from the items (only items with a product link)
  const productIds = (items ?? [])
    .map((i) => i.product_id)
    .filter((id): id is string => id !== null);
  const uniqueProductIds = [...new Set(productIds)];

  // Fetch prices for all products in the list
  const { data: prices } =
    uniqueProductIds.length > 0
      ? await supabase
          .from("item_prices")
          .select("*, stores(name)")
          .in("product_id", uniqueProductIds)
      : { data: [] };

  // Group prices by product_id for easy lookup
  const pricesByProduct = new Map<string, ItemPriceWithStore[]>();
  for (const price of (prices ?? []) as ItemPriceWithStore[]) {
    if (!pricesByProduct.has(price.product_id)) {
      pricesByProduct.set(price.product_id, []);
    }
    pricesByProduct.get(price.product_id)!.push(price);
  }

  // Fetch discounts: product-level and store-level in parallel
  const priceIds = (prices ?? []).map((p) => p.id);
  const storeIdsInPrices = [
    ...new Set((prices ?? []).map((p) => p.store_id)),
  ];

  const [{ data: productDiscounts }, { data: storeDiscounts }] =
    await Promise.all([
      priceIds.length > 0
        ? supabase
            .from("discounts")
            .select("*")
            .in("item_price_id", priceIds)
        : Promise.resolve({ data: [] }),
      storeIdsInPrices.length > 0
        ? supabase
            .from("discounts")
            .select("*")
            .in("store_id", storeIdsInPrices)
            .is("item_price_id", null)
        : Promise.resolve({ data: [] }),
    ]);

  const allDiscounts = [
    ...((productDiscounts ?? []) as Discount[]),
    ...((storeDiscounts ?? []) as Discount[]),
  ];

  return {
    list: list as ShoppingList,
    items: (items ?? []) as ListItemWithCategory[],
    categories: (categories ?? []) as Category[],
    units: (units ?? []) as Unit[],
    stores: (stores ?? []) as Store[],
    pricesByProduct,
    allDiscounts,
    isOwner: list.user_id === user?.id,
  };
}
