/**
 * Item prices E2E tests — tests adding, editing, and deleting
 * prices for items at different stores.
 *
 * Prerequisites are created at the start and cleaned up at the end:
 * - Two stores ("Lidl" and "Continente")
 * - A shopping list with an item ("Milk")
 *
 * The tests run SERIALLY because they form a natural sequence:
 *   1. Create prerequisites (stores + list + item)
 *   2. See "No prices yet" on the item
 *   3. Add prices at different stores
 *   4. Verify cheapest price display
 *   5. Edit a price
 *   6. Delete a price
 *   7. Clean up
 */
import { test, expect } from "@playwright/test";

test.describe.serial("Item prices CRUD", () => {
  const timestamp = Date.now();
  const store1 = `Lidl ${timestamp}`;
  const store2 = `Continente ${timestamp}`;
  const listName = `Prices Test ${timestamp}`;

  test("creates stores for testing prices", async ({ page }) => {
    await page.goto("/stores");

    // Create first store
    await page.getByPlaceholder("Store name...").fill(store1);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(store1)).toBeVisible();

    // Create second store
    await page.getByPlaceholder("Store name...").fill(store2);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(store2)).toBeVisible();
  });

  test("creates a list and item for testing prices", async ({ page }) => {
    await page.goto("/");

    // Create a list
    await page.getByPlaceholder("New list name...").fill(listName);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(listName)).toBeVisible();

    // Navigate to the list and add an item
    await page.getByRole("link", { name: listName }).click();
    await page.getByPlaceholder("Item name...").fill("Milk");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("Milk")).toBeVisible();
  });

  test("shows 'No prices yet' on a new item", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    await expect(page.getByText("No prices yet")).toBeVisible();
  });

  test("adds a price at the first store", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Expand the prices section
    await page.getByText("No prices yet").click();

    // Select store and enter price
    await page.locator('select[name="store_id"]').selectOption({ label: store1 });
    await page.locator('input[name="price"]').fill("0.89");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // The price should appear and the summary should update
    await expect(page.getByText(`Best: €0.89 at ${store1}`)).toBeVisible();
  });

  test("adds a price at the second store", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Expand the prices section
    await page.getByText(`Best: €0.89 at ${store1}`).click();

    // Select second store and enter a higher price
    await page.locator('select[name="store_id"]').selectOption({ label: store2 });
    await page.locator('input[name="price"]').fill("1.05");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // The summary should still show the cheaper store
    await expect(page.getByText(`Best: €0.89 at ${store1}`)).toBeVisible();

    // Both prices should exist — we verify by checking for their edit buttons
    await expect(
      page.getByRole("button", { name: `Edit price at ${store1}` })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Edit price at ${store2}` })
    ).toBeVisible();
  });

  test("edits a price", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Expand the prices section
    await page.getByText(`Best: €0.89 at ${store1}`).click();

    // Click edit on the first store's price
    await page
      .getByRole("button", { name: `Edit price at ${store1}` })
      .click();

    // Change the price to be more expensive than store2
    const priceInput = page.locator('input[name="price"]').first();
    await priceInput.clear();
    await priceInput.fill("1.25");

    // Submit by pressing Enter in the price input (more reliable than
    // clicking Save, which can be obscured by other elements)
    await priceInput.press("Enter");

    // Wait for the edit form to close (price input disappears after success).
    // We check for the price input, not the Save button, because "Save as
    // Template" also matches getByRole("button", { name: "Save" }).
    await expect(page.locator('input[name="price"]')).not.toBeVisible({
      timeout: 10_000,
    });

    // Reload to confirm the change persisted
    await page.reload();

    // Now the cheapest should be Continente
    await expect(page.getByText(`Best: €1.05 at ${store2}`)).toBeVisible();
  });

  test("deletes a price", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: listName }).click();

    // Expand the prices section
    await page.getByText(`Best: €1.05 at ${store2}`).click();

    // Delete the Continente price — find the edit button for that specific
    // price, go up to its parent container, and click the Delete button
    // next to it. This avoids accidentally hitting the item's Delete button.
    const editPriceButton = page.getByRole("button", {
      name: `Edit price at ${store2}`,
    });
    const priceActionRow = editPriceButton.locator("..");

    // Click Delete to open the confirm dialog, then confirm
    await priceActionRow.getByRole("button", { name: "Delete" }).click();
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.request().method() === "POST" && resp.ok()
      ),
      page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click(),
    ]);

    // Reload to confirm the deletion persisted
    await page.reload();

    // After deletion, the summary should show the remaining store
    await expect(page.getByText(`Best: €1.25 at ${store1}`)).toBeVisible();
  });

  test("cleans up test data", async ({ page }) => {
    // Delete the test list (cascades to items and prices)
    await page.goto("/");

    const listCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: listName });
    await listCard.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(listName)).not.toBeVisible();

    // Delete the test stores
    await page.goto("/stores");

    // Delete first store
    const store1Card = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: store1 });
    if (await store1Card.isVisible().catch(() => false)) {
      await store1Card.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    }

    // Delete second store
    const store2Card = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: store2 });
    if (await store2Card.isVisible().catch(() => false)) {
      await store2Card.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    }
  });
});
