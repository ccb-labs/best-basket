import { render, screen } from "@testing-library/react";
import { EmptyProductState } from "./EmptyProductState";

describe("EmptyProductState", () => {
  it("renders the empty state message", () => {
    render(<EmptyProductState />);

    expect(screen.getByText("No products yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Products are created automatically when you add items to your lists."
      )
    ).toBeInTheDocument();
  });
});
