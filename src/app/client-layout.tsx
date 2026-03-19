"use client";

import type { ReactNode } from "react";
import { BackgroundLayers } from "@/components/layout/background-layers";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BackgroundLayers />
        <div id="app">
          <div id="root" style={{ height: "100%", width: "100%" }}>
            {children}
          </div>
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
