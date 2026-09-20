import { splitCheckedItems, groupItemsByCategory } from "./list-helpers";
import type { ListItemWithCategory } from "./types";

// ─── Helper factory ─────────────────────────────────────────────────

function makeItem(
  overrides: Partial<ListItemWithCategory> = {}
): ListItemWithCategory {
  return {
    id: "item1",
    list_id: "list1",
    product_id: null,
    name: "Milk",
    quantity: 1,
    unit_id: "unit-un",
    category_id: null,
    checked: false,
    checked_at: null,
    categories: null,
    units: { abbreviation: "Un", name: "Unidade", gender: "f" as const },
    ...overrides,
  };
}

// ─── splitCheckedItems ──────────────────────────────────────────────

describe("splitCheckedItems", () => {
  it("separates unchecked items from checked ones", () => {
    const items = [
      makeItem({ id: "a", name: "Milk", checked: false }),
      makeItem({ id: "b", name: "Bread", checked: true, checked_at: "2026-01-01T10:00:00Z" }),
      makeItem({ id: "c", name: "Eggs", checked: false }),
    ];

    const { remainingItems, doneItems } = splitCheckedItems(items);

    expect(remainingItems.map((i) => i.id)).toEqual(["a", "c"]);
    expect(doneItems.map((i) => i.id)).toEqual(["b"]);
  });

  it("sorts checked items with the most recently checked first", () => {
    const items = [
      makeItem({ id: "old", checked: true, checked_at: "2026-01-01T10:00:00Z" }),
      makeItem({ id: "new", checked: true, checked_at: "2026-01-01T12:00:00Z" }),
      makeItem({ id: "mid", checked: true, checked_at: "2026-01-01T11:00:00Z" }),
    ];

    const { doneItems } = splitCheckedItems(items);

    expect(doneItems.map((i) => i.id)).toEqual(["new", "mid", "old"]);
  });

  it("puts checked items without a timestamp at the bottom", () => {
    const items = [
      makeItem({ id: "no-time", checked: true, checked_at: null }),
      makeItem({ id: "timed", checked: true, checked_at: "2026-01-01T10:00:00Z" }),
    ];

    const { doneItems } = splitCheckedItems(items);

    expect(doneItems.map((i) => i.id)).toEqual(["timed", "no-time"]);
  });

  it("returns empty arrays for an empty list", () => {
    const { remainingItems, doneItems } = splitCheckedItems([]);

    expect(remainingItems).toEqual([]);
    expect(doneItems).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const items = [
      makeItem({ id: "a", checked: true, checked_at: "2026-01-01T10:00:00Z" }),
      makeItem({ id: "b", checked: true, checked_at: "2026-01-01T12:00:00Z" }),
    ];

    splitCheckedItems(items);

    expect(items.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

// ─── groupItemsByCategory (used for the unchecked items) ────────────

describe("groupItemsByCategory", () => {
  it("groups unchecked items by category and puts Uncategorized last", () => {
    const items = [
      makeItem({ id: "a", name: "Milk", categories: { name: "Bebidas" } }),
      makeItem({ id: "b", name: "Soap", categories: null }),
      makeItem({ id: "c", name: "Apple", categories: { name: "Frutas" } }),
    ];

    const groups = groupItemsByCategory(items);

    expect(groups.map(([name]) => name)).toEqual([
      "Bebidas",
      "Frutas",
      "Uncategorized",
    ]);
  });
});
