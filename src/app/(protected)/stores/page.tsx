import { createClient } from "@/lib/supabase/server";
import { createStore, updateStore, deleteStore } from "../actions";
import { StoreForm } from "@/components/StoreForm";
import { StoreCard } from "@/components/StoreCard";
import { EmptyStoreState } from "@/components/EmptyStoreState";
import type { Store } from "@/lib/types";

/**
 * Stores page — shows the user's stores.
 *
 * Stores are user-level resources (not tied to a specific list).
 * They represent shops where the user buys products (e.g., "Lidl",
 * "Continente"). Prices on list items are linked to these stores.
 *
 * Same pattern as the home page (shopping lists):
 * - Server Component that fetches data
 * - StoreForm for creating
 * - StoreCard for each store (with edit/delete)
 */
export default async function StoresPage() {
  const supabase = await createClient();

  // Fetch all stores for the current user, sorted alphabetically.
  // RLS ensures we only get the logged-in user's stores.
  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .order("name");

  const userStores = (stores ?? []) as Store[];

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
            <StoreCard
              key={store.id}
              store={store}
              updateAction={updateStore}
              deleteAction={deleteStore}
            />
          ))}
        </div>
      )}
    </div>
  );
}
