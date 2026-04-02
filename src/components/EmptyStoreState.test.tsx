import { render, screen } from "@testing-library/react";
import { EmptyStoreState } from "./EmptyStoreState";

describe("EmptyStoreState", () => {
  it("renders the empty state message", () => {
    render(<EmptyStoreState />);

    expect(screen.getByText("No stores yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first store above to start tracking prices!")
    ).toBeInTheDocument();
  });
});
