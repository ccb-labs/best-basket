/**
 * Price comparison and smart split calculations.
 *
 * These pure functions power the "Compare Prices" dashboard (Phase 6).
 * They figure out:
 * 1. How much a shopping list costs at each store (with discounts)
 * 2. The smartest way to split purchases across stores to save money
 *
 * Both functions reuse the discount helpers from discounts.ts — they
 * handle the per-item math, while this file handles the list-wide totals.
 */

import {
  calculateDiscountedPrice,
  getApplicableDiscounts,
} from "@/lib/discounts";
import type { Discount, ItemPriceWithStore, ListItemWithCategory } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

/** The total cost of a shopping list at a single store */
export type StoreTotalResult = {
  storeId: string;
  storeName: string;
  /** Total cost after discounts, multiplied by quantities */
  total: number;
  /** How many list items this store has prices for */
  itemsCovered: number;
  /** Total items that could have prices (have a product_id) */
  totalPriceableItems: number;
  /** True if this store has prices for every priceable item */
  isComplete: boolean;
};

/** One item's assignment in the smart split */
export type SmartSplitItem = {
  itemName: string;
  quantity: number;
  unit: string;
  storeName: string;
  storeId: string;
  /** Discounted price per unit */
  unitPrice: number;
  /** unitPrice × quantity */
  lineTotal: number;
};

/** An item that has no price at any store */
export type UnpricedItem = {
  itemName: string;
  quantity: number;
  unit: string;
};

/** The full result of a smart split calculation */
export type SmartSplitResult = {
  /** Items grouped by the store they should be bought at */
  storeGroups: {
    storeId: string;
    storeName: string;
    items: SmartSplitItem[];
    /** Sum of all line totals for this store */
    storeTotal: number;
  }[];
  /** Grand total across all stores */
  grandTotal: number;
  /** Items that couldn't be assigned (no prices anywhere) */
  unpricedItems: UnpricedItem[];
  /** How much cheaper the smart split is vs. the cheapest single store */
  savingsVsCheapest: number;
};

// ─── calculateStoreTotals ───────────────────────────────────────────

/**
 * Calculate the total cost of a shopping list at each store.
 *
 * How it works:
 * 1. Find all stores that appear in the price data
 * 2. For each store, loop through every list item that has a product_id
 * 3. If the store has a price for that product, apply discounts and
 *    multiply by quantity to get the line total
 * 4. Sum up all line totals for the store's grand total
 *
 * Stores with zero matching items are excluded from the results.
 * Results are sorted cheapest first.
 *
 * @param items - The list items (only those with product_id are counted)
 * @param pricesByProduct - Map of product_id → prices at various stores
 * @param allDiscounts - All discounts that could apply
 * @returns Store totals sorted by total ascending (cheapest first)
 */
export function calculateStoreTotals(
  items: ListItemWithCategory[],
  pricesByProduct: Map<string, ItemPriceWithStore[]>,
  allDiscounts: Discount[]
): StoreTotalResult[] {
  // Only items with a product_id can have prices
  const priceableItems = items.filter((item) => item.product_id !== null);
  const totalPriceableItems = priceableItems.length;

  if (totalPriceableItems === 0) return [];

  // Collect all unique stores from the price data.
  // We use a Map so we can look up store names by ID later.
  const storeMap = new Map<string, string>();
  for (const prices of pricesByProduct.values()) {
    for (const price of prices) {
      storeMap.set(price.store_id, price.stores.name);
    }
  }

  const results: StoreTotalResult[] = [];

  for (const [storeId, storeName] of storeMap) {
    let total = 0;
    let itemsCovered = 0;

    for (const item of priceableItems) {
      const prices = pricesByProduct.get(item.product_id!) ?? [];
      const priceAtStore = prices.find((p) => p.store_id === storeId);

      if (priceAtStore) {
        // Apply discounts to the unit price, then multiply by quantity
        const discounts = getApplicableDiscounts(priceAtStore, allDiscounts);
        const discountedUnitPrice = calculateDiscountedPrice(
          Number(priceAtStore.price),
          discounts
        );
        total += discountedUnitPrice * Number(item.quantity);
        itemsCovered++;
      }
    }

    // Only include stores that have at least one matching item
    if (itemsCovered > 0) {
      results.push({
        storeId,
        storeName,
        total,
        itemsCovered,
        totalPriceableItems,
        isComplete: itemsCovered === totalPriceableItems,
      });
    }
  }

  // Sort cheapest first
  results.sort((a, b) => a.total - b.total);

  return results;
}

