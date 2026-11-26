/**
 * Hook that keeps templates and shopping lists in sync when an item is
 * edited or deleted. It works in both directions:
 * - On a TEMPLATE: "Also update Milk in these lists?" / "Also remove ... from these lists?"
 * - On a LIST:     "Also update Milk in these templates?" / "Also remove ... from these templates?"
 *
 * They're the counterparts of the "Also add to these lists/templates?"
 * dialog that AddItemForm shows after adding an item.
 *
 * Why a hook? It keeps the dialog's state (which lists to show, loading,
 * errors) out of the components. It follows the same pattern as useConfirm():
 * the hook returns functions to open the dialog plus the dialog JSX to render.
 *
 * Where it's used: ListItemsSection (the whole list of items), NOT in each
 * ListItemCard. A card can disappear after a save or delete — e.g. changing
 * the category moves the item into another group, and deleting removes the
 * card entirely — and any dialog state inside that card would be lost with it.
 *
 * Flow:
 * 1. The item is saved/deleted in the template (normal server action).
 * 2. offerUpdate() / offerDelete() asks the server which of the targets
 *    contain an item with that name (the OLD name, in case of a rename).
 * 3. If any do, the dialog opens with those. The likely ones (lists made
 *    from this template / this list's template) are pre-selected.
 * 4. On confirm, the same change is applied to the selected lists.
 *    On Skip, nothing else changes.
 */
"use client";

import { useState } from "react";
import { TemplateListsDialog } from "@/components/TemplateListsDialog";
import type { ActionResult } from "@/app/(protected)/actions";
import type { NewItemData, SyncTargets } from "@/lib/types";

type Target = { id: string; name: string };

/** Everything needed to copy item edits/deletes to other lists or templates.
 *  Only passed when there's something to offer (see buildSyncTargets). */
export type ItemSyncConfig = SyncTargets & {
  /** Server Action: which of these lists contain an item with this name? */
  findListsAction: (listIds: string[], itemName: string) => Promise<string[]>;
  /** Server Action: apply the edit to the item in the selected lists/templates */
  updateInListsAction: (
    listIds: string[],
    oldName: string,
    itemData: NewItemData
  ) => Promise<ActionResult>;
  /** Server Action: delete the item from the selected lists/templates */
  deleteFromListsAction: (
    listIds: string[],
    itemName: string
  ) => Promise<ActionResult>;
};

/**
 * What the dialog is waiting on. `kind` tells us which question to ask
 * and which server action to run when the user confirms.
 * (null = dialog closed)
 */
type PendingChange =
  | { kind: "update"; itemName: string; itemData: NewItemData; lists: Target[] }
  | { kind: "delete"; itemName: string; lists: Target[] };

export function useTemplateItemSync(config: ItemSyncConfig | undefined) {
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ask the server which of the targets contain `itemName`.
   * Returns those lists, or null if something went wrong.
   */
  async function findMatchingLists(itemName: string): Promise<Target[] | null> {
    // Nothing to offer (e.g. no lists / no templates)
    if (!config || config.targets.length === 0) return [];

    setError(null);
    try {
      const matchingIds = await config.findListsAction(
        config.targets.map((t) => t.id),
        itemName
      );
      return config.targets.filter((t) => matchingIds.includes(t.id));
    } catch {
      setError(`Could not check your ${config.noun}s. Please try again.`);
      return null;
    }
  }

  /** Call after a template item was saved successfully. */
  async function offerUpdate(oldName: string, itemData: NewItemData) {
    const lists = await findMatchingLists(oldName);
    // Only open the dialog when at least one list has this item
    if (lists && lists.length > 0) {
      setPending({ kind: "update", itemName: oldName, itemData, lists });
    }
  }

  /** Call after a template item was deleted successfully. */
  async function offerDelete(itemName: string) {
    const lists = await findMatchingLists(itemName);
    if (lists && lists.length > 0) {
      setPending({ kind: "delete", itemName, lists });
    }
  }

  async function handleConfirm(selectedListIds: string[]) {
    if (!config || !pending) return;
    setLoading(true);
    try {
      const result =
        pending.kind === "update"
          ? await config.updateInListsAction(
              selectedListIds,
              pending.itemName,
              pending.itemData
            )
          : await config.deleteFromListsAction(selectedListIds, pending.itemName);
      setError(result.error);
    } catch {
      setError(`Could not update your ${config.noun}s. Please try again.`);
    }
    setLoading(false);
    setPending(null);
  }

  // Build the dialog for whichever change is pending
  let syncDialog = null;
  if (pending && config) {
    const these = `these ${config.noun}s`; // "these lists" / "these templates"
    const boldName = <span className="font-semibold">{pending.itemName}</span>;
    let message;
    if (pending.kind === "delete") {
      message = <>Also remove {boldName} from {these}?</>;
    } else if (pending.itemName !== pending.itemData.name) {
      // The item was renamed — say so in the question
      message = (
        <>
          Also update {boldName} to{" "}
          <span className="font-semibold">{pending.itemData.name}</span> in{" "}
          {these}?
        </>
      );
    } else {
      message = <>Also update {boldName} in {these}?</>;
    }

    syncDialog = (
      <TemplateListsDialog
        targets={{ ...config, targets: pending.lists }}
        message={message}
        actionVerb={pending.kind === "delete" ? "Remove" : "Update"}
        loadingLabel={pending.kind === "delete" ? "Removing..." : "Updating..."}
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    );
  }

  return { offerUpdate, offerDelete, syncDialog, syncError: error };
}
