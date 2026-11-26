/**
 * Template E2E tests — editing an item in a template offers to apply the
 * same change to the existing shopping lists that contain that item.
 *
 * The tests run SERIALLY because they form a natural sequence:
 *   1. Create a template with one item
 *   2. Create a shopping list from it ("Use Template")
 *   3. Edit the quantity in the template → dialog → Update
 *   4. Edit the category in the template → dialog → Update
 *   5. Edit again and Skip → the list stays as it was
 */
import { test, expect, type Page } from "@playwright/test";

test.describe.serial("Template item edits", () => {
  const stamp = Date.now();
  const templateName = `Template Test ${stamp}`;
  // A unique item name: if "Leite" was used before, the app would auto-fill
  // its old category, and the category test below would change nothing.
  const itemName = `Leite ${stamp}`;
  let templateUrl = "";
  let listUrl = "";

  /** Open the edit form for the test item and return its form */
  async function openEdit(page: Page) {
    await page.getByRole("button", { name: `Edit ${itemName}` }).click();
    return page.locator("form").filter({
      has: page.getByRole("button", { name: "Save" }),
    });
  }

  test("creates a template with an item", async ({ page }) => {
    await page.goto("/templates");
    await page.getByPlaceholder("New template name...").fill(templateName);
    await page.getByRole("button", { name: "Add" }).click();

    await page.getByRole("link", { name: templateName }).click();
    await expect(page).toHaveURL(/\/lists\/[a-f0-9-]+/);
    templateUrl = page.url();

    await page.getByPlaceholder("Item name...").fill(itemName);
    await page.getByRole("button", { name: "Add item" }).click();

    // If the user already has lists, the "Also add to these lists?" dialog
    // appears — skip it, we only want the item in the template.
    const addDialog = page.getByRole("dialog", { name: "Add item in lists" });
    if (await addDialog.isVisible().catch(() => false)) {
      await addDialog.getByRole("button", { name: "Skip" }).click();
    }

    await expect(page.getByRole("button", { name: `Edit ${itemName}` })).toBeVisible();
  });

  test("creates a shopping list from the template", async ({ page }) => {
    await page.goto(templateUrl);
    await page.getByRole("button", { name: "Use Template" }).click();

    // createListFromTemplate redirects to the new list's page
    await expect(page).not.toHaveURL(templateUrl);
    await expect(page.getByRole("button", { name: `Edit ${itemName}` })).toBeVisible();
    listUrl = page.url();
  });

  test("updating the quantity offers to update the list", async ({ page }) => {
    await page.goto(templateUrl);
    const form = await openEdit(page);
    await form.locator('input[name="quantity"]').fill("3");
    await form.getByRole("button", { name: "Save" }).click();

    const dialog = page.getByRole("dialog", { name: "Update item in lists" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`Also update ${itemName} in these lists?`);
    await dialog.getByRole("button", { name: "Update in 1 list" }).click();
    await expect(dialog).not.toBeVisible();

    // The list made from the template now has quantity 3
    await page.goto(listUrl);
    const listForm = await openEdit(page);
    await expect(listForm.locator('input[name="quantity"]')).toHaveValue("3");
  });

  test("changing the category also offers to update the list", async ({ page }) => {
    await page.goto(templateUrl);
    const form = await openEdit(page);
    // Changing the category moves the item to another group on the page
    await form.locator('select[name="category_id"]').selectOption({ label: "Bebidas" });
    await form.getByRole("button", { name: "Save" }).click();

    const dialog = page.getByRole("dialog", { name: "Update item in lists" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Update in 1 list" }).click();
    await expect(dialog).not.toBeVisible();

    await page.goto(listUrl);
    const listForm = await openEdit(page);
    await expect(
      listForm.locator('select[name="category_id"] option:checked')
    ).toHaveText("Bebidas");
  });

  test("Skip keeps the list unchanged", async ({ page }) => {
    await page.goto(templateUrl);
    const form = await openEdit(page);
    await form.locator('input[name="quantity"]').fill("7");
    await form.getByRole("button", { name: "Save" }).click();

    const dialog = page.getByRole("dialog", { name: "Update item in lists" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Skip" }).click();
    await expect(dialog).not.toBeVisible();

    await page.goto(listUrl);
    const listForm = await openEdit(page);
    await expect(listForm.locator('input[name="quantity"]')).toHaveValue("3");
  });
});
