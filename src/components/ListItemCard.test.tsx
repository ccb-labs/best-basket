import { render, screen, fireEvent } from "@testing-library/react";
import { ListItemCard } from "./ListItemCard";
import type { ListItemWithCategory, Category, Unit } from "@/lib/types";

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

const mockUnits: Unit[] = [
  { id: "unit-emb", abbreviation: "Emb", name: "Embalagem" },
  { id: "unit-un", abbreviation: "Un", name: "Unidade" },
  { id: "unit-kg", abbreviation: "Kg", name: "Quilo" },
  { id: "unit-g", abbreviation: "g", name: "Grama" },
  { id: "unit-l", abbreviation: "L", name: "Litro" },
];

const mockItem: ListItemWithCategory = {
  id: "item-1",
  list_id: "list-1",
  product_id: "product-1",
  name: "Milk",
  quantity: 2,
  unit_id: "unit-l",
  category_id: "cat-1",
  checked: false,
  categories: { name: "Beverages" },
  units: { abbreviation: "L" },
};

const mockItemNoCategory: ListItemWithCategory = {
  id: "item-2",
  list_id: "list-1",
  product_id: "product-2",
  name: "Bread",
  quantity: 1,
  unit_id: "unit-un",
  category_id: null,
  checked: false,
  categories: null,
  units: { abbreviation: "Un" },
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
        units={mockUnits}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("2 L")).toBeInTheDocument();
    expect(screen.getByText("Beverages")).toBeInTheDocument();
  });

  it("renders quantity with default unit when no special unit", () => {
    render(
      <ListItemCard
        item={mockItemNoCategory}
        categories={mockCategories}
        units={mockUnits}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("1 Un")).toBeInTheDocument();
    // No category badge should be shown
    expect(screen.queryByText("Beverages")).not.toBeInTheDocument();
  });

  it("renders edit and delete buttons", () => {
    render(
      <ListItemCard
        item={mockItem}
        categories={mockCategories}
        units={mockUnits}
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
        units={mockUnits}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Milk" }));

    // Should show inputs with current values
    expect(screen.getByDisplayValue("Milk")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();

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
        units={mockUnits}
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
    render(
      <ListItemCard
        item={mockItem}
        categories={mockCategories}
        units={mockUnits}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    // The custom confirm dialog should appear with the correct message
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByText('Delete "Milk"? This cannot be undone.')
    ).toBeInTheDocument();
  });

  it("renders category dropdown with correct options in edit mode", () => {
    render(
      <ListItemCard
        item={mockItem}
        categories={mockCategories}
        units={mockUnits}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Milk" }));

    // There are 2 dropdowns in edit mode: unit and category
    const selects = screen.getAllByRole("combobox");
    // The category dropdown is the second one
    const categorySelect = selects[1];
    const options = categorySelect.querySelectorAll("option");

    expect(options).toHaveLength(3); // "No category" + 2 categories
    expect(options[0]).toHaveTextContent("No category");
    expect(options[1]).toHaveTextContent("Beverages");
    expect(options[2]).toHaveTextContent("Fruits");
  });
});
