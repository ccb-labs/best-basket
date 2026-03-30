import { render, screen } from "@testing-library/react";
import { EmptyListState } from "./EmptyListState";

describe("EmptyListState", () => {
  it("renders the empty state message", () => {
    render(<EmptyListState />);

    expect(screen.getByText("No shopping lists yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first list above to get started!")
    ).toBeInTheDocument();
  });
});
