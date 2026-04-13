/**
 * Prevents background scrolling while the component is mounted.
 * Used by dialog components to stop the page from scrolling
 * behind the dialog overlay.
 */
import { useEffect } from "react";

export function useScrollLock() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
}
