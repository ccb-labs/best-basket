import { render, screen, fireEvent } from "@testing-library/react";
import { ListItemCard } from "./ListItemCard";
import type { ListItemWithCategory, Category } from "@/lib/types";

// Mock useActionState — returns [state, formAction]
// ListItemCard calls useActionState twice: first for update, then for delete
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

const mockItem: ListItemWithCategory = {
  id: "item-1",
  list_id: "list-1",
  name: "Milk",
  quantity: 2,
  unit: "L",
  category_id: "cat-1",
  categories: { name: "Beverages" },
};

const mockItemNoCategory: ListItemWithCategory = {
  id: "item-2",
  list_id: "list-1",
  name: "Bread",
  quantity: 1,
  unit: null,
  category_id: null,
  categories: null,
};

const mockCategories: Category[] = [
  { id: "cat-1", user_id: null, name: "Beverages" },
  { id: "cat-2", user_id: null, name: "Fruits" },
];

const mockUpdateAction = jest.fn();
const mockDeleteAction = jest.fn();

describe("ListItemCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActionStateCallCount = 0;
  });

  it("renders item name, quantity with unit, and category in view mode", () => {
    render(
      <ListItemCard
        item={mockItem}
        categories={mockCategories}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("2 L")).toBeInTheDocument();
    expect(screen.getByText("Beverages")).toBeInTheDocument();
  });

  it("renders quantity without unit when unit is null", () => {
    render(
      <ListItemCard
        item={mockItemNoCategory}
        categories={mockCategories}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    // No category badge should be shown
    expect(screen.queryByText("Beverages")).not.toBeInTheDocument();
  });

  it("renders edit and delete buttons", () => {
    render(
      <ListItemCard
        item={mockItem}
        categories={mockCategories}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(
      screen.getByRole("button", { name: "Edit Milk" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();
  });

  it("switches to edit mode when edit button is clicked", () => {
    render(
      <ListItemCard
        item={mockItem}
        categories={mockCategories}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Milk" }));

    // Should show inputs with current values
    expect(screen.getByDisplayValue("Milk")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("L")).toBeInTheDocument();

    // Should show Save and Cancel buttons
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();
  });

  it("exits edit mode when cancel is clicked", () => {
    render(
      <ListItemCard
        item={mockItem}
        categories={mockCategories}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: "Edit Milk" }));

    // Click cancel
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Should be back in view mode
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Milk" })
    ).toBeInTheDocument();
  });

  it("shows confirm dialog when delete is clicked", () => {
    mockConfirm.mockReturnValue(false);

    render(
      <ListItemCard
        item={mockItem}
        categories={mockCategories}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockConfirm).toHaveBeenCalledWith(
      'Delete "Milk"? This cannot be undone.'
    );
  });

  it("renders category dropdown with correct options in edit mode", () => {
    render(
      <ListItemCard
        item={mockItem}
        categories={mockCategories}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Milk" }));

    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");

    expect(options).toHaveLength(3); // "No category" + 2 categories
    expect(options[0]).toHaveTextContent("No category");
    expect(options[1]).toHaveTextContent("Beverages");
    expect(options[2]).toHaveTextContent("Fruits");
  });
});
