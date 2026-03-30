import { render, screen } from "@testing-library/react";
import { SubmitButton } from "./SubmitButton";

// Mock useFormStatus from react-dom
// By default, pending is false (form is not submitting)
const mockUseFormStatus = jest.fn();

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => mockUseFormStatus(),
}));

describe("SubmitButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: not submitting
    mockUseFormStatus.mockReturnValue({ pending: false });
  });

  it("renders the label when not pending", () => {
    render(<SubmitButton label="Add" pendingLabel="Adding..." />);

    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("renders the pending label and is disabled when submitting", () => {
    mockUseFormStatus.mockReturnValue({ pending: true });

    render(<SubmitButton label="Add" pendingLabel="Adding..." />);

    expect(
      screen.getByRole("button", { name: "Adding..." })
    ).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies custom className when provided", () => {
    render(
      <SubmitButton
        label="Save"
        pendingLabel="Saving..."
        className="custom-class"
      />
    );

    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });
});
