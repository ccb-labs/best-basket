import { createClient } from "@/lib/supabase/server";
import {
  createStore,
  updateStore,
  deleteStore,
  addDiscount,
  updateDiscount,
  deleteDiscount,
} from "../actions";
import { StoreForm } from "@/components/StoreForm";
import { StoreCard } from "@/components/StoreCard";
import { StoreDiscountsSection } from "@/components/StoreDiscountsSection";
import { EmptyStoreState } from "@/components/EmptyStoreState";
import type { Store, Discount } from "@/lib/types";

/**
 * Stores page — shows the user's stores with their discounts.
 *
 * Stores are user-level resources (not tied to a specific list).
 * They represent shops where the user buys products (e.g., "Lidl",
 * "Continente"). Prices on list items are linked to these stores.
 *
 * Each store also has a collapsible discounts section where users
 * can add store-level coupons (e.g., "10% off everything at Lidl").
 */
export default async function StoresPage() {
  const supabase = await createClient();

  // Fetch stores and store-level discounts in parallel — they're independent
  // queries so we can use Promise.all to save time.
  const [{ data: stores }, { data: discounts }] = await Promise.all([
    supabase.from("stores").select("*").order("name"),
    supabase.from("discounts").select("*").is("item_price_id", null),
  ]);

  const userStores = (stores ?? []) as Store[];

  // Group discounts by store_id so we can pass each store's discounts easily
  const discountsByStore = new Map<string, Discount[]>();
  for (const discount of (discounts ?? []) as Discount[]) {
    if (!discountsByStore.has(discount.store_id)) {
      discountsByStore.set(discount.store_id, []);
    }
    discountsByStore.get(discount.store_id)!.push(discount);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">My Stores</h2>

      {/* Form to add a new store — always visible at the top */}
      <StoreForm createAction={createStore} />

      {/* Show the stores, or an empty state if there are none */}
      {userStores.length === 0 ? (
        <EmptyStoreState />
      ) : (
        <div className="flex flex-col gap-2">
          {userStores.map((store) => (
            <div
              key={store.id}
              className="rounded-md border border-zinc-200 bg-white"
            >
              <StoreCard
                store={store}
                updateAction={updateStore}
                deleteAction={deleteStore}
              />
              <StoreDiscountsSection
                storeId={store.id}
                discounts={discountsByStore.get(store.id) ?? []}
                addDiscountAction={addDiscount}
                updateDiscountAction={updateDiscount}
                deleteDiscountAction={deleteDiscount}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
