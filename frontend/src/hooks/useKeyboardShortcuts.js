import { useEffect } from "react";

/**
 * Global keyboard shortcuts hook.
 * Pass a map of { key: handler }. Ignores keys when a typing element is focused.
 */
export default function useKeyboardShortcuts(map) {
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || "";
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || e.target?.isContentEditable;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Allow `/` to focus search even while typing in body, but not while typing
      if (isTyping && e.key !== "Escape") return;
      const handler = map[e.key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [map]);
}
