import {
  calculateStoreTotals,
  calculateSmartSplit,
} from "./comparison";
import type { Discount, ItemPriceWithStore, ListItemWithCategory } from "./types";

// ─── Helper factories ───────────────────────────────────────────────

function makeItem(overrides: Partial<ListItemWithCategory> = {}): ListItemWithCategory {
  return {
    id: "item1",
    list_id: "list1",
    product_id: "prod1",
    name: "Milk",
    quantity: 1,
    unit_id: "unit-un",
    category_id: null,
    checked: false,
    categories: null,
    units: { abbreviation: "Un" },
    ...overrides,
  };
}

function makePrice(
  overrides: Partial<ItemPriceWithStore> = {}
): ItemPriceWithStore {
  return {
    id: "price1",
    product_id: "prod1",
    store_id: "store1",
    price: 1.0,
    stores: { name: "Store A" },
    ...overrides,
  };
}

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

// ─── calculateStoreTotals ───────────────────────────────────────────

describe("calculateStoreTotals", () => {
  it("returns empty array when there are no priceable items", () => {
    const items = [makeItem({ product_id: null })];
    const result = calculateStoreTotals(items, new Map(), []);
    expect(result).toEqual([]);
  });

  it("returns empty array when there are no items", () => {
    const result = calculateStoreTotals([], new Map(), []);
    expect(result).toEqual([]);
  });

  it("calculates total for a single item at one store", () => {
    const items = [makeItem({ quantity: 2 })];
    const prices = new Map([
      ["prod1", [makePrice({ price: 1.5 })]],
    ]);

    const result = calculateStoreTotals(items, prices, []);

    expect(result).toHaveLength(1);
    expect(result[0].storeName).toBe("Store A");
    expect(result[0].total).toBe(3.0); // 1.50 × 2
    expect(result[0].itemsCovered).toBe(1);
    expect(result[0].isComplete).toBe(true);
  });

  it("sorts stores cheapest first", () => {
    const items = [makeItem()];
    const prices = new Map([
      [
        "prod1",
        [
          makePrice({ id: "p1", store_id: "store1", price: 2.0, stores: { name: "Expensive" } }),
          makePrice({ id: "p2", store_id: "store2", price: 1.0, stores: { name: "Cheap" } }),
        ],
      ],
    ]);

    const result = calculateStoreTotals(items, prices, []);

    expect(result[0].storeName).toBe("Cheap");
    expect(result[0].total).toBe(1.0);
    expect(result[1].storeName).toBe("Expensive");
    expect(result[1].total).toBe(2.0);
  });

  it("multiplies by quantity", () => {
    const items = [makeItem({ quantity: 3 })];
    const prices = new Map([["prod1", [makePrice({ price: 2.0 })]]]);

    const result = calculateStoreTotals(items, prices, []);
    expect(result[0].total).toBe(6.0); // 2.00 × 3
  });

  it("applies discounts before multiplying by quantity", () => {
    const items = [makeItem({ quantity: 2 })];
    const prices = new Map([["prod1", [makePrice({ price: 10.0 })]]]);
    const discounts = [
      makeDiscount({ type: "percentage", value: 10, store_id: "store1" }),
    ];

    const result = calculateStoreTotals(items, prices, discounts);
    // 10.00 × 0.90 = 9.00 per unit × 2 = 18.00
    expect(result[0].total).toBe(18.0);
  });

  it("marks stores with partial coverage as incomplete", () => {
    const items = [
      makeItem({ id: "i1", product_id: "prod1", name: "Milk" }),
      makeItem({ id: "i2", product_id: "prod2", name: "Bread" }),
    ];
    // Store A only has Milk, not Bread
    const prices = new Map([
      ["prod1", [makePrice({ store_id: "store1", stores: { name: "Store A" } })]],
    ]);

    const result = calculateStoreTotals(items, prices, []);

    expect(result[0].itemsCovered).toBe(1);
    expect(result[0].totalPriceableItems).toBe(2);
    expect(result[0].isComplete).toBe(false);
  });

  it("sums totals across multiple items", () => {
    const items = [
      makeItem({ id: "i1", product_id: "prod1", name: "Milk", quantity: 1 }),
      makeItem({ id: "i2", product_id: "prod2", name: "Bread", quantity: 2 }),
    ];
    const prices = new Map([
      ["prod1", [makePrice({ id: "p1", product_id: "prod1", price: 1.0 })]],
      ["prod2", [makePrice({ id: "p2", product_id: "prod2", price: 0.5 })]],
    ]);

    const result = calculateStoreTotals(items, prices, []);
    // Milk: 1.00 × 1 + Bread: 0.50 × 2 = 2.00
    expect(result[0].total).toBe(2.0);
    expect(result[0].isComplete).toBe(true);
  });

  it("ignores items without a product_id", () => {
    const items = [
      makeItem({ id: "i1", product_id: "prod1" }),
      makeItem({ id: "i2", product_id: null, name: "Custom item" }),
    ];
    const prices = new Map([["prod1", [makePrice()]]]);

    const result = calculateStoreTotals(items, prices, []);
    // Only 1 priceable item, and it's covered
    expect(result[0].totalPriceableItems).toBe(1);
    expect(result[0].isComplete).toBe(true);
  });
});

