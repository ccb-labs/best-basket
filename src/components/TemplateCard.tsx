/**
 * A card that displays a single template.
 *
 * Has three modes:
 * 1. View mode (default) — shows the template name, recurrence badge,
 *    item count, and action buttons (Use Template, Edit, Delete).
 * 2. Edit mode — name input + recurrence select with save/cancel.
 *
 * "use client" is needed because we use useState to toggle between modes
 * and useActionState for the Server Actions.
 */
"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import type { ShoppingList } from "@/lib/types";
import type { ActionResult } from "@/app/(protected)/actions";

export function TemplateCard({
  template,
  itemCount,
  updateAction,
  deleteAction,
  createFromTemplateAction,
}: {
  /** The template data to display */
  template: ShoppingList;
  /** How many items this template has */
  itemCount: number;
  /** Server Action to update name/recurrence */
  updateAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to delete the template */
  deleteAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to create a new list from this template */
  createFromTemplateAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const [isEditing, setIsEditing] = useState(false);

  // Track errors from each action
  const [updateState, updateFormAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await updateAction(previousState, formData);
      if (!result.error) {
        setIsEditing(false);
      }
      return result;
    },
    { error: null }
  );
  const [deleteState, deleteFormAction] = useActionState(deleteAction, {
    error: null,
  });
  const [createState, createFormAction] = useActionState(
    createFromTemplateAction,
    { error: null }
  );

  const error = updateState.error || deleteState.error || createState.error;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      {isEditing ? (
        // ─── Edit Mode ───
        <form action={updateFormAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={template.id} />
          <input
            type="text"
            name="name"
            defaultValue={template.name}
            required
            autoFocus
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          />
          {/* Recurrence select — controls how often the app reminds you */}
          <select
            name="recurrence"
            defaultValue={template.recurrence ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="">No reminder</option>
            <option value="weekly">Weekly reminder</option>
            <option value="monthly">Monthly reminder</option>
          </select>
          <div className="flex gap-2">
            <SubmitButton
              label="Save"
              pendingLabel="Saving..."
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        // ─── View Mode ───
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <Link
                href={`/lists/${template.id}`}
                className="text-sm font-medium text-zinc-900 hover:underline"
              >
                {template.name}
              </Link>
              {/* Recurrence badge — small colored label */}
              {template.recurrence && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  {template.recurrence === "weekly" ? "Weekly" : "Monthly"}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {/* Use Template — creates a new list from this template */}
            <form action={createFormAction}>
              <input type="hidden" name="template_id" value={template.id} />
              <SubmitButton
                label="Use Template"
                pendingLabel="..."
                className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              />
            </form>

            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
              aria-label={`Edit ${template.name}`}
            >
              Edit
            </button>

            <form
              className="flex"
              action={deleteFormAction}
              onSubmit={(e) => {
                const confirmed = window.confirm(
                  `Delete template "${template.name}"? This cannot be undone.`
                );
                if (!confirmed) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={template.id} />
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Show error from any action */}
      {error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
