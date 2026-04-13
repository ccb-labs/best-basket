/**
 * A mobile-friendly dialog that lets users add a newly-created template
 * item to one or more existing shopping lists.
 *
 * Lists created from this template are shown first and pre-selected,
 * so the user can confirm with a single tap. Other lists are shown
 * below, unchecked by default.
 *
 * Follows the same layout and animation pattern as ConfirmDialog:
 * - On mobile: sits near the bottom (like an action sheet)
 * - On desktop: centered in the viewport
 *
 * The parent controls mount/unmount — this component is only rendered
 * when the dialog should be visible (no `open` prop needed).
 */
"use client";

import { useState } from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useScrollLock } from "@/hooks/useScrollLock";

/** The shape of a shopping list passed to this dialog */
type DialogList = {
  id: string;
  name: string;
  source_template_id: string | null;
};

export function AddToListsDialog({
  lists,
  templateId,
  itemName,
  loading,
  onConfirm,
  onCancel,
}: {
  /** All the user's non-template shopping lists */
  lists: DialogList[];
  /** The ID of the template being edited — used to identify derived lists */
  templateId: string;
  /** The name of the item just added (shown in the header) */
  itemName: string;
  /** Whether the confirm action is in progress */
  loading: boolean;
  /** Called with the selected list IDs when the user confirms */
  onConfirm: (selectedListIds: string[]) => void;
  /** Called when the user skips or closes the dialog */
  onCancel: () => void;
}) {
  // Split lists into two groups: derived from this template vs. others
  const derivedLists = lists.filter(
    (l) => l.source_template_id === templateId
  );
  const otherLists = lists.filter(
    (l) => l.source_template_id !== templateId
  );

  // Pre-select lists that were created from this template
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(derivedLists.map((l) => l.id))
  );

  useEscapeKey(onCancel);
  useScrollLock();

  function toggleList(listId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add item to lists"
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-slide-up max-h-[70vh] flex flex-col"
      >
        <p className="text-sm font-medium text-zinc-800">
          Also add <span className="font-semibold">{itemName}</span> to
          these lists?
        </p>

        {/* Scrollable list area */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-3">
          {derivedLists.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                From this template
              </p>
              <ul className="space-y-1">
                {derivedLists.map((list) => (
                  <ListCheckbox
                    key={list.id}
                    list={list}
                    checked={selected.has(list.id)}
                    onChange={() => toggleList(list.id)}
                  />
                ))}
              </ul>
            </div>
          )}

          {otherLists.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Other lists
              </p>
              <ul className="space-y-1">
                {otherLists.map((list) => (
                  <ListCheckbox
                    key={list.id}
                    list={list}
                    checked={selected.has(list.id)}
                    onChange={() => toggleList(list.id)}
                  />
                ))}
              </ul>
            </div>
          )}

          {lists.length === 0 && (
            <p className="text-sm text-zinc-500">No shopping lists yet.</p>
          )}
        </div>

        {/* Footer buttons */}
        <div className="mt-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100"
          >
            Skip
          </button>
          {lists.length > 0 && (
            <button
              type="button"
              onClick={() => onConfirm(Array.from(selected))}
              disabled={selected.size === 0 || loading}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : `Add to ${selected.size} list${selected.size !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A single checkbox row for a shopping list */
function ListCheckbox({
  list,
  checked,
  onChange,
}: {
  list: DialogList;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <li>
      <label className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-zinc-50 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
        />
        <span className="text-sm text-zinc-700">{list.name}</span>
      </label>
    </li>
  );
}
