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
  last_used_at: string | null;
};

/** A category as stored in the categories table */
export type Category = {
  id: string;
  user_id: string | null; // null = default category (available to all users)
  name: string;
};

/** A product — a real-world item the user buys (e.g., "Milk") */
export type Product = {
  id: string;
  user_id: string;
  name: string;
};

/** A list item as stored in the list_items table */
export type ListItem = {
  id: string;
  list_id: string;
  product_id: string | null; // links to a shared product for price lookup
  name: string;
  quantity: number;
  unit: string | null;
  category_id: string | null;
  checked: boolean; // Phase 7: whether the item has been checked off while shopping
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

/** A store as stored in the stores table */
export type Store = {
  id: string;
  user_id: string;
  name: string;
};

/** A price entry linking a product to a store */
export type ItemPrice = {
  id: string;
  product_id: string;
  store_id: string;
  price: number;
};

/**
 * An item price with the store name included.
 *
 * When we query Supabase with .select("*, stores(name)"), it joins the
 * stores table and returns the result as a nested object. For example:
 * { id: "...", product_id: "...", store_id: "...", price: 0.89, stores: { name: "Lidl" } }
 */
export type ItemPriceWithStore = ItemPrice & {
  stores: { name: string };
};

/**
 * A discount/coupon as stored in the discounts table.
 *
 * Discounts can apply at two levels:
 * - Store-level (item_price_id = null): applies to all products at that store
 * - Product-level (item_price_id set): applies to one specific product at a store
 *
 * The "type" field determines how the discount is calculated:
 * - "percentage": reduces the price by a percentage (e.g., 10 means 10% off)
 * - "fixed": subtracts a fixed amount (e.g., 0.50 means €0.50 off)
 */
export type Discount = {
  id: string;
  user_id: string;
  store_id: string;
  item_price_id: string | null; // null = store-level, set = product-level
  type: "percentage" | "fixed";
  value: number;
  description: string | null;
};

/** A sharing record linking a list to a shared user */
export type ListShare = {
  id: string;
  list_id: string;
  user_id: string;
};

/**
 * A shared list as returned by the get_shared_lists() database function.
 * Includes the owner's email so we can show "Shared by [email]" in the UI.
 */
export type SharedList = {
  id: string;
  name: string;
  created_at: string;
  owner_email: string;
};

/** Best deal info for an item from the smart split calculation */
export type BestDealInfo = {
  storeName: string;
  unitPrice: number;
  lineTotal: number;
};
