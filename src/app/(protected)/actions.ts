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
import { createClient } from "@/lib/supabase/server";

/** The shape returned by every action — either an error message or null */
export type ActionResult = {
  error: string | null;
};

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
 */
export async function addItem(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const listId = formData.get("list_id") as string;
  const name = formData.get("name") as string;
  const quantityRaw = formData.get("quantity") as string;
  const unit = formData.get("unit") as string;
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

  const { error } = await supabase.from("list_items").insert({
    list_id: listId,
    name: name.trim(),
    quantity,
    unit: unit?.trim() || null, // empty string becomes null
    category_id: categoryId || null, // empty string becomes null
  });

  if (error) {
    return { error: "Could not add item. Please try again." };
  }

  revalidatePath(`/lists/${listId}`);
  return { error: null };
}

/**
 * Update an existing list item (name, quantity, unit, category).
 */
export async function updateItem(
  previousState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const listId = formData.get("list_id") as string;
  const name = formData.get("name") as string;
  const quantityRaw = formData.get("quantity") as string;
  const unit = formData.get("unit") as string;
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

  // RLS ensures users can only update items in their own lists
  const { error } = await supabase
    .from("list_items")
    .update({
      name: name.trim(),
      quantity,
      unit: unit?.trim() || null,
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
