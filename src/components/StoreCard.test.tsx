import { render, screen, fireEvent } from "@testing-library/react";
import { StoreCard } from "./StoreCard";
import type { Store } from "@/lib/types";

// Mock useActionState — returns [state, formAction]
// StoreCard calls useActionState twice: first for update, then for delete
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

const mockStore: Store = {
  id: "store-1",
  user_id: "user-1",
  name: "Lidl",
};

const mockUpdateAction = jest.fn();
const mockDeleteAction = jest.fn();

describe("StoreCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActionStateCallCount = 0;
  });

  it("renders the store name in view mode", () => {
    render(
      <StoreCard
        store={mockStore}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(screen.getByText("Lidl")).toBeInTheDocument();
  });

  it("renders edit and delete buttons", () => {
    render(
      <StoreCard
        store={mockStore}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    expect(
      screen.getByRole("button", { name: "Edit Lidl" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();
  });

  it("switches to edit mode when edit button is clicked", () => {
    render(
      <StoreCard
        store={mockStore}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Lidl" }));

    expect(screen.getByDisplayValue("Lidl")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();
  });

  it("exits edit mode when cancel is clicked", () => {
    render(
      <StoreCard
        store={mockStore}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Lidl" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Lidl")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Lidl" })
    ).toBeInTheDocument();
  });

  it("shows confirm dialog when delete is clicked", () => {
    render(
      <StoreCard
        store={mockStore}
        updateAction={mockUpdateAction}
        deleteAction={mockDeleteAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    // The custom confirm dialog should appear with the correct message
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByText(
        'Delete "Lidl"? All prices at this store will also be deleted.'
      )
    ).toBeInTheDocument();
  });
});
