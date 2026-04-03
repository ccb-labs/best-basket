import { render, screen, fireEvent } from "@testing-library/react";
import { ItemPricesSection } from "./ItemPricesSection";
import type { Store, ItemPriceWithStore } from "@/lib/types";

// Mock useActionState — ItemPriceRow uses it twice (update + delete),
// and AddPriceForm uses it once. We return the initial state for all.
const mockFormAction = jest.fn();
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useActionState: (action: unknown, initialState: unknown) => [
    initialState,
    mockFormAction,
  ],
}));

// Mock useFormStatus used inside SubmitButton
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => ({ pending: false }),
}));

const mockStores: Store[] = [
  { id: "store-1", user_id: "user-1", name: "Lidl" },
  { id: "store-2", user_id: "user-1", name: "Continente" },
];

const mockPrices: ItemPriceWithStore[] = [
  {
    id: "price-1",
    product_id: "product-1",
    store_id: "store-1",
    price: 0.89,
    stores: { name: "Lidl" },
  },
  {
    id: "price-2",
    product_id: "product-1",
    store_id: "store-2",
    price: 1.05,
    stores: { name: "Continente" },
  },
];

const mockActions = {
  addPriceAction: jest.fn(),
  updatePriceAction: jest.fn(),
  deletePriceAction: jest.fn(),
  addDiscountAction: jest.fn(),
  updateDiscountAction: jest.fn(),
  deleteDiscountAction: jest.fn(),
};

describe("ItemPricesSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows 'No prices yet' when there are no prices", () => {
    render(
      <ItemPricesSection
        productId="product-1"
        listId="list-1"
        prices={[]}
        stores={mockStores}
        discounts={[]}
        {...mockActions}
      />
    );

    expect(screen.getByText("No prices yet")).toBeInTheDocument();
  });

  it("shows cheapest price summary when prices exist", () => {
    render(
      <ItemPricesSection
        productId="product-1"
        listId="list-1"
        prices={mockPrices}
        stores={mockStores}
        discounts={[]}
        {...mockActions}
      />
    );

    expect(
      screen.getByText("Best: €0.89 at Lidl")
    ).toBeInTheDocument();
  });

  it("starts collapsed and expands when clicked", () => {
    render(
      <ItemPricesSection
        productId="product-1"
        listId="list-1"
        prices={mockPrices}
        stores={mockStores}
        discounts={[]}
        {...mockActions}
      />
    );

    // Should not show individual prices yet (collapsed)
    expect(screen.queryByText("€0.89")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText("Best: €0.89 at Lidl"));

    // Should now show individual price rows
    expect(screen.getByText("€0.89")).toBeInTheDocument();
    expect(screen.getByText("€1.05")).toBeInTheDocument();
  });

  it("collapses when clicked again", () => {
    render(
      <ItemPricesSection
        productId="product-1"
        listId="list-1"
        prices={mockPrices}
        stores={mockStores}
        discounts={[]}
        {...mockActions}
      />
    );

    // Expand
    fireEvent.click(screen.getByText("Best: €0.89 at Lidl"));
    expect(screen.getByText("€0.89")).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByText("Best: €0.89 at Lidl"));
    expect(screen.queryByText("€0.89")).not.toBeInTheDocument();
  });
});
