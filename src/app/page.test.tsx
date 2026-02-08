import { render, screen } from "@testing-library/react";
import Home from "./page";

// Mock next/image since Jest doesn't handle it natively.
// This replaces <Image> with a plain <img> tag in tests.
jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ priority, ...props }: Record<string, unknown>) => <img {...props} />,
}));

describe("Home page", () => {
  it("renders the heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1 })
    ).toBeInTheDocument();
  });

  it("renders the Deploy Now link", () => {
    render(<Home />);

    expect(screen.getByText("Deploy Now")).toBeInTheDocument();
  });

  it("renders the Documentation link", () => {
    render(<Home />);

    expect(screen.getByText("Documentation")).toBeInTheDocument();
  });
});
