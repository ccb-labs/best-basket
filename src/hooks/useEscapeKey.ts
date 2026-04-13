/**
 * Calls the given callback when the user presses the Escape key.
 * Used by dialog components (ConfirmDialog, AddToListsDialog) to
 * close on Escape — extracted here so the logic isn't duplicated.
 */
import { useEffect } from "react";

export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onEscape]);
}
