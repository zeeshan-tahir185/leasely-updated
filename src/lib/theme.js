import { createContext, useContext } from "react";

export const THEME_KEY = "leasely:theme";

export const ThemeContext = createContext({ theme: "light", toggle: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return "light"; // brand default — light-first "well-kept ledger"
}
