import { render, screen } from "@testing-library/react";
import { EmptyItemState } from "./EmptyItemState";

describe("EmptyItemState", () => {
  it("renders the empty state message", () => {
    render(<EmptyItemState />);

    expect(screen.getByText("No items yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first item above to get started!")
    ).toBeInTheDocument();
  });
});
