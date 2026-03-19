"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface ThemeContextType {
  bgColor: string;
  setBgColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [bgColor, setBgColorState] = useState("#1A3A5C");

  const setBgColor = useCallback((color: string) => {
    setBgColorState(color);
  }, []);

  const value = useMemo(() => ({ bgColor, setBgColor }), [bgColor, setBgColor]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
