"use client";

import type { ReactNode } from "react";
import { BackgroundLayers } from "@/components/layout/background-layers";
import { ThemeInitializer } from "@/components/layout/theme-initializer";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";

function InnerLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <ThemeProvider>
      <ThemeInitializer userId={user?.id ?? null} />
      <BackgroundLayers />
      <div id="app">
        <div id="root" style={{ height: "100%", width: "100%" }}>
          {children}
        </div>
      </div>
    </ThemeProvider>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <InnerLayout>{children}</InnerLayout>
    </AuthProvider>
  );
}
