/**
 * Decide which lists/templates a list item change can be copied to.
 *
 * Kept as plain functions (no React, no database) so the rules are easy
 * to read and to unit test.
 *
 * Rules:
 * - On a TEMPLATE: offer the user's shopping lists. Lists created from
 *   this template are pre-ticked.
 * - On a SHOPPING LIST: offer the user's templates. The template this
 *   list was created from (if any) is pre-ticked.
 */
import type { SyncTargets } from "@/lib/types";

type ListSummary = { id: string; name: string; source_template_id: string | null };

/**
 * Targets for EDIT and DELETE. The dialog later narrows them down to the
 * ones that actually contain the item, so we can offer everything here.
 * Returns null when there's nothing to offer.
 */
export function buildSyncTargets(
  list: { id: string; is_template: boolean; source_template_id: string | null },
  userLists: ListSummary[],
  userTemplates: { id: string; name: string }[]
): SyncTargets | null {
  if (list.is_template) {
    if (userLists.length === 0) return null;
    return {
      targets: userLists,
      preselectedIds: userLists
        .filter((l) => l.source_template_id === list.id)
        .map((l) => l.id),
      noun: "list",
      preselectedLabel: "From this template",
      othersLabel: "Other lists",
    };
  }

  if (userTemplates.length === 0) return null;
  return {
    targets: userTemplates,
    preselectedIds: list.source_template_id ? [list.source_template_id] : [],
    noun: "template",
    preselectedLabel: "This list's template",
    othersLabel: "Other templates",
  };
}

/**
 * Targets for ADD. Same as above, except that on a shopping list we only
 * ask when the list was created from a template (that still exists).
 * Otherwise the dialog would pop up on every quick add in a store.
 */
export function buildAddSyncTargets(
  list: { id: string; is_template: boolean; source_template_id: string | null },
  userLists: ListSummary[],
  userTemplates: { id: string; name: string }[]
): SyncTargets | null {
  if (!list.is_template) {
    const hasSourceTemplate = userTemplates.some(
      (t) => t.id === list.source_template_id
    );
    if (!hasSourceTemplate) return null;
  }
  return buildSyncTargets(list, userLists, userTemplates);
}
