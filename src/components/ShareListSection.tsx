/**
 * Share management section for a shopping list.
 *
 * Shown only to the list owner on the list detail page. Lets them:
 * 1. Share the list with another user by entering their email
 * 2. See who the list is already shared with
 * 3. Remove a shared user
 *
 * "use client" is needed because we use useState to toggle the section
 * open/closed and useActionState for the share/unshare Server Actions.
 */
"use client";

import { useState, useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionResult } from "@/app/(protected)/actions";

/** A shared user record with their email (from the database function) */
type ShareWithEmail = {
  id: string;
  user_id: string;
  email: string;
};

export function ShareListSection({
  listId,
  shares,
  shareAction,
  unshareAction,
}: {
  /** The ID of the list being shared */
  listId: string;
  /** Current list of shared users (with emails) */
  shares: ShareWithEmail[];
  /** Server Action to share the list with a new user */
  shareAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to remove a shared user */
  unshareAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  // Toggle the share section open/closed
  const [isOpen, setIsOpen] = useState(false);

  // Track the share form state (for error messages)
  const [shareState, shareFormAction] = useActionState(shareAction, {
    error: null,
  });

  // Track the unshare form state
  const [unshareState, unshareFormAction] = useActionState(unshareAction, {
    error: null,
  });

  const error = shareState.error || unshareState.error;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
      >
        Share
      </button>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Share this list</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Close
        </button>
      </div>

      {/* Form to share with a new user by email */}
      <form action={shareFormAction} className="flex gap-2">
        <input type="hidden" name="list_id" value={listId} />
        <input
          type="email"
          name="email"
          placeholder="Enter email address"
          required
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <SubmitButton
          label="Share"
          pendingLabel="Sharing..."
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        />
      </form>

      {/* Error message */}
      {error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* List of users the list is shared with */}
      {shares.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Shared with
          </p>
          {shares.map((share) => (
            <div
              key={share.id}
              className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2"
            >
              <span className="text-sm text-zinc-700">{share.email}</span>
              <form action={unshareFormAction}>
                <input type="hidden" name="share_id" value={share.id} />
                <input type="hidden" name="list_id" value={listId} />
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
