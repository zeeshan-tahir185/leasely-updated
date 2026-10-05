import { useState, useEffect, useLayoutEffect } from "react";
import { ThemeContext, THEME_KEY, getInitialTheme } from "../lib/theme";

/**
 * App-wide light/dark theme. Applies `data-theme` to <html> and persists the
 * choice. Wraps the whole app (public site + authenticated shell) so the
 * preference carries across the login boundary. Print documents force
 * themselves back to light paper regardless of this (see .doc in app.css).
 */
export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  function toggle() {
    // Brief cross-fade on the switch, unless the visitor prefers reduced motion.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      const el = document.documentElement;
      el.classList.add("theme-anim");
      window.setTimeout(() => el.classList.remove("theme-anim"), 340);
    }
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
