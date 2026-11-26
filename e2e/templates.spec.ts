/**
 * Template E2E tests — adding, editing or deleting an item offers to apply
 * the same change on the "other side":
 * - In a template → the shopping lists that contain that item
 * - In a shopping list → the templates that contain that item
 *   (for ADD: only on lists created from a template)
 *
 * Each describe block runs SERIALLY because its tests form a sequence.
 *
 * "Template item edits" (template → lists):
 *   1. Create a template with one item
 *   2. Create a shopping list from it ("Use Template")
 *   3. Edit the quantity in the template → dialog → Update
 *   4. Edit the category in the template → dialog → Update
 *   5. Edit again and Skip → the list stays as it was
 *   6. Add a 2nd item to the template → "Also add" dialog → Add to the list
 *   7. Delete the 2nd item and Skip → it stays in the list
 *   8. Delete the 1st item → "Also remove" dialog → it's gone from the list
 *
 * "Shopping list → template":
 *   1. Create a template + a list from it
 *   2-4. Add / edit / delete in the list → the template follows
 *   5. Adding to a list made from scratch shows no dialog
 */
import { test, expect, type Page } from "@playwright/test";

/**
 * Go to a page and wait until it has fully loaded.
 * The list page currently has a hydration mismatch (the voice button), so
 * React re-draws the page right after load — anything typed or opened
 * before that (text in an input, a confirm dialog) would be wiped.
 */
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

/**
 * After adding an item to a template: if the user already has shopping
 * lists (e.g. from other test files), the "Also add to these lists?" dialog
 * opens. Skip it — we only want the item in the template.
 * We first wait for the page to settle, because the dialog can open a
 * moment after the new item shows up.
 */
async function skipAddDialogIfShown(page: Page) {
  await page.waitForLoadState("networkidle");
  const addDialog = page.getByRole("dialog", { name: "Add item in lists" });
  if (await addDialog.isVisible()) {
    await addDialog.getByRole("button", { name: "Skip" }).click();
    await expect(addDialog).not.toBeVisible();
  }
}

/** Delete an item from the current page (including the confirm step) */
async function deleteItem(page: Page, name: string) {
  const card = page
    .locator('[class*="border-zinc-200"]')
    .filter({ hasText: name });
  await card.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
}

