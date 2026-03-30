/**
 * A form to create a new shopping list.
 *
 * Uses useActionState (React 19) to call a Server Action and track
 * its result (success or error). The form input is cleared automatically
 * after a successful submission using a ref to the form element.
 */
"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionResult } from "@/app/(protected)/actions";

export function ShoppingListForm({
  createAction,
}: {
  /** The Server Action to call when the form is submitted */
  createAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  // We use a ref to access the form element so we can clear the input
  // after a successful submission.
  const formRef = useRef<HTMLFormElement>(null);

  // Wrap the server action so we can clear the form after success.
  // useActionState calls this wrapper instead of the action directly.
  async function handleAction(
    previousState: ActionResult,
    formData: FormData
  ): Promise<ActionResult> {
    const result = await createAction(previousState, formData);

    // If the action succeeded, clear the input field
    if (result.error === null) {
      formRef.current?.reset();
    }

    return result;
  }

  // useActionState hooks into our wrapper action and gives us:
  // - state: the latest return value from the action ({ error: string | null })
  // - formAction: a wrapper to pass to <form action={...}>
  const [state, formAction] = useActionState(handleAction, { error: null });

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex gap-2">
        <input
          type="text"
          name="name"
          placeholder="New list name..."
          required
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <SubmitButton label="Add" pendingLabel="Adding..." />
      </form>

      {/* Show error message if the action returned one */}
      {state.error && (
        <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
