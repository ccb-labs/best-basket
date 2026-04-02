import { render, screen } from "@testing-library/react";
import { StoreForm } from "./StoreForm";

// Mock useActionState from React
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

describe("StoreForm", () => {
  const mockCreateAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the input and submit button", () => {
    render(<StoreForm createAction={mockCreateAction} />);

    expect(screen.getByPlaceholderText("Store name...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("has a required input field", () => {
    render(<StoreForm createAction={mockCreateAction} />);

    const input = screen.getByPlaceholderText("Store name...");
    expect(input).toBeRequired();
  });
});
