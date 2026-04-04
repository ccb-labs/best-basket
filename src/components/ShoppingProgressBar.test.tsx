import { render, screen } from "@testing-library/react";
import { ShoppingProgressBar } from "./ShoppingProgressBar";

describe("ShoppingProgressBar", () => {
  it("renders the item count", () => {
    render(<ShoppingProgressBar checkedCount={3} totalCount={8} />);
    expect(screen.getByText("3 of 8 items")).toBeInTheDocument();
  });

  it("shows 'All done!' when all items are checked", () => {
    render(<ShoppingProgressBar checkedCount={5} totalCount={5} />);
    expect(screen.getByText("All done!")).toBeInTheDocument();
  });

  it("renders progress bar with correct width", () => {
    const { container } = render(
      <ShoppingProgressBar checkedCount={2} totalCount={4} />
    );

    // The inner bar should have 50% width
    const innerBar = container.querySelector("[style]");
    expect(innerBar).toHaveStyle({ width: "50%" });
  });

  it("renders 0% width when no items are checked", () => {
    const { container } = render(
      <ShoppingProgressBar checkedCount={0} totalCount={3} />
    );

    const innerBar = container.querySelector("[style]");
    expect(innerBar).toHaveStyle({ width: "0%" });
  });

  it("handles empty list (0 total items)", () => {
    render(<ShoppingProgressBar checkedCount={0} totalCount={0} />);
    expect(screen.getByText("0 of 0 items")).toBeInTheDocument();
  });
});
