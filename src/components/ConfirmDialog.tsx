/**
 * A mobile-friendly confirmation dialog that replaces window.confirm().
 *
 * On small screens, the dialog sits near the bottom of the screen
 * (like an iOS action sheet). On larger screens, it's centered.
 *
 * Why not use window.confirm()? The native browser dialog looks different
 * on every device, can't be styled, and often feels jarring on mobile.
 * This custom dialog gives us full control over look and feel.
 */
"use client";

import { useState } from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useScrollLock } from "@/hooks/useScrollLock";

export function ConfirmDialog({
  open,
  message,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
  onCancel,
}: {
  /** Whether the dialog is visible */
  open: boolean;
  /** The message to display */
  message: string;
  /** Label for the confirm button (default: "Delete") */
  confirmLabel?: string;
  /** If true, the confirm button is red. If false, it's dark/neutral. */
  destructive?: boolean;
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Called when the user cancels (backdrop click, Escape key, or Cancel button) */
  onCancel: () => void;
}) {
  // Close on Escape key and prevent background scrolling
  useEscapeKey(onCancel);
  useScrollLock();

  if (!open) return null;

  return (
    // "items-end" positions the panel near the bottom on mobile (like an
    // action sheet). "sm:items-center" centers it on larger screens.
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Semi-transparent backdrop — clicking it cancels */}
      <div
        className="fixed inset-0 bg-black/40 animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirmation"
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-slide-up"
      >
        <p className="text-sm leading-relaxed text-zinc-700">{message}</p>

        <div className="mt-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white ${
              destructive
                ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                : "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook that manages the state for a ConfirmDialog.
 *
 * Returns:
 * - `requestConfirm` — call this to show the dialog
 * - `confirmDialog` — render this in your JSX (it's null when hidden)
 *
 * Example:
 *   const { requestConfirm, confirmDialog } = useConfirm();
 *
 *   // Show the dialog:
 *   requestConfirm({
 *     message: "Delete this item?",
 *     onConfirm: () => formRef.current?.requestSubmit(),
 *   });
 *
 *   // In your JSX:
 *   return <div>...{confirmDialog}</div>;
 */
export function useConfirm() {
  const [dialog, setDialog] = useState<{
    message: string;
    confirmLabel: string;
    destructive: boolean;
    onConfirm: () => void;
  } | null>(null);

  function requestConfirm({
    message,
    confirmLabel = "Delete",
    destructive = true,
    onConfirm,
  }: {
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }) {
    setDialog({ message, confirmLabel, destructive, onConfirm });
  }

  // Render the dialog (or null when nothing is pending)
  const confirmDialog = dialog ? (
    <ConfirmDialog
      open={true}
      message={dialog.message}
      confirmLabel={dialog.confirmLabel}
      destructive={dialog.destructive}
      onConfirm={() => {
        dialog.onConfirm();
        setDialog(null);
      }}
      onCancel={() => setDialog(null)}
    />
  ) : null;

  return { requestConfirm, confirmDialog };
}
