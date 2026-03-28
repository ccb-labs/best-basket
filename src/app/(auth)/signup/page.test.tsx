import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignupPage } from "./page";

const mockSignUp = jest.fn();
const mockSignInWithOAuth = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

// Mock Next.js Link component — it renders as a plain <a> tag in tests
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

describe("SignupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the signup form with email and password fields", () => {
    render(<SignupPage />);

    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("At least 6 characters")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign up" })
    ).toBeInTheDocument();
  });

  it("has a link to the login page", () => {
    render(<SignupPage />);

    const loginLink = screen.getByRole("link", { name: "Sign in" });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("renders a Google sign-up button", () => {
    render(<SignupPage />);

    expect(
      screen.getByRole("button", { name: "Sign up with Google" })
    ).toBeInTheDocument();
  });

  it("calls signInWithOAuth when Google button is clicked", () => {
    render(<SignupPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Sign up with Google" })
    );

    // OAuth uses the same signInWithOAuth for both login and signup —
    // Supabase auto-creates the account if it doesn't exist
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
      },
    });
  });

  it("shows a success message after signing up", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "1", email: "new@example.com" } },
      error: null,
    });

    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
      expect(screen.getByText("new@example.com")).toBeInTheDocument();
    });
  });

  it("shows an error message when signup fails", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });

    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByText("User already registered")).toBeInTheDocument();
    });
  });
});
