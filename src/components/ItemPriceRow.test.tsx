import { render, screen, fireEvent } from "@testing-library/react";
import { ItemPriceRow } from "./ItemPriceRow";
import type { ItemPriceWithStore } from "@/lib/types";

// Mock useActionState — returns [state, formAction]
// ItemPriceRow calls useActionState twice: first for update, then for delete
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

const mockPrice: ItemPriceWithStore = {
  id: "price-1",
  product_id: "product-1",
  store_id: "store-1",
  price: 0.89,
  stores: { name: "Lidl" },
};

const mockUpdateAction = jest.fn();
const mockDeleteAction = jest.fn();
const mockAddDiscountAction = jest.fn();
const mockUpdateDiscountAction = jest.fn();
const mockDeleteDiscountAction = jest.fn();

/** Shared props that every test render needs */
const sharedProps = {
  listId: "list-1",
  discounts: [],
  updatePriceAction: mockUpdateAction,
  deletePriceAction: mockDeleteAction,
  addDiscountAction: mockAddDiscountAction,
  updateDiscountAction: mockUpdateDiscountAction,
  deleteDiscountAction: mockDeleteDiscountAction,
};

describe("ItemPriceRow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActionStateCallCount = 0;
  });

  it("renders store name and price in view mode", () => {
    render(<ItemPriceRow price={mockPrice} {...sharedProps} />);

    expect(screen.getByText("Lidl")).toBeInTheDocument();
    expect(screen.getByText("€0.89")).toBeInTheDocument();
  });

  it("renders edit and delete buttons", () => {
    render(<ItemPriceRow price={mockPrice} {...sharedProps} />);

    expect(
      screen.getByRole("button", { name: "Edit price at Lidl" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();
  });

  it("switches to edit mode when edit button is clicked", () => {
    render(<ItemPriceRow price={mockPrice} {...sharedProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Edit price at Lidl" })
    );

    // Should show price input with current value
    expect(screen.getByDisplayValue("0.89")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();
  });

  it("exits edit mode when cancel is clicked", () => {
    render(<ItemPriceRow price={mockPrice} {...sharedProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Edit price at Lidl" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Back in view mode
    expect(screen.getByText("Lidl")).toBeInTheDocument();
    expect(screen.getByText("€0.89")).toBeInTheDocument();
  });

  it("shows confirm dialog when delete is clicked", () => {
    mockConfirm.mockReturnValue(false);

    render(<ItemPriceRow price={mockPrice} {...sharedProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockConfirm).toHaveBeenCalledWith("Delete price at Lidl?");
  });
});
