import { render, screen, fireEvent } from "@testing-library/react";
import { ShoppingList } from "./ShoppingList";
import type { ListItemWithCategory } from "@/lib/types";
import type { BestDealInfo } from "@/lib/types";

// Mock Next.js router (needed for the delete action redirect)
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const mockItems: ListItemWithCategory[] = [
  {
    id: "item-1",
    list_id: "list-1",
    product_id: "product-1",
    name: "Milk",
    quantity: 2,
    unit_id: "unit-l",
    category_id: "cat-1",
    checked: false,
    checked_at: null,
    categories: { name: "Bebidas" },
    units: { abbreviation: "L", name: "Litro", gender: "m" as const },
  },
  {
    id: "item-2",
    list_id: "list-1",
    product_id: "product-2",
    name: "Apples",
    quantity: 1,
    unit_id: "unit-kg",
    category_id: "cat-2",
    checked: false,
    checked_at: null,
    categories: { name: "Frutas" },
    units: { abbreviation: "Kg", name: "Quilograma", gender: "m" as const },
  },
  {
    id: "item-3",
    list_id: "list-1",
    product_id: "product-3",
    name: "Bread",
    quantity: 1,
    unit_id: "unit-un",
    category_id: null,
    checked: true,
    checked_at: "2026-04-30T10:00:00.000Z",
    categories: null,
    units: { abbreviation: "Un", name: "Unidade", gender: "f" as const },
  },
];

const mockBestDeals: Record<string, BestDealInfo> = {
  Milk: { storeName: "Lidl", unitPrice: 0.89, lineTotal: 1.78 },
  Apples: { storeName: "Continente", unitPrice: 1.89, lineTotal: 1.89 },
};

const mockToggleAction = jest.fn().mockResolvedValue({ error: null });
const mockUncheckAllAction = jest.fn().mockResolvedValue({ error: null });
const mockDeleteAction = jest.fn().mockResolvedValue({ error: null });

describe("ShoppingList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders progress bar with correct counts", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
        deleteAction={mockDeleteAction}
      />
    );

    // 1 of 3 items checked (Bread is checked)
    expect(screen.getByText("1 of 3 items")).toBeInTheDocument();
  });

  it("groups unchecked items by category", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
        deleteAction={mockDeleteAction}
      />
    );

    // Category headers for unchecked items
    expect(screen.getByText("Bebidas")).toBeInTheDocument();
    expect(screen.getByText("Frutas")).toBeInTheDocument();
  });

  it("shows checked items in a Done section", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
        deleteAction={mockDeleteAction}
      />
    );

    // Done section header
    expect(screen.getByText("Done (1)")).toBeInTheDocument();
    // Bread is the checked item
    expect(screen.getByText("Bread")).toBeInTheDocument();
  });

  it("shows Uncheck all button when there are checked items", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(
      screen.getByRole("button", { name: "Uncheck all" })
    ).toBeInTheDocument();
  });

  it("does not show Uncheck all when no items are checked", () => {
    const allUnchecked = mockItems.map((item) => ({
      ...item,
      checked: false,
    }));

    render(
      <ShoppingList
        listId="list-1"
        items={allUnchecked}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Uncheck all" })
    ).not.toBeInTheDocument();
  });

  it("shows confirm dialog when Uncheck all is clicked", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Uncheck all" }));

    // The custom confirm dialog should appear with the correct message
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Uncheck all items? This will reset your shopping progress."
      )
    ).toBeInTheDocument();
  });

  it("shows price toggle when there are best deals", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(
      screen.getByRole("button", { name: "Hide prices" })
    ).toBeInTheDocument();
  });

  it("hides price toggle when there are no best deals", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={{}}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Hide prices" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show prices" })
    ).not.toBeInTheDocument();
  });

  it("toggles price visibility when toggle button is clicked", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
        deleteAction={mockDeleteAction}
      />
    );

    // Initially prices are shown
    const toggleButton = screen.getByRole("button", { name: "Hide prices" });
    fireEvent.click(toggleButton);

    // Now it should say "Show prices"
    expect(
      screen.getByRole("button", { name: "Show prices" })
    ).toBeInTheDocument();
  });
});
