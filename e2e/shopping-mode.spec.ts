/**
 * Shopping mode E2E tests — tests the check-off flow while shopping.
 *
 * These tests use the saved storageState from auth.setup.ts, so the
 * browser starts already logged in.
 *
 * The tests run SERIALLY because they form a natural sequence:
 *   1. Create a list with items (prerequisite)
 *   2. Navigate to shopping mode
 *   3. Check off items and verify visual state
 *   4. Verify checked state persists on reload
 *   5. Test "Uncheck all" reset
 *   6. Clean up (delete the list)
 */
import { test, expect } from "@playwright/test";

test.describe.serial("Shopping mode", () => {
  const listName = `Shopping Mode Test ${Date.now()}`;

  test("creates a list with items for testing", async ({ page }) => {
    await page.goto("/");

    // Create a list
    await page.getByPlaceholder("New list name...").fill(listName);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(listName)).toBeVisible();

    // Navigate to the list detail page
    await page.getByRole("link", { name: listName }).click();
    await expect(page).toHaveURL(/\/lists\/[a-f0-9-]+/);

    // Add 3 items
    await page.getByPlaceholder("Item name...").fill("Milk");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("Milk")).toBeVisible();

    await page.getByPlaceholder("Item name...").fill("Bread");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("Bread")).toBeVisible();

    await page.getByPlaceholder("Item name...").fill("Apples");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("Apples")).toBeVisible();
  });

  test("navigates to shopping mode from list detail", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Click "Start Shopping" button
    await page.getByRole("link", { name: "Start Shopping" }).click();
    await expect(page).toHaveURL(/\/lists\/[a-f0-9-]+\/shop/);

    // Should show the list name and progress
    await expect(
      page.getByRole("heading", { name: listName })
    ).toBeVisible();
    await expect(page.getByText("0 of 3 items")).toBeVisible();
  });

  test("checks off an item and updates progress", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();
    await page.getByRole("link", { name: "Start Shopping" }).click();

    // Check off "Milk"
    await page.getByRole("button", { name: "Check Milk" }).click();

    // Progress should update
    await expect(page.getByText("1 of 3 items")).toBeVisible();

    // The Done section should appear
    await expect(page.getByText("Done (1)")).toBeVisible();
  });

  test("checked state persists on reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();
    await page.getByRole("link", { name: "Start Shopping" }).click();

    // Milk should still be checked from the previous test
    await expect(page.getByText("1 of 3 items")).toBeVisible();
    await expect(page.getByText("Done (1)")).toBeVisible();

    // The "Uncheck Milk" button should exist (it's in checked state)
    await expect(
      page.getByRole("button", { name: "Uncheck Milk" })
    ).toBeVisible();
  });

  test("checks all items and shows all done", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();
    await page.getByRole("link", { name: "Start Shopping" }).click();

    // Milk is already checked, check the other two
    await page.getByRole("button", { name: "Check Bread" }).click();
    await page.getByRole("button", { name: "Check Apples" }).click();

    // Should show "All done!"
    await expect(page.getByText("All done!")).toBeVisible();
    await expect(page.getByText("Done (3)")).toBeVisible();
  });

  test("unchecks all items to reset progress", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();
    await page.getByRole("link", { name: "Start Shopping" }).click();

    // Accept the confirmation dialog
    page.on("dialog", (dialog) => dialog.accept());

    // Click "Uncheck all"
    await page.getByRole("button", { name: "Uncheck all" }).click();

    // Progress should reset
    await expect(page.getByText("0 of 3 items")).toBeVisible();

    // "Uncheck all" button should disappear (no checked items)
    await expect(
      page.getByRole("button", { name: "Uncheck all" })
    ).not.toBeVisible();
  });

  test("cleans up by deleting the test list", async ({ page }) => {
    await page.goto("/");

    // Accept the confirmation dialog for delete
    page.on("dialog", (dialog) => dialog.accept());

    // Find the list card and click Edit, then Delete
    const listCard = page.locator("div").filter({ hasText: listName }).first();
    await listCard.getByRole("button", { name: "Edit" }).click();
    await listCard.getByRole("button", { name: "Delete" }).click();

    // List should be gone
    await expect(page.getByText(listName)).not.toBeVisible();
  });
});