// ─── calculateSmartSplit ────────────────────────────────────────────

/**
 * Calculate the optimal way to split a shopping list across stores.
 *
 * The "smart split" strategy is simple: for each item, buy it at
 * whichever store offers the lowest discounted price. This gives the
 * absolute cheapest total, even if it means visiting multiple stores.
 *
 * How it works:
 * 1. For each item with a product_id, find all its prices
 * 2. Calculate the discounted unit price at each store
 * 3. Pick the store with the lowest discounted price
 * 4. Multiply by quantity for the line total
 * 5. Group all items by their assigned store
 * 6. Compare the grand total to the cheapest single-store total
 *    to show how much the split saves
 *
 * Items without a product_id or without any prices go into the
 * "unpriced" list — they can't be part of the comparison.
 *
 * @param items - The list items
 * @param pricesByProduct - Map of product_id → prices at various stores
 * @param allDiscounts - All discounts that could apply
 * @param storeTotals - Pre-computed store totals (from calculateStoreTotals)
 *   so we don't recalculate them — the caller typically needs both results
 * @returns The optimal split with savings info
 */
export function calculateSmartSplit(
  items: ListItemWithCategory[],
  pricesByProduct: Map<string, ItemPriceWithStore[]>,
  allDiscounts: Discount[],
  storeTotals: StoreTotalResult[]
): SmartSplitResult {
  const assignments: SmartSplitItem[] = [];
  const unpricedItems: UnpricedItem[] = [];

  for (const item of items) {
    // Items without a product link can't have prices
    if (!item.product_id) {
      unpricedItems.push({
        itemName: item.name,
        quantity: Number(item.quantity),
        unit: item.units.abbreviation,
      });
      continue;
    }

    const prices = pricesByProduct.get(item.product_id) ?? [];

    if (prices.length === 0) {
      unpricedItems.push({
        itemName: item.name,
        quantity: Number(item.quantity),
        unit: item.units.abbreviation,
      });
      continue;
    }

    // Find the store with the cheapest discounted unit price
    let cheapestPrice: ItemPriceWithStore | null = null;
    let cheapestDiscounted = Infinity;

    for (const price of prices) {
      const discounts = getApplicableDiscounts(price, allDiscounts);
      const discounted = calculateDiscountedPrice(
        Number(price.price),
        discounts
      );
      if (discounted < cheapestDiscounted) {
        cheapestDiscounted = discounted;
        cheapestPrice = price;
      }
    }

    if (cheapestPrice) {
      assignments.push({
        itemName: item.name,
        quantity: Number(item.quantity),
        unit: item.units.abbreviation,
        storeName: cheapestPrice.stores.name,
        storeId: cheapestPrice.store_id,
        unitPrice: cheapestDiscounted,
        lineTotal: cheapestDiscounted * Number(item.quantity),
      });
    }
  }

  // Group assignments by store ID
  const groupMap = new Map<string, SmartSplitItem[]>();
  for (const item of assignments) {
    if (!groupMap.has(item.storeId)) {
      groupMap.set(item.storeId, []);
    }
    groupMap.get(item.storeId)!.push(item);
  }

  // Build store groups sorted by store name
  const storeGroups = [...groupMap.entries()]
    .map(([storeId, groupItems]) => ({
      storeId,
      storeName: groupItems[0].storeName,
      items: groupItems.sort((a, b) => a.itemName.localeCompare(b.itemName)),
      storeTotal: groupItems.reduce((sum, item) => sum + item.lineTotal, 0),
    }))
    .sort((a, b) => a.storeName.localeCompare(b.storeName));

  const grandTotal = storeGroups.reduce((sum, g) => sum + g.storeTotal, 0);

  // Compare against the cheapest single store to show savings.
  // We only compare to "complete" stores (ones that have all items),
  // because a partial store can't actually fulfill the whole list.
  const cheapestComplete = storeTotals.find((s) => s.isComplete);
  const savingsVsCheapest = cheapestComplete
    ? cheapestComplete.total - grandTotal
    : 0;

  return {
    storeGroups,
    grandTotal,
    unpricedItems,
    savingsVsCheapest,
  };
}
