import { calculateDiscountedPrice, getApplicableDiscounts } from "./discounts";
import type { Discount, ItemPriceWithStore } from "./types";

// ─── Helper to build a Discount quickly ──────────────────────────

function makeDiscount(
  overrides: Partial<Discount> & Pick<Discount, "type" | "value">
): Discount {
  return {
    id: "d1",
    user_id: "user1",
    store_id: "store1",
    item_price_id: null,
    description: null,
    ...overrides,
  };
}

// ─── calculateDiscountedPrice ────────────────────────────────────

describe("calculateDiscountedPrice", () => {
  it("returns original price when there are no discounts", () => {
    expect(calculateDiscountedPrice(10, [])).toBe(10);
  });

  it("applies a single percentage discount", () => {
    const discounts = [makeDiscount({ type: "percentage", value: 10 })];
    expect(calculateDiscountedPrice(10, discounts)).toBe(9);
  });

  it("applies a single fixed discount", () => {
    const discounts = [makeDiscount({ type: "fixed", value: 2.5 })];
    expect(calculateDiscountedPrice(10, discounts)).toBe(7.5);
  });

  it("stacks multiple percentage discounts additively", () => {
    const discounts = [
      makeDiscount({ id: "d1", type: "percentage", value: 10 }),
      makeDiscount({ id: "d2", type: "percentage", value: 5 }),
    ];
    // 10% + 5% = 15% off → 10 * 0.85 = 8.5
    expect(calculateDiscountedPrice(10, discounts)).toBe(8.5);
  });

  it("stacks multiple fixed discounts", () => {
    const discounts = [
      makeDiscount({ id: "d1", type: "fixed", value: 1 }),
      makeDiscount({ id: "d2", type: "fixed", value: 0.5 }),
    ];
    expect(calculateDiscountedPrice(10, discounts)).toBe(8.5);
  });

  it("applies percentage before fixed when both exist", () => {
    const discounts = [
      makeDiscount({ id: "d1", type: "percentage", value: 20 }),
      makeDiscount({ id: "d2", type: "fixed", value: 1 }),
    ];
    // 10 * 0.80 - 1 = 7
    expect(calculateDiscountedPrice(10, discounts)).toBe(7);
  });

  it("never returns less than 0", () => {
    const discounts = [makeDiscount({ type: "fixed", value: 100 })];
    expect(calculateDiscountedPrice(5, discounts)).toBe(0);
  });

  it("never returns less than 0 with percentage + fixed combo", () => {
    const discounts = [
      makeDiscount({ id: "d1", type: "percentage", value: 90 }),
      makeDiscount({ id: "d2", type: "fixed", value: 5 }),
    ];
    // 10 * 0.10 - 5 = -4 → clamped to 0
    expect(calculateDiscountedPrice(10, discounts)).toBe(0);
  });
});

// ─── getApplicableDiscounts ──────────────────────────────────────

describe("getApplicableDiscounts", () => {
  const price: ItemPriceWithStore = {
    id: "price1",
    product_id: "prod1",
    store_id: "store1",
    price: 5,
    stores: { name: "Lidl" },
  };

  it("returns store-level discounts matching the store", () => {
    const discounts = [
      makeDiscount({ store_id: "store1", item_price_id: null }),
    ];
    expect(getApplicableDiscounts(price, discounts)).toEqual(discounts);
  });

  it("returns product-level discounts matching the price ID", () => {
    const discounts = [
      makeDiscount({ store_id: "store1", item_price_id: "price1" }),
    ];
    expect(getApplicableDiscounts(price, discounts)).toEqual(discounts);
  });

  it("excludes store-level discounts for a different store", () => {
    const discounts = [
      makeDiscount({ store_id: "store2", item_price_id: null }),
    ];
    expect(getApplicableDiscounts(price, discounts)).toEqual([]);
  });

  it("excludes product-level discounts for a different price", () => {
    const discounts = [
      makeDiscount({ store_id: "store1", item_price_id: "price99" }),
    ];
    expect(getApplicableDiscounts(price, discounts)).toEqual([]);
  });

  it("returns both store-level and product-level when both apply", () => {
    const storeDiscount = makeDiscount({
      id: "d1",
      store_id: "store1",
      item_price_id: null,
    });
    const productDiscount = makeDiscount({
      id: "d2",
      store_id: "store1",
      item_price_id: "price1",
    });
    const unrelated = makeDiscount({
      id: "d3",
      store_id: "store2",
      item_price_id: null,
    });

    const result = getApplicableDiscounts(price, [
      storeDiscount,
      productDiscount,
      unrelated,
    ]);
    expect(result).toEqual([storeDiscount, productDiscount]);
  });
});
