import { createClient } from "@/lib/supabase/server";
import {
  updateProduct,
  deleteProduct,
  mergeProducts,
} from "../actions";
import { ProductCard } from "@/components/ProductCard";
import type { ProductWithCounts } from "@/components/ProductCard";
import { EmptyProductState } from "@/components/EmptyProductState";
import type { ItemPriceWithStore } from "@/lib/types";

/**
 * Products page — shows all the user's products with usage counts.
 *
 * Products are created automatically when adding items to lists.
 * This page lets users clean up their product catalog:
 * - Rename products (fix typos)
 * - Merge duplicates (e.g., "Caju" into "Castanha de Caju")
 * - Delete unused products
 */
export default async function ProductsPage() {
  const supabase = await createClient();

  // Fetch all products for the current user.
  // RLS ensures we only get the logged-in user's products.
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("name");

  // Fetch counts separately — how many list items and prices each product has.
  // We do this with two simple queries rather than a complex join/RPC.
  const productIds = (products ?? []).map((p) => p.id);

  // Count list items per product
  const { data: itemCounts } = productIds.length > 0
    ? await supabase
        .from("list_items")
        .select("product_id")
        .in("product_id", productIds)
    : { data: [] };

  // Fetch prices with store names (for display on each product card)
  const { data: allPrices } = productIds.length > 0
    ? await supabase
        .from("item_prices")
        .select("*, stores(name)")
        .in("product_id", productIds)
    : { data: [] };

  // Build count maps
  const itemCountMap = new Map<string, number>();
  for (const row of itemCounts ?? []) {
    itemCountMap.set(row.product_id, (itemCountMap.get(row.product_id) ?? 0) + 1);
  }

  const priceCountMap = new Map<string, number>();
  for (const row of allPrices ?? []) {
    priceCountMap.set(row.product_id, (priceCountMap.get(row.product_id) ?? 0) + 1);
  }

  // Group prices by product_id so we can pass them to each card
  const pricesByProduct = new Map<string, ItemPriceWithStore[]>();
  for (const price of (allPrices ?? []) as ItemPriceWithStore[]) {
    if (!pricesByProduct.has(price.product_id)) {
      pricesByProduct.set(price.product_id, []);
    }
    pricesByProduct.get(price.product_id)!.push(price);
  }

  // Combine products with their counts
  const productsWithCounts: ProductWithCounts[] = (products ?? []).map((p) => ({
    ...p,
    item_count: itemCountMap.get(p.id) ?? 0,
    price_count: priceCountMap.get(p.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">My Products</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Products are created automatically when you add items to lists.
          Use this page to rename, merge duplicates, or delete unused products.
        </p>
      </div>

      {productsWithCounts.length === 0 ? (
        <EmptyProductState />
      ) : (
        <div className="flex flex-col gap-2">
          {productsWithCounts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              prices={pricesByProduct.get(product.id) ?? []}
              allProducts={products ?? []}
              updateAction={updateProduct}
              deleteAction={deleteProduct}
              mergeAction={mergeProducts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
