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
