/**
 * Playwright configuration — controls how E2E tests run.
 *
 * Key concepts:
 * - "projects" let us run different groups of tests with different settings.
 *   We have a "setup" project that logs in once, and a "chromium" project
 *   that runs the actual tests using the saved login session.
 * - "webServer" automatically starts `npm run dev` before tests run,
 *   so you don't need to start the dev server manually.
 * - "storageState" saves cookies/localStorage after login so tests
 *   don't need to log in again — this makes tests faster and more reliable.
 */
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables from .env.local (Playwright doesn't do this
// automatically like Next.js does). We need E2E_TEST_EMAIL and
// E2E_TEST_PASSWORD for the auth setup.
dotenv.config({ path: ".env.local" });

export default defineConfig({
  // Where to find test files
  testDir: "e2e",

  // How long each test can run before timing out (30 seconds)
  timeout: 30_000,

  // Playwright retries and assertions config
  expect: {
    // How long to wait for expect() assertions to pass (5 seconds).
    // Playwright auto-retries assertions until they pass or this timeout hits.
    timeout: 5_000,
  },

  // Don't retry failed tests locally — we want to see real failures
  retries: 0,

  // Run tests one at a time (not in parallel) to avoid race conditions
  // with shared test data in the database. We also limit to 1 worker
  // because the auth tests log out (invalidating the session), which
  // would break shopping list tests if they ran simultaneously.
  fullyParallel: false,
  workers: 1,

  // Where to save test artifacts (screenshots, videos) on failure
  outputDir: "test-results",

  // Settings shared by all projects
  use: {
    // Base URL so we can write page.goto("/login") instead of the full URL
    baseURL: "http://localhost:3000",

    // Capture a screenshot when a test fails — helps debug what went wrong
    screenshot: "only-on-failure",
  },

  // Automatically start the Next.js dev server before running tests
  webServer: {
    command: "npm run dev",
    port: 3000,
    // If the dev server is already running, reuse it instead of starting a new one
    reuseExistingServer: true,
  },

  projects: [
    // ─── Setup Project ───
    // Runs first: logs in and saves the session to e2e/.auth/user.json.
    // This is NOT a regular test — it's a prerequisite for the other projects.
    {
      name: "setup",
      testMatch: "auth.setup.ts",
    },

    // ─── Authenticated Tests ───
    // Runs second. Uses the saved login session so tests start already
    // authenticated. Only uses Chromium to keep things simple.
    // These run BEFORE auth tests because auth tests call signOut(),
    // which invalidates the session on the Supabase server.
    {
      name: "authenticated",
      testMatch: ["shopping-lists.spec.ts", "list-items.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        // Load the saved login session — tests skip the login page
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    // ─── Auth Tests ───
    // Runs LAST because the logout test invalidates the Supabase session,
    // which would break any tests that rely on the saved storageState.
    // Uses empty storageState (unauthenticated browser).
    {
      name: "auth",
      testMatch: "auth.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["authenticated"],
    },
  ],
});
