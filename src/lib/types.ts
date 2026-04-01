/**
 * Shared TypeScript types for the database tables.
 *
 * These types mirror the columns in our Supabase tables so we get
 * autocomplete and type-checking when working with query results.
 */

/** A shopping list as stored in the shopping_lists table */
export type ShoppingList = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  is_template: boolean;
  recurrence: "weekly" | "monthly" | null;
};

/** A category as stored in the categories table */
export type Category = {
  id: string;
  user_id: string | null; // null = default category (available to all users)
  name: string;
};

/** A list item as stored in the list_items table */
export type ListItem = {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category_id: string | null;
};

/**
 * A list item with its category name included.
 *
 * When we query Supabase with .select("*, categories(name)"), it joins the
 * categories table and returns the result as a nested object. For example:
 * { id: "...", name: "Milk", ..., categories: { name: "Beverages" } }
 */
export type ListItemWithCategory = ListItem & {
  categories: { name: string } | null;
};
