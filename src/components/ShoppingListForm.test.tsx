import { render, screen } from "@testing-library/react";
import { ShoppingListForm } from "./ShoppingListForm";

// Mock useActionState from React.
// It returns [state, formAction] — we control the state and capture the action.
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

describe("ShoppingListForm", () => {
  const mockCreateAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the input and submit button", () => {
    render(<ShoppingListForm createAction={mockCreateAction} />);

    expect(
      screen.getByPlaceholderText("New list name...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("has a required input field", () => {
    render(<ShoppingListForm createAction={mockCreateAction} />);

    const input = screen.getByPlaceholderText("New list name...");
    expect(input).toBeRequired();
  });
});
