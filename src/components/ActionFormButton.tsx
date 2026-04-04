/**
 * A reusable button that submits a Server Action via a form.
 *
 * After a successful action, it shows a brief success message instead
 * of the button. This pattern is used for one-click actions like
 * "Save as Template" and "Create List from Template".
 *
 * "use client" is needed because we use useActionState for the
 * Server Action and useState for the success message.
 */
"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionResult } from "@/app/(protected)/actions";

export function ActionFormButton({
  action,
  hiddenInputName,
  hiddenInputValue,
  label,
  pendingLabel,
  successMessage,
  buttonClassName,
}: {
  /** The Server Action to call when the form is submitted */
  action: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** The name attribute for the hidden input (e.g., "list_id") */
  hiddenInputName: string;
  /** The value for the hidden input (e.g., the list's UUID) */
  hiddenInputValue: string;
  /** Button label shown before clicking */
  label: string;
  /** Button label shown while the action is running */
  pendingLabel: string;
  /** Message shown after successful action */
  successMessage: string;
  /** Tailwind classes for the button */
  buttonClassName: string;
}) {
  const [done, setDone] = useState(false);

  const [state, formAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await action(previousState, formData);
      if (!result.error) {
        setDone(true);
      }
      return result;
    },
    { error: null }
  );

  if (done) {
    return (
      <p className="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700">
        {successMessage}
      </p>
    );
  }

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name={hiddenInputName} value={hiddenInputValue} />
        <SubmitButton
          label={label}
          pendingLabel={pendingLabel}
          className={buttonClassName}
        />
      </form>
      {state.error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
