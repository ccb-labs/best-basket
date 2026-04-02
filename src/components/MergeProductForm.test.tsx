import { render, screen } from "@testing-library/react";
import { MergeProductForm } from "./MergeProductForm";
import type { Product } from "@/lib/types";

// Mock useActionState
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

const mockProducts: Product[] = [
  { id: "product-1", user_id: "user-1", name: "Milk" },
  { id: "product-2", user_id: "user-1", name: "Bread" },
  { id: "product-3", user_id: "user-1", name: "Cheese" },
];

const mockMergeAction = jest.fn();
const mockOnCancel = jest.fn();

describe("MergeProductForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders dropdown excluding the source product", () => {
    render(
      <MergeProductForm
        sourceId="product-1"
        allProducts={mockProducts}
        mergeAction={mockMergeAction}
        onCancel={mockOnCancel}
      />
    );

    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");

    // "Select product..." + Bread + Cheese (Milk excluded as source)
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("Select product...");
    expect(options[1]).toHaveTextContent("Bread");
    expect(options[2]).toHaveTextContent("Cheese");
  });

  it("renders merge and cancel buttons", () => {
    render(
      <MergeProductForm
        sourceId="product-1"
        allProducts={mockProducts}
        mergeAction={mockMergeAction}
        onCancel={mockOnCancel}
      />
    );

    expect(
      screen.getByRole("button", { name: "Merge" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();
  });
});
