import { render, screen, fireEvent } from "@testing-library/react";
import { ProductCard } from "./ProductCard";
import type { ProductWithCounts } from "./ProductCard";
import type { Product } from "@/lib/types";

// Mock useActionState — ProductCard calls it twice (update + delete)
const mockUpdateFormAction = jest.fn();
const mockDeleteFormAction = jest.fn();
let useActionStateCallCount = 0;

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useActionState: () => {
    useActionStateCallCount++;
    if (useActionStateCallCount % 2 === 1) {
      return [{ error: null }, mockUpdateFormAction];
    }
    return [{ error: null }, mockDeleteFormAction];
  },
}));

// Mock useFormStatus used inside SubmitButton
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => ({ pending: false }),
}));

// Mock window.confirm
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

const mockProduct: ProductWithCounts = {
  id: "product-1",
  user_id: "user-1",
  name: "Milk",
  item_count: 3,
  price_count: 2,
};

const mockAllProducts: Product[] = [
  { id: "product-1", user_id: "user-1", name: "Milk" },
  { id: "product-2", user_id: "user-1", name: "Bread" },
];

const mockUpdateAction = jest.fn();
const mockDeleteAction = jest.fn();
const mockMergeAction = jest.fn();

describe("ProductCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActionStateCallCount = 0;
  });

  it("renders product name and counts in view mode", () => {
    render(
      <ProductCard
        product={mockProduct}
        prices={[]}
        allProducts={mockAllProducts}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
        mergeAction={mockMergeAction}
      />
    );

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("3 items · 2 prices")).toBeInTheDocument();
  });

  it("renders edit, merge, and delete buttons", () => {
    render(
      <ProductCard
        product={mockProduct}
        prices={[]}
        allProducts={mockAllProducts}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
        mergeAction={mockMergeAction}
      />
    );

    expect(
      screen.getByRole("button", { name: "Edit Milk" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Merge" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();
  });

  it("switches to edit mode when edit button is clicked", () => {
    render(
      <ProductCard
        product={mockProduct}
        prices={[]}
        allProducts={mockAllProducts}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
        mergeAction={mockMergeAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Milk" }));

    expect(screen.getByDisplayValue("Milk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();
  });

  it("exits edit mode when cancel is clicked", () => {
    render(
      <ProductCard
        product={mockProduct}
        prices={[]}
        allProducts={mockAllProducts}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
        mergeAction={mockMergeAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Milk" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Milk" })
    ).toBeInTheDocument();
  });

  it("shows confirm dialog when delete is clicked", () => {
    mockConfirm.mockReturnValue(false);

    render(
      <ProductCard
        product={mockProduct}
        prices={[]}
        allProducts={mockAllProducts}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
        mergeAction={mockMergeAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockConfirm).toHaveBeenCalledWith(
      'Delete "Milk"? 3 item(s) will lose their prices.'
    );
  });

  it("shows merge form when merge button is clicked", () => {
    render(
      <ProductCard
        product={mockProduct}
        prices={[]}
        allProducts={mockAllProducts}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
        mergeAction={mockMergeAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Merge" }));

    expect(screen.getByText("Merge into:")).toBeInTheDocument();
    expect(screen.getByText("Select product...")).toBeInTheDocument();
  });
});
