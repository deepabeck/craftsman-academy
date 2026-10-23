"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface ThemeContextType {
  bgColor: string;
  setBgColor: (color: string) => void;
  /** Id of the unlockable background art currently shown (null = none). */
  background: string | null;
  setBackground: (id: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [bgColor, setBgColorState] = useState("#1A3A5C");

  const [background, setBackgroundState] = useState<string | null>(null);

  const setBgColor = useCallback((color: string) => {
    setBgColorState(color);
  }, []);

  const setBackground = useCallback((id: string | null) => {
    setBackgroundState(id);
  }, []);

  const value = useMemo(
    () => ({ bgColor, setBgColor, background, setBackground }),
    [bgColor, setBgColor, background, setBackground],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
