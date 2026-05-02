import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "dark", setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem("cv_theme") || "dark";
    } catch (e) { return "dark"; }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try { localStorage.setItem("cv_theme", theme); } catch (e) {}
  }, [theme]);

  const setTheme = (t) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
