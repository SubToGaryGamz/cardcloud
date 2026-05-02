import { useEffect, useState } from "react";

/**
 * Theme hook for unauthenticated public pages — respects the visitor's OS
 * preference (light vs dark) and updates live if they toggle.
 * Returns "dark" or "light".
 */
export default function usePublicTheme() {
  const getInitial = () => {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    } catch (_) { return "dark"; }
  };
  const [theme, setTheme] = useState(getInitial);

  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia("(prefers-color-scheme: light)");
      const handler = (e) => setTheme(e.matches ? "light" : "dark");
      if (mq.addEventListener) mq.addEventListener("change", handler);
      else mq.addListener(handler);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", handler);
        else mq.removeListener(handler);
      };
    } catch (_) { /* noop */ }
  }, []);

  // also keep the html class in sync so any global theme rules apply
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("light", theme === "light");
    html.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return theme;
}
