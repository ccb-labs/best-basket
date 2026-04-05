/**
 * List items CRUD E2E tests — tests adding, reading, editing,
 * deleting, and categorizing items within a shopping list.
 *
 * These tests use the saved storageState from auth.setup.ts, so the
 * browser starts already logged in.
 *
 * The tests run SERIALLY because they form a natural sequence:
 *   1. Create a list (prerequisite)
 *   2. See empty state on the detail page
 *   3. Add items
 *   4. Edit an item
 *   5. Cancel an edit
 *   6. Delete an item
 *   7. Create a custom category and use it
 *   8. Clean up (delete the list)
 */
import { test, expect } from "@playwright/test";

test.describe.serial("List items CRUD", () => {
  // A unique list name to avoid conflicts with other test runs
  const listName = `Items Test ${Date.now()}`;

  test("creates a shopping list for testing items", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("New list name...").fill(listName);
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText(listName)).toBeVisible();
  });

  test("shows empty state on the list detail page", async ({ page }) => {
    await page.goto("/");

    // Click the list name to navigate to the detail page
    await page.getByRole("link", { name: listName }).click();
    await expect(page).toHaveURL(/\/lists\/[a-f0-9-]+/);

    // Should show the list name and the empty state
    await expect(
      page.getByRole("heading", { name: listName })
    ).toBeVisible();
    await expect(page.getByText("No items yet")).toBeVisible();
    await expect(
      page.getByText("Add your first item above to get started!")
    ).toBeVisible();
  });

  test("adds an item with just a name", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Fill in just the item name and submit
    await page.getByPlaceholder("Item name...").fill("Bread");
    await page.getByRole("button", { name: "Add item" }).click();

    // The item should appear and the empty state should be gone
    await expect(page.getByText("Bread")).toBeVisible();
    await expect(page.getByText("No items yet")).not.toBeVisible();
  });

  test("adds an item with name, quantity, unit, and category", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Fill in all fields
    await page.getByPlaceholder("Item name...").fill("Milk");

    // Clear the default quantity and type a new one
    const quantityInput = page.locator('input[name="quantity"]').first();
    await quantityInput.clear();
    await quantityInput.fill("2");

    await page.locator('select[name="unit_id"]').first().selectOption({ label: "L" });

    // Select a category from the dropdown
    await page.locator('select[name="category_id"]').first().selectOption({
      label: "Beverages",
    });

    await page.getByRole("button", { name: "Add item" }).click();

    // The item should appear with its details
    await expect(page.getByText("Milk")).toBeVisible();
    await expect(page.getByText("2 L")).toBeVisible();
    // Check the category badge (span element) specifically to avoid
    // matching the dropdown option or category heading
    await expect(
      page.locator("span").filter({ hasText: "Beverages" })
    ).toBeVisible();
  });

  test("shows items grouped by category", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // "Beverages" heading should be visible (from the Milk item)
    await expect(
      page.locator("p").filter({ hasText: "BEVERAGES" })
    ).toBeVisible();

    // "Uncategorized" heading should be visible (from the Bread item)
    await expect(
      page.locator("p").filter({ hasText: "UNCATEGORIZED" })
    ).toBeVisible();
  });

  test("edits an item", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Click Edit on the Bread item
    await page.getByRole("button", { name: "Edit Bread" }).click();

    // The edit form should be visible — find the name input inside the
    // card that has Save/Cancel buttons (the edit form)
    const editCard = page.locator('[class*="border-zinc-200"]').filter({
      has: page.getByRole("button", { name: "Save" }),
    });
    const editInput = editCard.locator('input[name="name"]');
    await expect(editInput).toBeVisible();

    // Change the name and add a category
    await editInput.clear();
    await editInput.fill("Whole Wheat Bread");

    // Select Grains category in the edit form
    await editCard.locator('select[name="category_id"]').selectOption({
      label: "Grains",
    });

    // Save the changes and wait for the server to respond
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.request().method() === "POST" && resp.ok()
      ),
      editCard.getByRole("button", { name: "Save" }).click(),
    ]);

    // Reload to confirm the save persisted
    await page.reload();

    // The updated name should appear
    await expect(page.getByText("Whole Wheat Bread")).toBeVisible();
    // Grains category badge should be visible on the item
    await expect(
      page.locator("span").filter({ hasText: "Grains" })
    ).toBeVisible();
    // Old name should be gone (use exact match to avoid matching "Whole Wheat Bread")
    await expect(page.getByText("Bread", { exact: true })).not.toBeVisible();
  });

  test("cancels editing without saving", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Click Edit on Milk
    await page.getByRole("button", { name: "Edit Milk" }).click();

    // Change the name but then cancel
    const editCard = page.locator('[class*="border-zinc-200"]').filter({
      has: page.getByRole("button", { name: "Save" }),
    });
    const editInput = editCard.locator('input[name="name"]');
    await editInput.clear();
    await editInput.fill("Should Not Save");
    await page.getByRole("button", { name: "Cancel" }).click();

    // The original name should still be there
    await expect(page.getByText("Milk")).toBeVisible();
    await expect(page.getByText("Should Not Save")).not.toBeVisible();
  });

  test("deletes an item", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Find the card with "Whole Wheat Bread" and delete it
    const itemCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: "Whole Wheat Bread" });
    await itemCard.getByRole("button", { name: "Delete" }).click();
    // Confirm the deletion in the custom confirm dialog
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    // Whole Wheat Bread should be gone, Milk should remain
    await expect(page.getByText("Whole Wheat Bread")).not.toBeVisible();
    await expect(page.getByText("Milk")).toBeVisible();
  });

  test("creates a custom category and uses it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Click "+ New category" to show the creation form
    await page.getByRole("button", { name: "+ New category" }).click();

    // Fill in the new category name
    await page.getByPlaceholder("Category name...").fill("Dairy");
    await page
      .locator("form")
      .filter({ hasText: "Cancel" })
      .getByRole("button", { name: "Add" })
      .click();

    // Wait for the category to be created (form should close)
    await expect(
      page.getByPlaceholder("Category name...")
    ).not.toBeVisible();

    // Now add an item with the new custom category
    await page.getByPlaceholder("Item name...").fill("Cheese");
    await page.locator('select[name="category_id"]').first().selectOption({
      label: "Dairy",
    });
    await page.getByRole("button", { name: "Add item" }).click();

    // The item should appear with the custom category badge
    await expect(page.getByText("Cheese")).toBeVisible();
    await expect(
      page.locator("span").filter({ hasText: "Dairy" })
    ).toBeVisible();
  });

  test("cleans up by deleting the test list", async ({ page }) => {
    await page.goto("/");

    // Find the card with our test list and delete it
    const listCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: listName });
    await listCard.getByRole("button", { name: "Delete" }).click();
    // Confirm the deletion in the custom confirm dialog
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    // The list should be gone
    await expect(page.getByText(listName)).not.toBeVisible();
  });
});
