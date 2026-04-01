import { render, screen, fireEvent } from "@testing-library/react";
import { CreateCategoryForm } from "./CreateCategoryForm";

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

const mockCreateCategoryAction = jest.fn();
const mockOnCancel = jest.fn();

describe("CreateCategoryForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the category name input and buttons", () => {
    render(
      <CreateCategoryForm
        listId="list-1"
        createCategoryAction={mockCreateCategoryAction}
        onCancel={mockOnCancel}
      />
    );

    expect(
      screen.getByPlaceholderText("Category name...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    render(
      <CreateCategoryForm
        listId="list-1"
        createCategoryAction={mockCreateCategoryAction}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("has a required name input", () => {
    render(
      <CreateCategoryForm
        listId="list-1"
        createCategoryAction={mockCreateCategoryAction}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByPlaceholderText("Category name...");
    expect(input).toBeRequired();
  });
});
