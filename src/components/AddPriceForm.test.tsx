import { render, screen } from "@testing-library/react";
import { AddPriceForm } from "./AddPriceForm";
import type { Store, ItemPriceWithStore } from "@/lib/types";

// Mock useActionState from React
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

const mockAddPriceAction = jest.fn();

describe("AddPriceForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders store dropdown, price input, and submit button", () => {
    render(
      <AddPriceForm
        productId="product-1"
        listId="list-1"
        stores={mockStores}
        existingPrices={[]}
        addPriceAction={mockAddPriceAction}
      />
    );

    // Store dropdown should have "Select store..." + 2 stores
    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("Select store...");
    expect(options[1]).toHaveTextContent("Lidl");
    expect(options[2]).toHaveTextContent("Continente");

    // Price input
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();

    // Submit button
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("shows link to stores page when user has no stores", () => {
    render(
      <AddPriceForm
        productId="product-1"
        listId="list-1"
        stores={[]}
        existingPrices={[]}
        addPriceAction={mockAddPriceAction}
      />
    );

    expect(screen.getByText("Add stores")).toBeInTheDocument();
    expect(screen.getByText("Add stores")).toHaveAttribute("href", "/stores");
  });

  it("shows message when all stores already have prices", () => {
    const existingPrices: ItemPriceWithStore[] = [
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

    render(
      <AddPriceForm
        productId="product-1"
        listId="list-1"
        stores={mockStores}
        existingPrices={existingPrices}
        addPriceAction={mockAddPriceAction}
      />
    );

    expect(
      screen.getByText("All stores have prices for this item.")
    ).toBeInTheDocument();
  });

  it("excludes stores that already have a price from the dropdown", () => {
    const existingPrices: ItemPriceWithStore[] = [
      {
        id: "price-1",
        product_id: "product-1",
        store_id: "store-1",
        price: 0.89,
        stores: { name: "Lidl" },
      },
    ];

    render(
      <AddPriceForm
        productId="product-1"
        listId="list-1"
        stores={mockStores}
        existingPrices={existingPrices}
        addPriceAction={mockAddPriceAction}
      />
    );

    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");
    // Only "Select store..." + Continente (Lidl is excluded)
    expect(options).toHaveLength(2);
    expect(options[1]).toHaveTextContent("Continente");
  });
});
