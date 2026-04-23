/**
 * Categories E2E tests.
 *
 * Regression test for the "missing default categories" bug: every
 * user should see the 11 default categories on /categories after
 * the protected layout bootstraps them into their account.
 *
 * The protected layout calls bootstrap_user_categories() on every
 * page load (idempotent), so any logged-in user — including the
 * test user from auth.setup.ts — has their defaults by the time
 * this page renders.
 */
import { test, expect } from "@playwright/test";

test.describe("Categories page", () => {
  test("shows default categories after bootstrap", async ({ page }) => {
    await page.goto("/categories");

    // Spot-check a few defaults from supabase/seed.sql.
    // We check several rather than all 11 to keep the test concise —
    // if bootstrap ran, they all got copied together.
    await expect(page.getByText("Bebidas", { exact: true })).toBeVisible();
    await expect(page.getByText("Frutas", { exact: true })).toBeVisible();
    await expect(page.getByText("Cereais", { exact: true })).toBeVisible();
    await expect(page.getByText("Limpeza", { exact: true })).toBeVisible();
  });
});
