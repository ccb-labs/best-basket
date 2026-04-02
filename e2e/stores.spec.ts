/**
 * Stores CRUD E2E tests — tests creating, reading, editing,
 * and deleting stores.
 *
 * Same serial pattern as shopping-lists.spec.ts:
 *   1. Start with a clean slate (delete leftover stores)
 *   2. Create stores
 *   3. Edit a store
 *   4. Cancel an edit
 *   5. Delete stores
 */
import { test, expect } from "@playwright/test";

test.describe.serial("Stores CRUD", () => {
  const storeName1 = `Lidl ${Date.now()}`;
  const storeName2 = `Continente ${Date.now()}`;
  const editedName = `Lidl Portugal ${Date.now()}`;

  test("shows empty state when no stores exist", async ({ page }) => {
    await page.goto("/stores");

    // Clean up any leftover stores from previous test runs
    page.on("dialog", (dialog) => dialog.accept());

    while (
      await page
        .getByRole("button", { name: "Delete" })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await page.getByRole("button", { name: "Delete" }).first().click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText("No stores yet")).toBeVisible();
    await expect(
      page.getByText("Add your first store above to start tracking prices!")
    ).toBeVisible();
  });

  test("creates a new store", async ({ page }) => {
    await page.goto("/stores");

    await page.getByPlaceholder("Store name...").fill(storeName1);
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText(storeName1)).toBeVisible();
    await expect(page.getByText("No stores yet")).not.toBeVisible();
  });

  test("creates a second store", async ({ page }) => {
    await page.goto("/stores");

    await page.getByPlaceholder("Store name...").fill(storeName2);
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText(storeName1)).toBeVisible();
    await expect(page.getByText(storeName2)).toBeVisible();
  });

  test("edits a store name", async ({ page }) => {
    await page.goto("/stores");

    await page
      .getByRole("button", { name: `Edit ${storeName1}` })
      .click();

    const editForm = page.locator("form").filter({ hasText: "Save" });
    const editInput = editForm.getByRole("textbox");
    await editInput.clear();
    await editInput.fill(editedName);

    await Promise.all([
      page.waitForResponse(
        (resp) => resp.request().method() === "POST" && resp.ok()
      ),
      editForm.getByRole("button", { name: "Save" }).click(),
    ]);

    await page.goto("/stores");

    await expect(page.getByText(editedName)).toBeVisible();
    await expect(page.getByText(storeName1)).not.toBeVisible();
  });

  test("cancels editing without saving", async ({ page }) => {
    await page.goto("/stores");

    await page
      .getByRole("button", { name: `Edit ${storeName2}` })
      .click();

    const editForm = page.locator("form").filter({ hasText: "Save" });
    const editInput = editForm.getByRole("textbox");
    await editInput.clear();
    await editInput.fill("Should Not Save");
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText(storeName2)).toBeVisible();
    await expect(page.getByText("Should Not Save")).not.toBeVisible();
  });

  test("deletes a store", async ({ page }) => {
    await page.goto("/stores");

    page.on("dialog", (dialog) => dialog.accept());

    const storeCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: editedName });
    await storeCard.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(editedName)).not.toBeVisible();
    await expect(page.getByText(storeName2)).toBeVisible();
  });

  test("deleting the last store shows empty state", async ({ page }) => {
    await page.goto("/stores");

    page.on("dialog", (dialog) => dialog.accept());

    const storeCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: storeName2 });
    await storeCard.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("No stores yet")).toBeVisible();
  });
});
