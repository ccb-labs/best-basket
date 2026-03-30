/**
 * A submit button that automatically shows a loading state while
 * a Server Action is running.
 *
 * Why is this a separate component?
 * React's useFormStatus() hook only works when called from a component
 * that is rendered INSIDE a <form>. If we put the hook directly in the
 * form component, it wouldn't detect the pending state. By extracting
 * the button into its own component, useFormStatus() can read the
 * parent form's status correctly.
 */
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
  className,
}: {
  /** Text shown on the button normally */
  label: string;
  /** Text shown while the form is submitting */
  pendingLabel: string;
  /** Optional extra Tailwind classes */
  className?: string;
}) {
  // useFormStatus() returns { pending: true } while the parent form's
  // Server Action is running. This lets us disable the button and
  // show different text during submission.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      }
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
