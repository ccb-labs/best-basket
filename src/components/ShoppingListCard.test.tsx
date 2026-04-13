import { render, screen, fireEvent } from "@testing-library/react";
import { ShoppingListCard } from "./ShoppingListCard";
import type { ShoppingList } from "@/lib/types";

// Mock useActionState — returns [state, formAction]
const mockUpdateFormAction = jest.fn();
const mockDeleteFormAction = jest.fn();
let useActionStateCallCount = 0;

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useActionState: () => {
    // First call is for updateAction, second is for deleteAction
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

const mockList: ShoppingList = {
  id: "abc-123",
  user_id: "user-1",
  name: "Weekly Groceries",
  created_at: "2026-03-28T10:00:00Z",
  is_template: false,
  recurrence: null,
  last_used_at: null,
  source_template_id: null,
};

const mockUpdateAction = jest.fn();
const mockDeleteAction = jest.fn();

describe("ShoppingListCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActionStateCallCount = 0;
  });

  it("renders the list name and date in view mode", () => {
    render(
      <ShoppingListCard
        list={mockList}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(screen.getByText("Weekly Groceries")).toBeInTheDocument();
    expect(screen.getByText("28 Mar 2026")).toBeInTheDocument();
  });

  it("renders edit and delete buttons", () => {
    render(
      <ShoppingListCard
        list={mockList}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(
      screen.getByRole("button", { name: "Edit Weekly Groceries" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();
  });

  it("links to the list detail page", () => {
    render(
      <ShoppingListCard
        list={mockList}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    const link = screen.getByRole("link", { name: "Weekly Groceries" });
    expect(link).toHaveAttribute("href", "/lists/abc-123");
  });

  it("switches to edit mode when edit button is clicked", () => {
    render(
      <ShoppingListCard
        list={mockList}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Edit Weekly Groceries" })
    );

    // Should now show an input with the list name
    const input = screen.getByDisplayValue("Weekly Groceries");
    expect(input).toBeInTheDocument();

    // Should show Save and Cancel buttons
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();
  });

  it("exits edit mode when cancel is clicked", () => {
    render(
      <ShoppingListCard
        list={mockList}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    // Enter edit mode
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Weekly Groceries" })
    );

    // Click cancel
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Should be back in view mode
    expect(screen.getByText("Weekly Groceries")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Weekly Groceries" })
    ).toBeInTheDocument();
  });

  it("shows confirm dialog when delete is clicked", () => {
    render(
      <ShoppingListCard
        list={mockList}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    // The custom confirm dialog should appear with the correct message
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByText('Delete "Weekly Groceries"? This cannot be undone.')
    ).toBeInTheDocument();
  });
});
