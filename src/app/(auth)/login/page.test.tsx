import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginPage } from "./page";

// Mock the Supabase browser client
// We replace the real createClient with a fake one that returns mock functions
const mockSignInWithPassword = jest.fn();
const mockSignInWithOAuth = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

// Mock Next.js navigation (useRouter)
// In tests we can't actually navigate, so we use a fake router
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe("LoginPage", () => {
  // Reset mocks before each test so they don't interfere with each other
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the login form with email and password fields", () => {
    render(<LoginPage />);

    expect(screen.getByText("Sign in to Best Basket")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("has a link to the signup page", () => {
    render(<LoginPage />);

    const signupLink = screen.getByRole("link", { name: "Sign up" });
    expect(signupLink).toHaveAttribute("href", "/signup");
  });

  it("shows an error message when login fails", async () => {
    // Make the mock return an error
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    render(<LoginPage />);

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your password"), {
      target: { value: "wrongpassword" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });
  });

  it("renders a Google sign-in button", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("button", { name: "Sign in with Google" })
    ).toBeInTheDocument();
  });

  it("calls signInWithOAuth when Google button is clicked", () => {
    render(<LoginPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Sign in with Google" })
    );

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
      },
    });
  });

  it("redirects to home page on successful login", async () => {
    // Make the mock return success (no error)
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "1", email: "test@example.com" } },
      error: null,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your password"), {
      target: { value: "correctpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });
});
