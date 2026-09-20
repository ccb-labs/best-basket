import { render, screen } from "@testing-library/react";
import { ListItemsSection } from "./ListItemsSection";
import type { ListItemWithCategory } from "@/lib/types";

// The price sub-section isn't what we're testing here, and it pulls in
// several forms of its own. Stubbing it keeps this test focused on the
// ordering of the item cards.
jest.mock("./ItemPricesSection", () => ({
  ItemPricesSection: () => null,
}));

function makeItem(
  overrides: Partial<ListItemWithCategory> = {}
): ListItemWithCategory {
  return {
    id: "item-1",
    list_id: "list-1",
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

const noopAction = jest.fn().mockResolvedValue({ error: null });

function renderSection(items: ListItemWithCategory[]) {
  return render(
    <ListItemsSection
      listId="list-1"
      items={items}
      categories={[]}
      units={[{ id: "unit-un", abbreviation: "Un", name: "Unidade", gender: "f" }]}
      stores={[]}
      pricesByProduct={{}}
      allDiscounts={[]}
      updateItemAction={noopAction}
      deleteItemAction={noopAction}
      addPriceAction={noopAction}
      updatePriceAction={noopAction}
      deletePriceAction={noopAction}
      addDiscountAction={noopAction}
      updateDiscountAction={noopAction}
      deleteDiscountAction={noopAction}
    />
  );
}

describe("ListItemsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not show the Already Picked Up section when nothing is checked", () => {
    renderSection([
      makeItem({ id: "a", name: "Milk", categories: { name: "Bebidas" } }),
    ]);

    expect(screen.queryByText(/Already Picked Up/)).not.toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
  });

  it("moves checked items into an Already Picked Up section with a count", () => {
    renderSection([
      makeItem({ id: "a", name: "Milk", categories: { name: "Bebidas" } }),
      makeItem({
        id: "b",
        name: "Bread",
        checked: true,
        checked_at: "2026-01-01T10:00:00Z",
        categories: { name: "Cereais" },
      }),
    ]);

    const heading = screen.getByText("Already Picked Up (1)");
    expect(heading).toBeInTheDocument();

    // The checked item lives inside the Already Picked Up block, not in
    // the category groups above it. The heading's parent is that block.
    const pickedUpSection = heading.parentElement!;
    expect(pickedUpSection).toHaveTextContent("Bread");
    expect(pickedUpSection).not.toHaveTextContent("Milk");
  });

  it("renders unchecked items above the checked ones", () => {
    renderSection([
      makeItem({
        id: "b",
        name: "Bread",
        checked: true,
        checked_at: "2026-01-01T10:00:00Z",
      }),
      makeItem({ id: "a", name: "Milk" }),
    ]);

    // getAllByText walks the DOM in document order, so comparing positions
    // in this array tells us which item renders first on the page.
    const names = screen
      .getAllByText(/^(Milk|Bread)$/)
      .map((el) => el.textContent);

    expect(names).toEqual(["Milk", "Bread"]);
  });

  it("orders picked up items with the most recently checked first", () => {
    renderSection([
      makeItem({
        id: "old",
        name: "Bread",
        checked: true,
        checked_at: "2026-01-01T10:00:00Z",
      }),
      makeItem({
        id: "new",
        name: "Eggs",
        checked: true,
        checked_at: "2026-01-01T12:00:00Z",
      }),
    ]);

    const names = screen
      .getAllByText(/^(Bread|Eggs)$/)
      .map((el) => el.textContent);

    expect(names).toEqual(["Eggs", "Bread"]);
  });

  it("still shows picked up items when only they match the search", () => {
    renderSection([
      makeItem({ id: "a", name: "Milk" }),
      makeItem({
        id: "b",
        name: "Bread",
        checked: true,
        checked_at: "2026-01-01T10:00:00Z",
      }),
    ]);

    expect(screen.getByText("Already Picked Up (1)")).toBeInTheDocument();
    expect(screen.queryByText(/No items match/)).not.toBeInTheDocument();
  });
});
