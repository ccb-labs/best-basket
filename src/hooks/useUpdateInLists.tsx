/**
 * Hook that powers the "Also update this item in these lists?" dialog
 * shown after editing an item in a TEMPLATE.
 *
 * It's the editing counterpart of the "Also add to these lists?" dialog
 * that AddItemForm shows after adding an item to a template.
 *
 * Why a hook? It keeps the dialog's state (which lists to show, loading,
 * errors) out of the components. It follows the same pattern as useConfirm():
 * the hook returns a function to open the dialog plus the dialog JSX to render.
 *
 * Where it's used: ListItemsSection (the whole list of items), NOT in each
 * ListItemCard. A card can be removed and re-created after a save — e.g.
 * changing the category moves the item into another group — and any dialog
 * state inside the old card would be lost with it.
 *
 * Flow:
 * 1. The item is saved in the template (normal updateItem action).
 * 2. offerUpdate() asks the server which of the user's lists contain an
 *    item with the OLD name (before any rename).
 * 3. If any do, the dialog opens with those lists. Lists created from
 *    this template are pre-selected.
 * 4. On confirm, the same changes are applied to the selected lists.
 */
"use client";

import { useState } from "react";
import { TemplateListsDialog } from "@/components/TemplateListsDialog";
import type { ActionResult } from "@/app/(protected)/actions";
import type { NewItemData } from "@/lib/types";

type UserList = { id: string; name: string; source_template_id: string | null };

/** Everything ListItemCard needs to offer updating other lists.
 *  Only passed when the page is showing a template. */
export type TemplateEditConfig = {
  /** The template being edited — used to pre-select lists made from it */
  templateId: string;
  /** All the user's (non-template) shopping lists */
  userLists: UserList[];
  /** Server Action: which of these lists contain an item with this name? */
  findListsAction: (listIds: string[], itemName: string) => Promise<string[]>;
  /** Server Action: apply the edit to the item in the selected lists */
  updateInListsAction: (
    listIds: string[],
    oldName: string,
    itemData: NewItemData
  ) => Promise<ActionResult>;
};

export function useUpdateInLists(config: TemplateEditConfig | undefined) {
  // What's waiting for the user's decision (null = dialog closed)
  const [pending, setPending] = useState<{
    oldName: string;
    itemData: NewItemData;
    lists: UserList[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Call after the template item was saved successfully. */
  async function offerUpdate(oldName: string, itemData: NewItemData) {
    // Not a template, or the user has no lists → nothing to offer
    if (!config || config.userLists.length === 0) return;

    setError(null);
    let matchingIds: string[] = [];
    try {
      matchingIds = await config.findListsAction(
        config.userLists.map((l) => l.id),
        oldName
      );
    } catch {
      setError("Could not check your other lists. Please try again.");
      return;
    }
    const lists = config.userLists.filter((l) => matchingIds.includes(l.id));

    // Only open the dialog when at least one list has this item
    if (lists.length > 0) {
      setPending({ oldName, itemData, lists });
    }
  }

  async function handleConfirm(selectedListIds: string[]) {
    if (!config || !pending) return;
    setLoading(true);
    try {
      const result = await config.updateInListsAction(
        selectedListIds,
        pending.oldName,
        pending.itemData
      );
      setError(result.error);
    } catch {
      setError("Could not update your other lists. Please try again.");
    }
    setLoading(false);
    setPending(null);
  }

  const renamed = pending && pending.oldName !== pending.itemData.name;

  const updateDialog =
    pending && config ? (
      <TemplateListsDialog
        lists={pending.lists}
        templateId={config.templateId}
        message={
          <>
            Also update <span className="font-semibold">{pending.oldName}</span>
            {renamed && (
              <>
                {" "}
                to <span className="font-semibold">{pending.itemData.name}</span>
              </>
            )}{" "}
            in these lists?
          </>
        }
        actionVerb="Update"
        loadingLabel="Updating..."
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    ) : null;

  return { offerUpdate, updateDialog, updateInListsError: error };
}
