import { render, screen, fireEvent } from "@testing-library/react";
import { ShoppingList } from "./ShoppingList";
import type { ListItemWithCategory } from "@/lib/types";
import type { BestDealInfo } from "@/lib/types";

// Mock window.confirm
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

const mockItems: ListItemWithCategory[] = [
  {
    id: "item-1",
    list_id: "list-1",
    product_id: "product-1",
    name: "Milk",
    quantity: 2,
    unit: "L",
    category_id: "cat-1",
    checked: false,
    categories: { name: "Beverages" },
  },
  {
    id: "item-2",
    list_id: "list-1",
    product_id: "product-2",
    name: "Apples",
    quantity: 1,
    unit: "kg",
    category_id: "cat-2",
    checked: false,
    categories: { name: "Fruits" },
  },
  {
    id: "item-3",
    list_id: "list-1",
    product_id: "product-3",
    name: "Bread",
    quantity: 1,
    unit: null,
    category_id: null,
    checked: true,
    categories: null,
  },
];

const mockBestDeals: Record<string, BestDealInfo> = {
  Milk: { storeName: "Lidl", unitPrice: 0.89, lineTotal: 1.78 },
  Apples: { storeName: "Continente", unitPrice: 1.89, lineTotal: 1.89 },
};

const mockToggleAction = jest.fn().mockResolvedValue({ error: null });
const mockUncheckAllAction = jest.fn().mockResolvedValue({ error: null });

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
      />
    );

    // Category headers for unchecked items
    expect(screen.getByText("Beverages")).toBeInTheDocument();
    expect(screen.getByText("Fruits")).toBeInTheDocument();
  });

  it("shows checked items in a Done section", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
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
      />
    );

    expect(
      screen.queryByRole("button", { name: "Uncheck all" })
    ).not.toBeInTheDocument();
  });

  it("shows confirm dialog when Uncheck all is clicked", () => {
    mockConfirm.mockReturnValue(false);

    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Uncheck all" }));

    expect(mockConfirm).toHaveBeenCalledWith(
      "Uncheck all items? This will reset your shopping progress."
    );
  });

  it("shows price toggle when there are best deals", () => {
    render(
      <ShoppingList
        listId="list-1"
        items={mockItems}
        bestDeals={mockBestDeals}
        toggleAction={mockToggleAction}
        uncheckAllAction={mockUncheckAllAction}
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
