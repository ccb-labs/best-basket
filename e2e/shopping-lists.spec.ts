/**
 * Shopping list CRUD E2E tests — tests creating, reading, editing,
 * and deleting shopping lists.
 *
 * These tests use the saved storageState from auth.setup.ts, so the
 * browser starts already logged in.
 *
 * The tests run SERIALLY (one after another, in order) because they
 * form a natural CRUD sequence:
 *   1. Start with a clean slate (delete leftover lists)
 *   2. Create lists
 *   3. Edit a list
 *   4. Navigate to a list detail page
 *   5. Delete lists
 *
 * "Serial" means if test #2 fails, tests #3–8 are skipped — which makes
 * sense because if we can't create a list, we can't edit or delete it.
 */
import { test, expect } from "@playwright/test";

test.describe.serial("Shopping list CRUD", () => {
  // We use two list names throughout the tests
  const listName1 = `Weekly Groceries ${Date.now()}`;
  const listName2 = `Monthly Supplies ${Date.now()}`;
  const editedName = `Weekend Groceries ${Date.now()}`;

  test("shows empty state when no lists exist", async ({ page }) => {
    // Clean up any leftover lists from previous test runs.
    // We reload the page after each deletion to get a fresh server state.
    while (true) {
      await page.goto("/");
      await page.waitForSelector("h2");
      const deleteBtn = page.getByRole("button", { name: "Delete" }).first();
      if (!(await deleteBtn.isVisible({ timeout: 2_000 }).catch(() => false))) break;
      await deleteBtn.click();
      // Confirm the deletion in the custom confirm dialog
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
      await page.waitForTimeout(1_000);
    }

    // Now the empty state should be visible
    await expect(page.getByText("No shopping lists yet")).toBeVisible();
    await expect(
      page.getByText("Create your first list above to get started!")
    ).toBeVisible();
  });

  test("creates a new shopping list", async ({ page }) => {
    await page.goto("/");

    // Fill in the new list name and submit
    await page.getByPlaceholder("New list name...").fill(listName1);
    await page.getByRole("button", { name: "Add" }).click();

    // The new list should appear on the page
    await expect(page.getByText(listName1)).toBeVisible();

    // The empty state should be gone
    await expect(page.getByText("No shopping lists yet")).not.toBeVisible();
  });

  test("creates a second list (newest appears first)", async ({ page }) => {
    await page.goto("/");

    // Create the second list
    await page.getByPlaceholder("New list name...").fill(listName2);
    await page.getByRole("button", { name: "Add" }).click();

    // Both lists should be visible
    await expect(page.getByText(listName1)).toBeVisible();
    await expect(page.getByText(listName2)).toBeVisible();

    // The newest list (listName2) should appear BEFORE the older one.
    // We check this by looking at the order of list cards on the page.
    const listCards = page.locator('[class*="border-zinc-200"]');
    const firstCardText = await listCards.first().textContent();
    expect(firstCardText).toContain(listName2);
  });

  test("edits a shopping list name", async ({ page }) => {
    await page.goto("/");

    // Click the "Edit" button for listName1.
    // aria-label is set to "Edit <list name>" on each edit button.
    await page
      .getByRole("button", { name: `Edit ${listName1}` })
      .click();

    // The edit form has Save and Cancel buttons — we use that to find
    // the right input (since the create form also has an input[name="name"])
    const editForm = page.locator("form").filter({ hasText: "Save" });
    const editInput = editForm.getByRole("textbox");
    await expect(editInput).toBeVisible();

    // Clear the input and type the new name
    await editInput.clear();
    await editInput.fill(editedName);

    // Click "Save" — this triggers a Server Action (a POST request to the server).
    // We wait for the POST response to confirm the action completed before
    // navigating away. Without this, we'd navigate before the save finishes.
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.request().method() === "POST" && resp.ok()
      ),
      editForm.getByRole("button", { name: "Save" }).click(),
    ]);

    // After saving, reload the page to get a fresh view.
    // The card stays in edit mode because React preserves client state,
    // but the data was saved to the database. Reloading confirms the
    // save worked and shows the updated name in view mode.
    await page.goto("/");

    // The new name should appear and the old name should be gone
    await expect(page.getByText(editedName)).toBeVisible();
    await expect(page.getByText(listName1)).not.toBeVisible();
  });

  test("cancels editing without saving changes", async ({ page }) => {
    await page.goto("/");

    // Click "Edit" on listName2
    await page
      .getByRole("button", { name: `Edit ${listName2}` })
      .click();

    // Change the name but then cancel
    const editForm = page.locator("form").filter({ hasText: "Save" });
    const editInput = editForm.getByRole("textbox");
    await editInput.clear();
    await editInput.fill("Should Not Save");
    await page.getByRole("button", { name: "Cancel" }).click();

    // The original name should still be there
    await expect(page.getByText(listName2)).toBeVisible();
    await expect(page.getByText("Should Not Save")).not.toBeVisible();
  });

  test("navigates to list detail page and back", async ({ page }) => {
    await page.goto("/");

    // Click the list name link to go to the detail page
    await page.getByRole("link", { name: editedName }).click();

    // The URL should contain /lists/ followed by a UUID
    await expect(page).toHaveURL(/\/lists\/[a-f0-9-]+/);

    // The detail page should show the list name as a heading
    await expect(
      page.getByRole("heading", { name: editedName })
    ).toBeVisible();

    // Click "Back to lists" to return to the home page
    await page.getByText("Back to lists").click();

    // We should be back on the home page with all lists visible
    await expect(page).toHaveURL("/");
    await expect(page.getByText(editedName)).toBeVisible();
    await expect(page.getByText(listName2)).toBeVisible();
  });

  test("deletes a shopping list", async ({ page }) => {
    await page.goto("/");

    // Find the card that contains listName2 and click its Delete button
    const listCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: listName2 });
    await listCard.getByRole("button", { name: "Delete" }).click();

    // Confirm the deletion in the custom confirm dialog
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    // listName2 should be gone, but editedName should still be there
    await expect(page.getByText(listName2)).not.toBeVisible();
    await expect(page.getByText(editedName)).toBeVisible();
  });

  test("deleting the last list shows empty state", async ({ page }) => {
    await page.goto("/");

    // Delete the remaining list
    const listCard = page
      .locator('[class*="border-zinc-200"]')
      .filter({ hasText: editedName });
    await listCard.getByRole("button", { name: "Delete" }).click();

    // Confirm the deletion in the custom confirm dialog
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    // Empty state should appear again
    await expect(page.getByText("No shopping lists yet")).toBeVisible();
    await expect(
      page.getByText("Create your first list above to get started!")
    ).toBeVisible();
  });
});
