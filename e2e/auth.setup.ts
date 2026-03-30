/**
 * Auth setup — runs ONCE before all other tests.
 *
 * This is a Playwright "setup" file (not a regular test). Its job is to:
 * 1. Log in with the test user credentials
 * 2. Save the browser session (cookies + localStorage) to a JSON file
 *
 * All other test files load that JSON file automatically, so they start
 * already logged in. This saves time (no login per test) and reduces flakiness.
 *
 * The test user must exist in your Supabase project. See the plan for
 * instructions on creating one.
 */
import { test as setup, expect } from "@playwright/test";

// Path where the login session will be saved
const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  // Read test credentials from environment variables (loaded by dotenv
  // in playwright.config.ts from .env.local)
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  // Fail fast with a helpful message if credentials are missing
  if (!email || !password) {
    throw new Error(
      "Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD in .env.local. " +
        "See the plan for instructions on creating a test user."
    );
  }

  // Go to the login page
  await page.goto("/login");

  // Fill in the login form
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  // Click the "Sign in" button
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Wait for the redirect to the home page — this confirms login worked.
  // The "My Shopping Lists" heading only appears on the protected home page.
  await expect(
    page.getByRole("heading", { name: "My Shopping Lists" })
  ).toBeVisible();

  // Save the browser session (cookies + localStorage) to a file.
  // Other test files will load this file to skip login.
  await page.context().storageState({ path: authFile });
});
