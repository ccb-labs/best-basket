/**
 * A form to create a new store.
 *
 * Same pattern as ShoppingListForm — uses useActionState to call a
 * Server Action and clears the input after a successful submission.
 */
"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionResult } from "@/app/(protected)/actions";

export function StoreForm({
  createAction,
}: {
  /** The Server Action to call when the form is submitted */
  createAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(
    previousState: ActionResult,
    formData: FormData
  ): Promise<ActionResult> {
    const result = await createAction(previousState, formData);

    if (result.error === null) {
      formRef.current?.reset();
    }

    return result;
  }

  const [state, formAction] = useActionState(handleAction, { error: null });

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex gap-2">
        <input
          type="text"
          name="name"
          placeholder="Store name..."
          required
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <SubmitButton label="Add" pendingLabel="Adding..." />
      </form>

      {state.error && (
        <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
