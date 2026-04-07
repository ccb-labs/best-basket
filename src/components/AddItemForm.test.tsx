import { render, screen, fireEvent } from "@testing-library/react";
import { AddItemForm } from "./AddItemForm";
import type { Category, Unit } from "@/lib/types";

// Mock useActionState — returns [state, formAction]
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useActionState: () => [{ error: null }, jest.fn()],
}));

// Mock useFormStatus used inside SubmitButton
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => ({ pending: false }),
}));

// Mock the voice input hook — default: not supported (jsdom has no Speech API)
const mockStartListening = jest.fn();
const mockStopListening = jest.fn();
let mockVoiceSupported = false;

jest.mock("@/hooks/useVoiceInput", () => ({
  useVoiceInput: () => ({
    isSupported: mockVoiceSupported,
    isListening: false,
    startListening: mockStartListening,
    stopListening: mockStopListening,
  }),
}));

const mockCategories: Category[] = [
  { id: "cat-1", user_id: null, name: "Bebidas" },
  { id: "cat-2", user_id: null, name: "Frutas" },
  { id: "cat-3", user_id: "user-1", name: "My Custom" },
];

const mockUnits: Unit[] = [
  { id: "unit-emb", abbreviation: "Emb", name: "Embalagem" },
  { id: "unit-un", abbreviation: "Un", name: "Unidade" },
  { id: "unit-kg", abbreviation: "Kg", name: "Quilo" },
  { id: "unit-g", abbreviation: "g", name: "Grama" },
  { id: "unit-l", abbreviation: "L", name: "Litro" },
];

const mockAddItemAction = jest.fn();
const mockCreateCategoryAction = jest.fn();

describe("AddItemForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(
      <AddItemForm
        listId="list-1"
        categories={mockCategories}
        units={mockUnits}
        addItemAction={mockAddItemAction}
        createCategoryAction={mockCreateCategoryAction}
      />
    );

    // Name input
    expect(screen.getByPlaceholderText("Item name...")).toBeInTheDocument();
    // Quantity input (default value 1)
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    // Unit dropdown and Category dropdown
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    // Submit button
    expect(
      screen.getByRole("button", { name: "Add item" })
    ).toBeInTheDocument();
  });

  it("renders category options in the dropdown", () => {
    render(
      <AddItemForm
        listId="list-1"
        categories={mockCategories}
        units={mockUnits}
        addItemAction={mockAddItemAction}
        createCategoryAction={mockCreateCategoryAction}
      />
    );

    // There are 2 dropdowns: unit and category
    const selects = screen.getAllByRole("combobox");
    const categorySelect = selects[1];
    const options = categorySelect.querySelectorAll("option");

    // "No category" + 3 categories = 4 options
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("No category");
    expect(options[1]).toHaveTextContent("Bebidas");
    expect(options[2]).toHaveTextContent("Frutas");
    expect(options[3]).toHaveTextContent("My Custom");
  });

  it("shows + New category button", () => {
    render(
      <AddItemForm
        listId="list-1"
        categories={mockCategories}
        units={mockUnits}
        addItemAction={mockAddItemAction}
        createCategoryAction={mockCreateCategoryAction}
      />
    );

    expect(
      screen.getByRole("button", { name: "+ New category" })
    ).toBeInTheDocument();
  });

  it("shows CreateCategoryForm when + New category is clicked", () => {
    render(
      <AddItemForm
        listId="list-1"
        categories={mockCategories}
        units={mockUnits}
        addItemAction={mockAddItemAction}
        createCategoryAction={mockCreateCategoryAction}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "+ New category" })
    );

    // The CreateCategoryForm should now be visible
    expect(
      screen.getByPlaceholderText("Category name...")
    ).toBeInTheDocument();
    // The + New category button should be hidden
    expect(
      screen.queryByRole("button", { name: "+ New category" })
    ).not.toBeInTheDocument();
  });

  it("has a required name input", () => {
    render(
      <AddItemForm
        listId="list-1"
        categories={mockCategories}
        units={mockUnits}
        addItemAction={mockAddItemAction}
        createCategoryAction={mockCreateCategoryAction}
      />
    );

    const nameInput = screen.getByPlaceholderText("Item name...");
    expect(nameInput).toBeRequired();
  });

  it("does not render the mic button when speech is not supported", () => {
    mockVoiceSupported = false;
    render(
      <AddItemForm
        listId="list-1"
        categories={mockCategories}
        units={mockUnits}
        addItemAction={mockAddItemAction}
        createCategoryAction={mockCreateCategoryAction}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Voice input" })
    ).not.toBeInTheDocument();
  });

  it("renders the mic button when speech is supported", () => {
    mockVoiceSupported = true;
    render(
      <AddItemForm
        listId="list-1"
        categories={mockCategories}
        units={mockUnits}
        addItemAction={mockAddItemAction}
        createCategoryAction={mockCreateCategoryAction}
      />
    );

    expect(
      screen.getByRole("button", { name: "Voice input" })
    ).toBeInTheDocument();
  });
});
