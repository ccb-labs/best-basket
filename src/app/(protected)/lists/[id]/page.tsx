import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddItemForm } from "@/components/AddItemForm";
import { ListItemCard } from "@/components/ListItemCard";
import { ItemPricesSection } from "@/components/ItemPricesSection";
import { EmptyItemState } from "@/components/EmptyItemState";
import {
  addItem,
  updateItem,
  deleteItem,
  createCategory,
  addPrice,
  updatePrice,
  deletePrice,
  addDiscount,
  updateDiscount,
  deleteDiscount,
} from "@/app/(protected)/actions";
import type { ListItemWithCategory, Store, ItemPriceWithStore, Discount } from "@/lib/types";

/**
 * List detail page — shows a shopping list's items with the ability
 * to add, edit, delete, and categorize products.
 *
 * Also shows prices per item at different stores (Phase 4).
 *
 * This is a dynamic route — the [id] in the folder name means Next.js
 * will pass the list ID from the URL as params.id. For example,
 * /lists/abc-123 will have params.id = "abc-123".
 */
export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // In Next.js 15+, params is a Promise that we need to await
  const { id } = await params;

  const supabase = await createClient();

  // Get the current user (needed to fetch their custom categories)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch this specific list — RLS ensures we can only see our own lists
  const { data: list } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("id", id)
    .single();

  // If the list doesn't exist (or doesn't belong to this user), show 404
  if (!list) {
    notFound();
  }

  // Fetch all items in this list, joining the category name.
  // .select("*, categories(name)") tells Supabase to include the related
  // category row — it comes back as { categories: { name: "Fruits" } }
  const { data: items } = await supabase
    .from("list_items")
    .select("*, categories(name)")
    .eq("list_id", id)
    .order("name");

  // Fetch all categories this user can see: defaults (user_id is null)
  // plus any custom ones they created (user_id matches their ID)
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${user?.id}`)
    .order("name");

  // Fetch all stores for the current user (needed for the price dropdowns)
  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .order("name");

  // Fetch prices by product_id. Prices are on products (not list items),
  // so they're shared across lists. We collect the product_ids from the
  // items, then fetch all prices for those products.
  const productIds = (items ?? [])
    .map((i) => i.product_id)
    .filter((id): id is string => id !== null);
  const uniqueProductIds = [...new Set(productIds)];

  const { data: prices } =
    uniqueProductIds.length > 0
      ? await supabase
          .from("item_prices")
          .select("*, stores(name)")
          .in("product_id", uniqueProductIds)
      : { data: [] };

  // Group prices by product_id so we can pass each item's prices easily.
  // Multiple items can share the same product (and thus the same prices).
  const pricesByProduct = new Map<string, ItemPriceWithStore[]>();
  for (const price of (prices ?? []) as ItemPriceWithStore[]) {
    if (!pricesByProduct.has(price.product_id)) {
      pricesByProduct.set(price.product_id, []);
    }
    pricesByProduct.get(price.product_id)!.push(price);
  }

  // Fetch discounts that could apply to the prices on this list.
  // Two kinds fetched in parallel (they're independent queries):
  // 1. Product-level discounts — target a specific price entry
  // 2. Store-level discounts — apply to all products at a store
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

  // Group items by category name so we can render them in sections.
  // Items without a category go into "Uncategorized".
  const grouped = new Map<string, ListItemWithCategory[]>();
  for (const item of (items ?? []) as ListItemWithCategory[]) {
    const categoryName = item.categories?.name ?? "Uncategorized";
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, []);
    }
    grouped.get(categoryName)!.push(item);
  }

  // Sort the groups alphabetically, but put "Uncategorized" last
  const sortedGroups = [...grouped.entries()].sort(([a], [b]) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; Back to lists
      </Link>

      <h2 className="mt-3 text-xl font-semibold">{list.name}</h2>

      {/* Form to add new items — always visible at the top */}
      <div className="mt-4">
        <AddItemForm
          listId={id}
          categories={categories ?? []}
          addItemAction={addItem}
          createCategoryAction={createCategory}
        />
      </div>

      {/* List items grouped by category, or empty state */}
      <div className="mt-6">
        {(!items || items.length === 0) ? (
          <EmptyItemState />
        ) : (
          <div className="flex flex-col gap-6">
            {sortedGroups.map(([categoryName, groupItems]) => (
              <div key={categoryName}>
                {/* Category heading */}
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {categoryName}
                </p>
                <div className="flex flex-col gap-2">
                  {groupItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-zinc-200 bg-white"
                    >
                      {/* Item details (name, quantity, category, edit/delete) */}
                      <ListItemCard
                        item={item}
                        categories={categories ?? []}
                        updateAction={updateItem}
                        deleteAction={deleteItem}
                      />
                      {/* Prices section — only shown if item has a product link */}
                      {item.product_id && (
                        <ItemPricesSection
                          productId={item.product_id}
                          listId={id}
                          prices={pricesByProduct.get(item.product_id) ?? []}
                          stores={(stores ?? []) as Store[]}
                          discounts={allDiscounts}
                          addPriceAction={addPrice}
                          updatePriceAction={updatePrice}
                          deletePriceAction={deletePrice}
                          addDiscountAction={addDiscount}
                          updateDiscountAction={updateDiscount}
                          deleteDiscountAction={deleteDiscount}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
