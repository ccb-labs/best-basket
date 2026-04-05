/**
 * Server Actions for shopping list CRUD.
 *
 * Server Actions are functions that run on the server but can be called
 * from the browser (via forms or direct calls). They're great for mutations
 * (create, update, delete) because:
 * - The database logic stays on the server (more secure)
 * - Forms work even without JavaScript (progressive enhancement)
 * - Next.js automatically handles the request/response for us
 *
 * Each action returns { error: string | null } so the UI can show
 * error messages when something goes wrong.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The shape returned by every action — either an error message or null */
export type ActionResult = {
  error: string | null;
};

/**
 * Get the user_id of the list owner.
 *
 * When a shared user adds or updates items in a shared list, we need
 * to create products in the list OWNER's catalog (not the shared user's).
 * This keeps prices consistent — all collaborators see the same products
 * with the same prices.
 */
async function getListOwnerId(
  supabase: SupabaseClient,
  listId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("shopping_lists")
    .select("user_id")
    .eq("id", listId)
    .single();
  return data?.user_id ?? null;
}

/**
 * Find an existing product by name (case-insensitive) or create a new one.
 *
 * Products are shared across lists — if "Milk" already exists as a product,
 * we reuse it so prices carry over. This is called when adding or updating
 * a list item.
 *
 * Returns the product ID, or null if something went wrong.
 */
async function findOrCreateProduct(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<string | null> {
  // Try to find an existing product with this name (case-insensitive)
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name)
    .limit(1)
    .single();

  if (existing) {
    return existing.id;
  }

  // No match — create a new product
  const { data: created } = await supabase
    .from("products")
    .insert({ name, user_id: userId })
    .select("id")
    .single();

  return created?.id ?? null;
}

/**
 * Create a new shopping list.
 *
 * The first parameter (previousState) is required by useActionState —
 * React passes the previous return value here automatically.
 */
export async function createList(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get("name") as string;

  // Validate: don't allow empty names
  if (!name || name.trim().length === 0) {
    return { error: "Please enter a list name." };
  }

  const supabase = await createClient();

  // Check the user is logged in (safety net — RLS also enforces this)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Insert the new list into the database
  const { error } = await supabase
    .from("shopping_lists")
    .insert({ name: name.trim(), user_id: user.id });

  if (error) {
    return { error: "Could not create list. Please try again." };
  }

  // Tell Next.js to refetch the home page data so the new list appears
  revalidatePath("/");
  return { error: null };
}

/**
 * Rename an existing shopping list.
 */