// ─── calculateSmartSplit ────────────────────────────────────────────

describe("calculateSmartSplit", () => {
  it("assigns a single item to the cheapest store", () => {
    const items = [makeItem()];
    const prices = new Map([
      [
        "prod1",
        [
          makePrice({ id: "p1", store_id: "store1", price: 2.0, stores: { name: "Expensive" } }),
          makePrice({ id: "p2", store_id: "store2", price: 1.0, stores: { name: "Cheap" } }),
        ],
      ],
    ]);

    const storeTotals = calculateStoreTotals(items, prices, []);
    const result = calculateSmartSplit(items, prices, [], storeTotals);

    expect(result.storeGroups).toHaveLength(1);
    expect(result.storeGroups[0].storeName).toBe("Cheap");
    expect(result.storeGroups[0].items).toHaveLength(1);
    expect(result.grandTotal).toBe(1.0);
  });

  it("splits items across stores when different stores are cheapest", () => {
    const items = [
      makeItem({ id: "i1", product_id: "prod1", name: "Milk" }),
      makeItem({ id: "i2", product_id: "prod2", name: "Bread" }),
    ];
    const prices = new Map([
      [
        "prod1",
        [
          makePrice({ id: "p1", store_id: "store1", product_id: "prod1", price: 1.0, stores: { name: "Store A" } }),
          makePrice({ id: "p2", store_id: "store2", product_id: "prod1", price: 2.0, stores: { name: "Store B" } }),
        ],
      ],
      [
        "prod2",
        [
          makePrice({ id: "p3", store_id: "store1", product_id: "prod2", price: 3.0, stores: { name: "Store A" } }),
          makePrice({ id: "p4", store_id: "store2", product_id: "prod2", price: 1.0, stores: { name: "Store B" } }),
        ],
      ],
    ]);

    const storeTotals = calculateStoreTotals(items, prices, []);
    const result = calculateSmartSplit(items, prices, [], storeTotals);

    // Milk → Store A (€1), Bread → Store B (€1)
    expect(result.storeGroups).toHaveLength(2);
    expect(result.grandTotal).toBe(2.0);

    const storeA = result.storeGroups.find((g) => g.storeName === "Store A")!;
    expect(storeA.items[0].itemName).toBe("Milk");

    const storeB = result.storeGroups.find((g) => g.storeName === "Store B")!;
    expect(storeB.items[0].itemName).toBe("Bread");
  });

  it("puts items without product_id in unpricedItems", () => {
    const items = [makeItem({ product_id: null, name: "Custom item" })];

    const storeTotals = calculateStoreTotals(items, new Map(), []);
    const result = calculateSmartSplit(items, new Map(), [], storeTotals);

    expect(result.storeGroups).toHaveLength(0);
    expect(result.unpricedItems).toHaveLength(1);
    expect(result.unpricedItems[0].itemName).toBe("Custom item");
  });

  it("puts items with no prices anywhere in unpricedItems", () => {
    const items = [makeItem()];
    // product_id is "prod1" but no prices exist for it
    const storeTotals = calculateStoreTotals(items, new Map(), []);
    const result = calculateSmartSplit(items, new Map(), [], storeTotals);

    expect(result.unpricedItems).toHaveLength(1);
    expect(result.unpricedItems[0].itemName).toBe("Milk");
  });

  it("considers discounts when picking the cheapest store", () => {
    const items = [makeItem()];
    const prices = new Map([
      [
        "prod1",
        [
          // Store A: €2.00 but with 50% off → €1.00
          makePrice({ id: "p1", store_id: "store1", price: 2.0, stores: { name: "Store A" } }),
          // Store B: €1.50 with no discount → €1.50
          makePrice({ id: "p2", store_id: "store2", price: 1.5, stores: { name: "Store B" } }),
        ],
      ],
    ]);
    const discounts = [
      makeDiscount({ type: "percentage", value: 50, store_id: "store1" }),
    ];

    const storeTotals = calculateStoreTotals(items, prices, discounts);
    const result = calculateSmartSplit(items, prices, discounts, storeTotals);

    // Store A is cheaper after discount
    expect(result.storeGroups[0].storeName).toBe("Store A");
    expect(result.grandTotal).toBe(1.0);
  });

  it("multiplies by quantity in line totals", () => {
    const items = [makeItem({ quantity: 3 })];
    const prices = new Map([["prod1", [makePrice({ price: 2.0 })]]]);

    const storeTotals = calculateStoreTotals(items, prices, []);
    const result = calculateSmartSplit(items, prices, [], storeTotals);
    expect(result.storeGroups[0].items[0].unitPrice).toBe(2.0);
    expect(result.storeGroups[0].items[0].lineTotal).toBe(6.0);
    expect(result.grandTotal).toBe(6.0);
  });

  it("calculates savings vs cheapest complete single store", () => {
    const items = [
      makeItem({ id: "i1", product_id: "prod1", name: "Milk" }),
      makeItem({ id: "i2", product_id: "prod2", name: "Bread" }),
    ];
    const prices = new Map([
      [
        "prod1",
        [
          makePrice({ id: "p1", store_id: "store1", product_id: "prod1", price: 1.0, stores: { name: "Store A" } }),
          makePrice({ id: "p2", store_id: "store2", product_id: "prod1", price: 3.0, stores: { name: "Store B" } }),
        ],
      ],
      [
        "prod2",
        [
          makePrice({ id: "p3", store_id: "store1", product_id: "prod2", price: 4.0, stores: { name: "Store A" } }),
          makePrice({ id: "p4", store_id: "store2", product_id: "prod2", price: 2.0, stores: { name: "Store B" } }),
        ],
      ],
    ]);

    const storeTotals = calculateStoreTotals(items, prices, []);
    const result = calculateSmartSplit(items, prices, [], storeTotals);

    // Smart split: Milk → Store A (€1), Bread → Store B (€2) = €3 total
    // Cheapest complete store: Store A (€1 + €4 = €5) or Store B (€3 + €2 = €5)
    // Both are €5, savings = €5 - €3 = €2
    expect(result.grandTotal).toBe(3.0);
    expect(result.savingsVsCheapest).toBe(2.0);
  });

  it("returns zero savings when no complete store exists", () => {
    const items = [
      makeItem({ id: "i1", product_id: "prod1", name: "Milk" }),
      makeItem({ id: "i2", product_id: "prod2", name: "Bread" }),
    ];
    // Each store only has one of the two items
    const prices = new Map([
      ["prod1", [makePrice({ id: "p1", store_id: "store1", product_id: "prod1", stores: { name: "Store A" } })]],
      ["prod2", [makePrice({ id: "p2", store_id: "store2", product_id: "prod2", stores: { name: "Store B" } })]],
    ]);

    const storeTotals = calculateStoreTotals(items, prices, []);
    const result = calculateSmartSplit(items, prices, [], storeTotals);
    expect(result.savingsVsCheapest).toBe(0);
  });

  it("sorts store groups by store name", () => {
    const items = [
      makeItem({ id: "i1", product_id: "prod1", name: "Milk" }),
      makeItem({ id: "i2", product_id: "prod2", name: "Bread" }),
    ];
    const prices = new Map([
      ["prod1", [makePrice({ id: "p1", store_id: "store2", product_id: "prod1", price: 1.0, stores: { name: "Zebra" } })]],
      ["prod2", [makePrice({ id: "p2", store_id: "store1", product_id: "prod2", price: 1.0, stores: { name: "Alpha" } })]],
    ]);

    const storeTotals = calculateStoreTotals(items, prices, []);
    const result = calculateSmartSplit(items, prices, [], storeTotals);

    expect(result.storeGroups[0].storeName).toBe("Alpha");
    expect(result.storeGroups[1].storeName).toBe("Zebra");
  });
});
