"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/providers/theme-provider";

/**
 * Runs once after login and loads the user's saved bg_color and background art from
 * user_settings into the ThemeProvider so the background is correct on every page,
 * not just after visiting Customize.
 */
export function ThemeInitializer({ userId }: { userId: string | null }) {
  const { setBgColor, setBackground } = useTheme();

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run when userId changes
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .select("bg_color, background")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data?.bg_color) setBgColor(data.bg_color);
        setBackground(data?.background ?? null);
      });
  }, [userId]);

  return null;
}
