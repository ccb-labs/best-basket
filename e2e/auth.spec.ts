/**
 * Auth flow E2E tests — tests login, logout, and route protection.
 *
 * These tests use an EMPTY storageState (no saved session), so the browser
 * starts unauthenticated. This lets us test what happens when a user is
 * not logged in.
 */
import { test, expect } from "@playwright/test";

// Override the default storageState for this entire file.
// An empty cookies/origins array means "no saved session" — the browser
// starts as if the user has never logged in.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("redirects unauthenticated users to /login", async ({ page }) => {
    // Try to visit the protected home page without being logged in
    await page.goto("/");

    // The proxy (middleware) should redirect us to the login page
    await expect(page).toHaveURL(/\/login/);

    // Verify the login form is visible
    await expect(
      page.getByRole("heading", { name: "Sign in to Best Basket" })
    ).toBeVisible();
  });

  test("logs in with email and password", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL!;
    const password = process.env.E2E_TEST_PASSWORD!;

    await page.goto("/login");

    // Fill the login form
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // After successful login, we should be on the home page
    await expect(
      page.getByRole("heading", { name: "My Shopping Lists" })
    ).toBeVisible();

    // The header should show the user's email
    await expect(page.getByText(email)).toBeVisible();
  });

  test("logs out and redirects to /login", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL!;
    const password = process.env.E2E_TEST_PASSWORD!;

    // First, log in
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "My Shopping Lists" })
    ).toBeVisible();

    // Now click "Log out"
    await page.getByRole("button", { name: "Log out" }).click();

    // Should be redirected back to the login page
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Sign in to Best Basket" })
    ).toBeVisible();
  });

  test("signup page is accessible", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: "Create your account" })
    ).toBeVisible();
  });

  test("login page links to signup and vice versa", async ({ page }) => {
    // Check login → signup link
    await page.goto("/login");
    const signupLink = page.getByRole("link", { name: "Sign up" });
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute("href", "/signup");

    // Check signup → login link
    await page.goto("/signup");
    const loginLink = page.getByRole("link", { name: "Sign in" });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });
});
