import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogoutButton } from "./LogoutButton";

const mockSignOut = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({});
  });

  it("renders a logout button", () => {
    render(<LogoutButton />);

    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("calls signOut and redirects to login when clicked", async () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