export async function updateList(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;

  if (!name || name.trim().length === 0) {
    return { error: "List name cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Update the list name — RLS ensures users can only update their own lists
  const { error } = await supabase
    .from("shopping_lists")
    .update({ name: name.trim() })
    .eq("id", id);

  if (error) {
    return { error: "Could not update list. Please try again." };
  }

  revalidatePath("/");
  return { error: null };
}

/**
 * Delete a shopping list.
 *
 * This also deletes all related list_items, item_prices, etc. because
 * the database schema uses ON DELETE CASCADE on foreign keys.
 */
export async function deleteList(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;

  if (!id) {
    return { error: "Missing list ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Delete the list — RLS ensures users can only delete their own lists
  const { error } = await supabase
    .from("shopping_lists")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Could not delete list. Please try again." };
  }

  revalidatePath("/");
  return { error: null };
}

// ─── List Item Actions ────────────────────────────────────────────

/**
 * Add a new item to a shopping list.
 *
 * Also finds or creates a "product" for this item name. Products are
 * shared across lists — if "Milk" already exists as a product (with
 * prices), the new list item links to it automatically.
 */
export async function addItem(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const listId = formData.get("list_id") as string;
  const name = formData.get("name") as string;
  const quantityRaw = formData.get("quantity") as string;
  const unitId = formData.get("unit_id") as string;
  const categoryId = formData.get("category_id") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Please enter an item name." };
  }

  // Parse quantity — default to 1 if empty or invalid
  const quantity = quantityRaw ? parseFloat(quantityRaw) : 1;
  if (isNaN(quantity) || quantity <= 0) {
    return { error: "Quantity must be a positive number." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Use the list owner's user_id for product lookup.
  // If this is a shared list, the product needs to be in the owner's catalog
  // so prices stay consistent for all collaborators.
  const ownerId = await getListOwnerId(supabase, listId);
  if (!ownerId) {
    return { error: "List not found." };
  }

  // Find or create a product with this name in the owner's catalog.
  // ilike does a case-insensitive match so "Milk" and "milk" are the same product.
  const productId = await findOrCreateProduct(supabase, ownerId, name.trim());
  if (!productId) {
    return { error: "Could not create product. Please try again." };
  }

  // If the user didn't pick a category, try to auto-fill it from a previous
  // usage of this product. For example, if "Amendoim" was previously added
  // with "Nuts & Seeds", new list items for "Amendoim" get that category too.
  let resolvedCategoryId = categoryId || null;
  if (!resolvedCategoryId) {
    const { data: previousItem } = await supabase
      .from("list_items")
      .select("category_id")
      .eq("product_id", productId)
      .not("category_id", "is", null)
      .limit(1)
      .single();

    if (previousItem?.category_id) {
      resolvedCategoryId = previousItem.category_id;
    }
  }

  const { error } = await supabase.from("list_items").insert({
    list_id: listId,
    product_id: productId,
    name: name.trim(),
    quantity,
    unit_id: unitId,
    category_id: resolvedCategoryId, // auto-filled from previous usage if not set
  });

  if (error) {
    return { error: "Could not add item. Please try again." };
  }

  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

/**
 * Update an existing list item (name, quantity, unit, category).
 *
 * If the name changes, the product link is updated to match the new name.
 * For example, renaming "Milk" to "Organic Milk" links the item to the
 * "Organic Milk" product (creating it if needed), so it shows different prices.
 */
export async function updateItem(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const listId = formData.get("list_id") as string;
  const name = formData.get("name") as string;
  const quantityRaw = formData.get("quantity") as string;
  const unitId = formData.get("unit_id") as string;
  const categoryId = formData.get("category_id") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Item name cannot be empty." };
  }

  const quantity = quantityRaw ? parseFloat(quantityRaw) : 1;
  if (isNaN(quantity) || quantity <= 0) {
    return { error: "Quantity must be a positive number." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Use the list owner's catalog for consistent product/price data.
  const ownerId = await getListOwnerId(supabase, listId);
  if (!ownerId) {
    return { error: "List not found." };
  }

  // Always find/create a product for the current name in the owner's catalog.
  // If the user renamed the item, this links it to the correct product.
  const productId = await findOrCreateProduct(supabase, ownerId, name.trim());

  // RLS ensures users can only update items in their own or shared lists
  const { error } = await supabase
    .from("list_items")
    .update({
      name: name.trim(),
      product_id: productId,
      quantity,
      unit_id: unitId,
      category_id: categoryId || null,
    })
    .eq("id", id);

  if (error) {
    return { error: "Could not update item. Please try again." };
  }

  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

/**
 * Delete a list item.
 *
 * This also deletes related item_prices because the database schema
 * uses ON DELETE CASCADE on the foreign key.
 */
export async function deleteItem(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const listId = formData.get("list_id") as string;

  if (!id) {
    return { error: "Missing item ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS ensures users can only delete items in their own lists
  const { error } = await supabase.from("list_items").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete item. Please try again." };
  }

  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

// ─── Shopping Mode Actions ────────────────────────────────────────

/**
 * Toggle the checked state of a list item (for shopping mode).
 *
 * Unlike other actions, this one takes direct parameters instead of
 * FormData. This is because checking items off needs to feel instant —
 * it's called from an onClick handler with useOptimistic, not a form.
 *
 * Both patterns are valid Server Actions — the "use server" directive
 * at the top of this file covers all exported functions.
 */
export async function toggleItemChecked(
  itemId: string,
  listId: string,
  checked: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS ensures users can only update items in their own lists
  const { error } = await supabase
    .from("list_items")
    .update({ checked })
    .eq("id", itemId);

  if (error) {
    return { error: "Could not update item. Please try again." };
  }

  // Revalidate so the server state matches the optimistic UI.
  // Without this, useOptimistic reverts to the stale server state
  // once the transition completes, causing the item to uncheck itself.
  revalidatePath(`/lists/${listId}/shop`);
  return { error: null };
}

/**
 * Uncheck all items in a shopping list (reset for next shopping trip).
 *
 * Sets every item's checked column back to false. Called when the user
 * taps "Uncheck all" in shopping mode.
 */
export async function uncheckAllItems(
  listId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Update all items in this list — RLS ensures ownership
  const { error } = await supabase
    .from("list_items")
    .update({ checked: false })
    .eq("list_id", listId);

  if (error) {
    return { error: "Could not reset items. Please try again." };
  }

  revalidatePath(`/lists/${listId}/shop`);
  return { error: null };
}

// ─── Category Actions ─────────────────────────────────────────────

/**
 * Create a custom category for the current user.
 *
 * Default categories (like "Fruits", "Beverages") have user_id = null.
 * User-created categories have user_id set to the current user's ID,
 * so they're only visible to that user.
 */
export async function createCategory(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get("name") as string;
  const listId = formData.get("list_id") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Please enter a category name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), user_id: user.id });

  if (error) {
    return { error: "Could not create category. Please try again." };
  }

  // Revalidate the list page so the new category appears in the dropdown
  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

// ─── Product Actions ──────────────────────────────────────────────

/**
 * Rename a product.
 *
 * All list items linked to this product keep their link — they'll
 * display the new name next time data is fetched.
 */
export async function updateProduct(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Product name cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Also update the name on all list items that use this product,
  // so the display name stays in sync
  const { error } = await supabase
    .from("products")
    .update({ name: name.trim() })
    .eq("id", id);

  if (error) {
    return { error: "Could not rename product. Please try again." };
  }

  // Update list item names to match the new product name
  await supabase
    .from("list_items")
    .update({ name: name.trim() })
    .eq("product_id", id);

  revalidatePath("/products");
  return { error: null };
}

/**
 * Delete a product and all its prices.
 *
 * List items that reference this product will have their product_id
 * set to null (ON DELETE SET NULL), so they stay in their lists but
 * lose their price data.
 */
export async function deleteProduct(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;

  if (!id) {
    return { error: "Missing product ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete product. Please try again." };
  }

  revalidatePath("/products");
  return { error: null };
}

/**
 * Merge one product into another.
 *
 * All list items and prices from the source product are moved to the
 * target product. If both products have a price at the same store,
 * the target's price is kept. Then the source product is deleted.
 *
 * This is useful for cleaning up duplicates (e.g., merging "Caju"
 * into "Castanha de Caju").
 */
export async function mergeProducts(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const sourceId = formData.get("source_id") as string;
  const targetId = formData.get("target_id") as string;

  if (!sourceId || !targetId) {
    return { error: "Please select a product to merge into." };
  }

  if (sourceId === targetId) {
    return { error: "Cannot merge a product into itself." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // 1. Move list items from source to target
  const { error: itemsError } = await supabase
    .from("list_items")
    .update({ product_id: targetId })
    .eq("product_id", sourceId);

  if (itemsError) {
    return { error: "Could not merge list items. Please try again." };
  }

  // 2. Delete source prices that conflict with target prices
  //    (same store). The target's prices take priority.
  const { data: targetPrices } = await supabase
    .from("item_prices")
    .select("store_id")
    .eq("product_id", targetId);

  const targetStoreIds = (targetPrices ?? []).map((p) => p.store_id);

  if (targetStoreIds.length > 0) {
    await supabase
      .from("item_prices")
      .delete()
      .eq("product_id", sourceId)
      .in("store_id", targetStoreIds);
  }

  // 3. Move remaining source prices to target
  await supabase
    .from("item_prices")
    .update({ product_id: targetId })
    .eq("product_id", sourceId);

  // 4. Delete the source product (now has no items or prices)
  await supabase.from("products").delete().eq("id", sourceId);

  revalidatePath("/products");
  return { error: null };
}

// ─── Store Actions ────────────────────────────────────────────────

/**
 * Create a new store for the current user.
 *
 * Stores are user-level resources (not tied to a specific list).
 * Each user has their own set of stores (e.g., "Lidl", "Continente").
 */
export async function createStore(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get("name") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Please enter a store name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("stores")
    .insert({ name: name.trim(), user_id: user.id });

  if (error) {
    return { error: "Could not create store. Please try again." };
  }

  revalidatePath("/stores");
  return { error: null };
}

/**
 * Rename an existing store.
 */
export async function updateStore(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Store name cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS ensures users can only update their own stores
  const { error } = await supabase
    .from("stores")
    .update({ name: name.trim() })
    .eq("id", id);

  if (error) {
    return { error: "Could not update store. Please try again." };
  }

  revalidatePath("/stores");
  return { error: null };
}

/**
 * Delete a store.
 *
 * This also deletes all item_prices at this store because the database
 * schema uses ON DELETE CASCADE on the foreign key.
 */
export async function deleteStore(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;

  if (!id) {
    return { error: "Missing store ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS ensures users can only delete their own stores
  const { error } = await supabase.from("stores").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete store. Please try again." };
  }

  revalidatePath("/stores");
  return { error: null };
}

// ─── Item Price Actions ───────────────────────────────────────────

/**
 * Add a price for a product at a specific store.
 *
 * Prices are on products (not list items), so they're shared across
 * all lists that contain the same product. The unique constraint on
 * (product_id, store_id) prevents duplicate prices.
 */
export async function addPrice(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const productId = formData.get("product_id") as string;
  const storeId = formData.get("store_id") as string;
  const priceRaw = formData.get("price") as string;
  const listId = formData.get("list_id") as string;

  if (!storeId) {
    return { error: "Please select a store." };
  }

  if (!priceRaw || priceRaw.trim().length === 0) {
    return { error: "Please enter a price." };
  }

  const price = parseFloat(priceRaw);
  if (isNaN(price) || price < 0) {
    return { error: "Price must be zero or a positive number." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("item_prices")
    .insert({ product_id: productId, store_id: storeId, price });

  if (error) {
    // The unique constraint will trigger an error if a price already exists
    if (error.code === "23505") {
      return { error: "This product already has a price at that store." };
    }
    return { error: "Could not add price. Please try again." };
  }

  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

/**
 * Update the price of an existing item price entry.
 */
export async function updatePrice(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const priceRaw = formData.get("price") as string;
  const listId = formData.get("list_id") as string;

  if (!priceRaw || priceRaw.trim().length === 0) {
    return { error: "Please enter a price." };
  }

  const price = parseFloat(priceRaw);
  if (isNaN(price) || price < 0) {
    return { error: "Price must be zero or a positive number." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS ensures users can only update prices for items in their own lists
  const { error } = await supabase
    .from("item_prices")
    .update({ price })
    .eq("id", id);

  if (error) {
    return { error: "Could not update price. Please try again." };
  }

  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

/**
 * Delete an item price entry.
 */
export async function deletePrice(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const listId = formData.get("list_id") as string;

  if (!id) {
    return { error: "Missing price ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS ensures users can only delete prices for items in their own lists
  const { error } = await supabase.from("item_prices").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete price. Please try again." };
  }

  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

// ─── Discount Actions ────────────────────────────────────────────

/**
 * Validate discount type and value fields.
 *
 * Shared by addDiscount and updateDiscount to avoid duplicating the
 * same validation logic in both actions.
 */
function validateDiscountInput(
  type: string,
  valueRaw: string
): { value: number; error: string | null } {
  if (type !== "percentage" && type !== "fixed") {
    return { value: 0, error: "Please select a discount type." };
  }

  if (!valueRaw || valueRaw.trim().length === 0) {
    return { value: 0, error: "Please enter a discount value." };
  }

  const value = parseFloat(valueRaw);
  if (isNaN(value) || value <= 0) {
    return { value: 0, error: "Discount value must be a positive number." };
  }

  if (type === "percentage" && value > 100) {
    return { value: 0, error: "Percentage discount cannot exceed 100%." };
  }

  return { value, error: null };
}

/**
 * Add a discount/coupon for a store or a specific product at a store.
 *
 * If item_price_id is provided, the discount applies to that specific
 * product at that store. If omitted, it's a store-level discount that
 * applies to all products at that store.
 */
export async function addDiscount(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const storeId = formData.get("store_id") as string;
  const itemPriceId = (formData.get("item_price_id") as string) || null;
  const type = formData.get("type") as string;
  const valueRaw = formData.get("value") as string;
  const description = (formData.get("description") as string)?.trim() || null;
  const listId = formData.get("list_id") as string;

  if (!storeId) {
    return { error: "Missing store." };
  }

  const validated = validateDiscountInput(type, valueRaw);
  if (validated.error) {
    return { error: validated.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase.from("discounts").insert({
    user_id: user.id,
    store_id: storeId,
    item_price_id: itemPriceId,
    type,
    value: validated.value,
    description,
  });

  if (error) {
    return { error: "Could not add discount. Please try again." };
  }

  revalidatePath("/stores");
  if (listId) {
    revalidatePath(`/lists/${listId}`);
  }
  return { error: null };
}

/**
 * Update an existing discount (type, value, or description).
 */
export async function updateDiscount(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const type = formData.get("type") as string;
  const valueRaw = formData.get("value") as string;
  const description = (formData.get("description") as string)?.trim() || null;
  const listId = formData.get("list_id") as string;

  if (!id) {
    return { error: "Missing discount ID." };
  }

  const validated = validateDiscountInput(type, valueRaw);
  if (validated.error) {
    return { error: validated.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS ensures users can only update their own discounts
  const { error } = await supabase
    .from("discounts")
    .update({ type, value: validated.value, description })
    .eq("id", id);

  if (error) {
    return { error: "Could not update discount. Please try again." };
  }

  revalidatePath("/stores");
  if (listId) {
    revalidatePath(`/lists/${listId}`);
  }
  return { error: null };
}

/**
 * Delete a discount.
 */
export async function deleteDiscount(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const listId = formData.get("list_id") as string;

  if (!id) {
    return { error: "Missing discount ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS ensures users can only delete their own discounts
  const { error } = await supabase.from("discounts").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete discount. Please try again." };
  }

  revalidatePath("/stores");
  if (listId) {
    revalidatePath(`/lists/${listId}`);
  }
  return { error: null };
}

// ─── List Sharing Actions ────────────────────────────────────────

/**
 * Share a shopping list with another user by email.
 *
 * Looks up the recipient's user ID using the get_user_id_by_email
 * database function, then inserts a row into list_shares.
 * RLS ensures only the list owner can share.
 */
export async function shareList(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const listId = formData.get("list_id") as string;
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Can't share with yourself
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return { error: "You can't share a list with yourself." };
  }

  // Look up the recipient's user ID by email.
  // This calls a SECURITY DEFINER function that can access auth.users.
  const { data: recipientId, error: lookupError } = await supabase.rpc(
    "get_user_id_by_email",
    { lookup_email: email.toLowerCase() }
  );

  if (lookupError || !recipientId) {
    return { error: "No user found with that email address." };
  }

  // Insert the share — RLS ensures only the list owner can do this
  const { error } = await supabase
    .from("list_shares")
    .insert({ list_id: listId, user_id: recipientId });

  if (error) {
    // Unique constraint violation means already shared
    if (error.code === "23505") {
      return { error: "This list is already shared with that user." };
    }
    return { error: "Could not share list. Please try again." };
  }

  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

/**
 * Remove a user's access to a shared shopping list.
 *
 * RLS ensures only the list owner can remove shares.
 */
export async function unshareList(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const shareId = formData.get("share_id") as string;
  const listId = formData.get("list_id") as string;

  if (!shareId) {
    return { error: "Missing share ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS ensures only the list owner can delete shares
  const { error } = await supabase
    .from("list_shares")
    .delete()
    .eq("id", shareId);

  if (error) {
    return { error: "Could not remove share. Please try again." };
  }

  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

// ─── Template Actions ────────────────────────────────────────

/**
 * Copy all items from one list to another.
 *
 * Used by both "Save as Template" and "Create from Template" to avoid
 * duplicating the item-copying logic. Copies name, product link,
 * quantity, unit, and category — checked defaults to false.
 */
async function copyListItems(
  supabase: SupabaseClient,
  sourceListId: string,
  targetListId: string
): Promise<{ error: string | null }> {
  const { data: sourceItems } = await supabase
    .from("list_items")
    .select("name, product_id, quantity, unit_id, category_id")
    .eq("list_id", sourceListId);

  if (sourceItems && sourceItems.length > 0) {
    const newItems = sourceItems.map((item) => ({
      list_id: targetListId,
      name: item.name,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_id: item.unit_id,
      category_id: item.category_id,
    }));

    const { error } = await supabase.from("list_items").insert(newItems);
    if (error) return { error: "Could not copy items." };
  }

  return { error: null };
}

/**
 * Create a new empty template from scratch.
 *
 * Unlike saveAsTemplate (which copies an existing list), this creates
 * a blank template that the user can then add items to.
 */
export async function createTemplate(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get("name") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Please enter a template name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("shopping_lists")
    .insert({ name: name.trim(), user_id: user.id, is_template: true });

  if (error) {
    return { error: "Could not create template. Please try again." };
  }

  revalidatePath("/templates");
  return { error: null };
}

/**
 * Save an existing shopping list as a reusable template.
 *
 * This creates a COPY of the list with is_template = true, then copies
 * all the list items into the new template. The original list is unchanged.
 * Think of it like "Save As" — the template is a separate snapshot.
 */
export async function saveAsTemplate(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const listId = formData.get("list_id") as string;

  if (!listId) {
    return { error: "Missing list ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Fetch the source list to get its name
  const { data: sourceList } = await supabase
    .from("shopping_lists")
    .select("name")
    .eq("id", listId)
    .single();

  if (!sourceList) {
    return { error: "List not found." };
  }

  // Create the template (a new shopping_lists row with is_template = true)
  const { data: template, error: createError } = await supabase
    .from("shopping_lists")
    .insert({
      name: sourceList.name,
      user_id: user.id,
      is_template: true,
    })
    .select("id")
    .single();

  if (createError || !template) {
    return { error: "Could not create template. Please try again." };
  }

  // Copy all items from the source list into the template
  const copyResult = await copyListItems(supabase, listId, template.id);
  if (copyResult.error) {
    return { error: "Template created but could not copy items." };
  }

  // Redirect to the templates page so the user sees their new template
  redirect("/templates");
}

/**
 * Create a new shopping list from a template.
 *
 * Copies the template's items into a fresh list. The template stays
 * unchanged — you can use it again and again. Also updates the
 * template's last_used_at so the recurrence reminder knows when
 * this template was last used.
 */
export async function createListFromTemplate(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const templateId = formData.get("template_id") as string;

  if (!templateId) {
    return { error: "Missing template ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Fetch the template to get its name and verify it's a template
  const { data: template } = await supabase
    .from("shopping_lists")
    .select("name, is_template")
    .eq("id", templateId)
    .single();

  if (!template) {
    return { error: "Template not found." };
  }

  if (!template.is_template) {
    return { error: "This list is not a template." };
  }

  // Create a new regular list with the template's name
  const { data: newList, error: createError } = await supabase
    .from("shopping_lists")
    .insert({
      name: template.name,
      user_id: user.id,
      is_template: false,
    })
    .select("id")
    .single();

  if (createError || !newList) {
    return { error: "Could not create list. Please try again." };
  }

  // Copy items and update last_used_at
  const copyResult = await copyListItems(supabase, templateId, newList.id);
  if (copyResult.error) {
    return { error: "List created but could not copy items." };
  }

  // Update last_used_at so the recurrence reminder resets.
  // For example, if this is a weekly template, the reminder won't
  // show again until 7 days from now.
  await supabase
    .from("shopping_lists")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", templateId);

  // Redirect to the new list so the user can start using it
  redirect(`/lists/${newList.id}`);
}

/**
 * Update a template's name and/or recurrence schedule.
 *
 * Recurrence controls how often the app reminds you to create a new
 * list from this template: "weekly" (every 7 days), "monthly" (every
 * 30 days), or null (no reminders).
 */
export async function updateTemplate(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const recurrenceRaw = formData.get("recurrence") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Template name cannot be empty." };
  }

  // Convert empty string to null (the <select> sends "" for "None")
  const recurrence =
    recurrenceRaw === "weekly" || recurrenceRaw === "monthly"
      ? recurrenceRaw
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("shopping_lists")
    .update({ name: name.trim(), recurrence })
    .eq("id", id);

  if (error) {
    return { error: "Could not update template. Please try again." };
  }

  revalidatePath("/templates");
  return { error: null };
}

/**
 * Delete a template.
 *
 * This also deletes all list_items in the template because the
 * database schema uses ON DELETE CASCADE on foreign keys.
 * Lists previously created from this template are NOT affected.
 */
export async function deleteTemplate(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;

  if (!id) {
    return { error: "Missing template ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("shopping_lists")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Could not delete template. Please try again." };
  }

  revalidatePath("/templates");
  return { error: null };
}
