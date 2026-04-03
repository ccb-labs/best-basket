/**
 * Discount calculation helpers.
 *
 * These pure functions handle the math for applying discounts to prices.
 * They're used by ItemPriceRow (to show discounted prices) and
 * ItemPricesSection (to find the cheapest discounted price).
 */

import type { Discount, ItemPrice, ItemPriceWithStore } from "@/lib/types";

/**
 * Calculate the final price after applying all discounts.
 *
 * How it works:
 * 1. Add up all percentage discounts (e.g., 10% + 5% = 15% off)
 * 2. Add up all fixed discounts (e.g., €0.50 + €0.25 = €0.75 off)
 * 3. Apply: price × (1 - totalPercent/100) - totalFixed
 * 4. Never go below €0.00
 *
 * @param originalPrice - The base price before discounts
 * @param discounts - All discounts that apply to this price
 * @returns The final price after discounts (minimum 0)
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  discounts: Discount[]
): number {
  if (discounts.length === 0) return originalPrice;

  let totalPercentage = 0;
  let totalFixed = 0;

  for (const discount of discounts) {
    if (discount.type === "percentage") {
      totalPercentage += discount.value;
    } else {
      totalFixed += discount.value;
    }
  }

  const result = originalPrice * (1 - totalPercentage / 100) - totalFixed;
  return Math.max(0, result);
}

/**
 * Format a discount for display (e.g., "10% off" or "€0.50 off").
 */
export function formatDiscountLabel(discount: Discount): string {
  const value =
    discount.type === "percentage"
      ? `${Number(discount.value)}%`
      : `€${Number(discount.value).toFixed(2)}`;
  return `${value} off`;
}

/**
 * Find all discounts that apply to a specific price entry.
 *
 * A discount applies if:
 * - It's a store-level discount (item_price_id is null) AND matches the store
 * - OR it's a product-level discount that targets this exact price entry
 *
 * @param itemPrice - The price entry to check
 * @param allDiscounts - All available discounts
 * @returns Discounts that apply to this price
 */
export function getApplicableDiscounts(
  itemPrice: ItemPrice | ItemPriceWithStore,
  allDiscounts: Discount[]
): Discount[] {
  return allDiscounts.filter(
    (d) =>
      (d.store_id === itemPrice.store_id && d.item_price_id === null) ||
      d.item_price_id === itemPrice.id
  );
}
