/**
 * Products management E2E tests — tests viewing, renaming, merging,
 * and deleting products.
 *
 * Products are created automatically when adding items to lists,
 * so the setup creates a list with items to generate test products.
 *
 * The tests run SERIALLY:
 *   1. Create prerequisite items (generates products)
 *   2. Navigate to products page and verify products exist
 *   3. Rename a product
 *   4. Merge two products
 *   5. Delete a product
 *   6. Clean up
 */
import { test, expect } from "@playwright/test";

test.describe.serial("Products management", () => {
  const timestamp = Date.now();
  const listName = `Products Test ${timestamp}`;
  // Two items with similar names to test merge
  const item1 = `Caju ${timestamp}`;
  const item2 = `Castanha ${timestamp}`;
  const item3 = `Tofu ${timestamp}`;
  const renamedItem = `Castanha de Caju ${timestamp}`;

  test("creates a list with items to generate products", async ({ page }) => {
    await page.goto("/");

    // Create a test list
    await page.getByPlaceholder("New list name...").fill(listName);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(listName)).toBeVisible();

    // Navigate to the list and add items
    await page.getByRole("link", { name: listName }).click();

    // Add first item
    await page.getByPlaceholder("Item name...").fill(item1);
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText(item1)).toBeVisible();

    // Add second item
    await page.getByPlaceholder("Item name...").fill(item2);
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText(item2)).toBeVisible();

    // Add third item
    await page.getByPlaceholder("Item name...").fill(item3);
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText(item3)).toBeVisible();
  });

  test("shows products on the products page", async ({ page }) => {
    await page.goto("/products");

    await expect(page.getByText(item1)).toBeVisible();
    await expect(page.getByText(item2)).toBeVisible();
    await expect(page.getByText(item3)).toBeVisible();
  });

  test("renames a product", async ({ page }) => {
    await page.goto("/products");

    // Click Edit on item1 (Caju)
    await page.getByRole("button", { name: `Edit ${item1}` }).click();

    const editForm = page.locator("form").filter({ hasText: "Save" });
    const editInput = editForm.getByRole("textbox");
    await editInput.clear();
    await editInput.fill(renamedItem);

    await Promise.all([
      page.waitForResponse(
        (resp) => resp.request().method() === "POST" && resp.ok()
      ),
      editForm.getByRole("button", { name: "Save" }).click(),
    ]);

    await page.goto("/products");

    // The renamed product should appear
    await expect(page.getByText(renamedItem)).toBeVisible();
    // The old name should be gone (exact match to avoid matching substring)
    await expect(page.getByText(item1, { exact: true })).not.toBeVisible();
  });

  test("merges two products", async ({ page }) => {
    await page.goto("/products");

    // Merge item2 (Castanha) into renamedItem (Castanha de Caju)
    const productCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: item2 });
    await productCard.getByRole("button", { name: "Merge" }).click();

    // Select the target product from the dropdown
    await page.locator('select[name="target_id"]').selectOption({
      label: renamedItem,
    });

    // Click the Merge button inside the merge form (the one with the dropdown)
    const mergeForm = page.locator("form").filter({
      has: page.locator('select[name="target_id"]'),
    });

    await Promise.all([
      page.waitForResponse(
        (resp) => resp.request().method() === "POST" && resp.ok()
      ),
      mergeForm.getByRole("button", { name: "Merge" }).click(),
    ]);

    await page.goto("/products");

    // The source product (Castanha) should be gone
    await expect(page.getByText(item2)).not.toBeVisible();
    // The target product should still exist
    await expect(page.getByText(renamedItem)).toBeVisible();
  });

  test("deletes a product", async ({ page }) => {
    await page.goto("/products");

    const productCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: item3 });
    await productCard.getByRole("button", { name: "Delete" }).click();
    // Confirm the deletion in the custom confirm dialog
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(item3)).not.toBeVisible();
    // The other product should still be there
    await expect(page.getByText(renamedItem)).toBeVisible();
  });

  test("cleans up test data", async ({ page }) => {
    // Delete the test list
    await page.goto("/");

    const listCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: listName });
    await listCard.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(listName)).not.toBeVisible();

    // Delete remaining test products
    await page.goto("/products");

    const productCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: renamedItem });
    if (await productCard.isVisible().catch(() => false)) {
      await productCard.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    }
  });
});