test.describe.serial("Template item edits", () => {
  const stamp = Date.now();
  const templateName = `Template Test ${stamp}`;
  // A unique item name: if "Leite" was used before, the app would auto-fill
  // its old category, and the category test below would change nothing.
  const itemName = `Leite ${stamp}`;
  const secondItem = `Pão ${stamp}`;
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

    await expect(page.getByRole("button", { name: `Edit ${itemName}` })).toBeVisible();
    await skipAddDialogIfShown(page);
  });

  test("creates a shopping list from the template", async ({ page }) => {
    await open(page, templateUrl);
    await page.getByRole("button", { name: "Use Template" }).click();

    // createListFromTemplate redirects to the new list's page
    await expect(page).not.toHaveURL(templateUrl);
    await expect(page.getByRole("button", { name: `Edit ${itemName}` })).toBeVisible();
    listUrl = page.url();
  });

  test("updating the quantity offers to update the list", async ({ page }) => {
    await open(page, templateUrl);
    const form = await openEdit(page);
    await form.locator('input[name="quantity"]').fill("3");
    await form.getByRole("button", { name: "Save" }).click();

    const dialog = page.getByRole("dialog", { name: "Update item in lists" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`Also update ${itemName} in these lists?`);
    await dialog.getByRole("button", { name: "Update in 1 list" }).click();
    await expect(dialog).not.toBeVisible();

    // The list made from the template now has quantity 3
    await open(page, listUrl);
    const listForm = await openEdit(page);
    await expect(listForm.locator('input[name="quantity"]')).toHaveValue("3");
  });

  test("changing the category also offers to update the list", async ({ page }) => {
    await open(page, templateUrl);
    const form = await openEdit(page);
    // Changing the category moves the item to another group on the page
    await form.locator('select[name="category_id"]').selectOption({ label: "Bebidas" });
    await form.getByRole("button", { name: "Save" }).click();

    const dialog = page.getByRole("dialog", { name: "Update item in lists" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Update in 1 list" }).click();
    await expect(dialog).not.toBeVisible();

    await open(page, listUrl);
    const listForm = await openEdit(page);
    await expect(
      listForm.locator('select[name="category_id"] option:checked')
    ).toHaveText("Bebidas");
  });

  test("Skip keeps the list unchanged", async ({ page }) => {
    await open(page, templateUrl);
    const form = await openEdit(page);
    await form.locator('input[name="quantity"]').fill("7");
    await form.getByRole("button", { name: "Save" }).click();

    const dialog = page.getByRole("dialog", { name: "Update item in lists" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Skip" }).click();
    await expect(dialog).not.toBeVisible();

    await open(page, listUrl);
    const listForm = await openEdit(page);
    await expect(listForm.locator('input[name="quantity"]')).toHaveValue("3");
  });

  test("adding a template item can add it to the list too", async ({ page }) => {
    await open(page, templateUrl);
    await page.getByPlaceholder("Item name...").fill(secondItem);
    await page.getByRole("button", { name: "Add item" }).click();

    const dialog = page.getByRole("dialog", { name: "Add item in lists" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Add to 1 list" }).click();
    await expect(dialog).not.toBeVisible();

    await open(page, listUrl);
    await expect(page.getByRole("button", { name: `Edit ${secondItem}` })).toBeVisible();
  });

  test("deleting a template item and skipping keeps it in the list", async ({ page }) => {
    await open(page, templateUrl);
    await deleteItem(page, secondItem);

    const dialog = page.getByRole("dialog", { name: "Remove item in lists" });
    await expect(dialog).toContainText(`Also remove ${secondItem} from these lists?`);
    await dialog.getByRole("button", { name: "Skip" }).click();
    await expect(dialog).not.toBeVisible();

    // Gone from the template...
    await expect(page.getByRole("button", { name: `Edit ${secondItem}` })).not.toBeVisible();
    // ...but still in the list
    await open(page, listUrl);
    await expect(page.getByRole("button", { name: `Edit ${secondItem}` })).toBeVisible();
  });

  test("deleting a template item can remove it from the list", async ({ page }) => {
    await open(page, templateUrl);
    await deleteItem(page, itemName);

    const dialog = page.getByRole("dialog", { name: "Remove item in lists" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Remove from 1 list" }).click();
    await expect(dialog).not.toBeVisible();

    await open(page, listUrl);
    await expect(page.getByRole("button", { name: `Edit ${itemName}` })).not.toBeVisible();
    // The skipped item is still there
    await expect(page.getByRole("button", { name: `Edit ${secondItem}` })).toBeVisible();
  });
});

test.describe.serial("Shopping list → template", () => {
  const stamp = Date.now();
  const templateName = `Reverse Template ${stamp}`;
  const plainListName = `Plain List ${stamp}`;
  const firstItem = `Arroz ${stamp}`;
  const newItem = `Massa ${stamp}`;
  let templateUrl = "";
  let listUrl = "";

  test("creates a template with an item and a list from it", async ({ page }) => {
    await open(page, "/templates");
    await page.getByPlaceholder("New template name...").fill(templateName);
    await page.getByRole("button", { name: "Add" }).click();
    await page.getByRole("link", { name: templateName }).click();
    await expect(page).toHaveURL(/\/lists\/[a-f0-9-]+/);
    templateUrl = page.url();
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("Item name...").fill(firstItem);
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByRole("button", { name: `Edit ${firstItem}` })).toBeVisible();
    await skipAddDialogIfShown(page);

    await page.getByRole("button", { name: "Use Template" }).click();
    await expect(page).not.toHaveURL(templateUrl);
    await expect(page.getByRole("button", { name: `Edit ${firstItem}` })).toBeVisible();
    listUrl = page.url();
  });

  test("adding to the list can add it to its template", async ({ page }) => {
    await open(page, listUrl);
    await page.getByPlaceholder("Item name...").fill(newItem);
    await page.getByRole("button", { name: "Add item" }).click();

    const dialog = page.getByRole("dialog", { name: "Add item in templates" });
    await expect(dialog).toContainText(`Also add ${newItem} to these templates?`);
    // Only this list's template is pre-ticked
    await dialog.getByRole("button", { name: "Add to 1 template" }).click();
    await expect(dialog).not.toBeVisible();

    await open(page, templateUrl);
    await expect(page.getByRole("button", { name: `Edit ${newItem}` })).toBeVisible();
  });

  // Note: `exact: true` on "Save" because shopping lists also have a
  // "Save as Template" button, which a plain "Save" search would match too.
  test("editing in the list can update the template", async ({ page }) => {
    await open(page, listUrl);
    await page.getByRole("button", { name: `Edit ${firstItem}` }).click();
    const form = page.locator("form").filter({
      has: page.getByRole("button", { name: "Save", exact: true }),
    });
    await form.locator('input[name="quantity"]').fill("4");
    await form.getByRole("button", { name: "Save", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Update item in templates" });
    await expect(dialog).toContainText(`Also update ${firstItem} in these templates?`);
    await dialog.getByRole("button", { name: "Update in 1 template" }).click();
    await expect(dialog).not.toBeVisible();

    await open(page, templateUrl);
    await page.getByRole("button", { name: `Edit ${firstItem}` }).click();
    await expect(
      page.locator("form").filter({ has: page.getByRole("button", { name: "Save", exact: true }) })
        .locator('input[name="quantity"]')
    ).toHaveValue("4");
  });

  test("deleting in the list can remove it from the template", async ({ page }) => {
    await open(page, listUrl);
    await deleteItem(page, newItem);

    const dialog = page.getByRole("dialog", { name: "Remove item in templates" });
    await expect(dialog).toContainText(`Also remove ${newItem} from these templates?`);
    await dialog.getByRole("button", { name: "Remove from 1 template" }).click();
    await expect(dialog).not.toBeVisible();

    await open(page, templateUrl);
    await expect(page.getByRole("button", { name: `Edit ${newItem}` })).not.toBeVisible();
    await expect(page.getByRole("button", { name: `Edit ${firstItem}` })).toBeVisible();
  });

  test("adding to a list NOT made from a template does not ask", async ({ page }) => {
    await open(page, "/");
    await page.getByPlaceholder("New list name...").fill(plainListName);
    await page.getByRole("button", { name: "Add" }).click();
    await page.getByRole("link", { name: plainListName }).click();
    await expect(page).toHaveURL(/\/lists\/[a-f0-9-]+/);
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("Item name...").fill(`Sal ${stamp}`);
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByRole("button", { name: `Edit Sal ${stamp}` })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
