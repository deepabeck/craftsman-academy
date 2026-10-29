"use client";

import { backgroundUrl, getBackground } from "@/lib/backgrounds";
import { useTheme } from "@/providers/theme-provider";

export function BackgroundLayers() {
  const { bgColor, background } = useTheme();
  const art = getBackground(background);

  return (
    <>
      <div
        id="bg-color"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          transition: "background 0.5s",
          background: bgColor,
        }}
      />
      {art && (
        // Unlockable background art: full-bleed 3:2 artwork covering the whole screen, with a light
        // dark scrim so page titles stay readable. Lives in the app shell, so it stays on screen
        // while pages load. Sits above the color tint and below the app (z 2 vs 10).
        <div
          id="bg-art"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background: `linear-gradient(rgba(6, 12, 24, 0.25), rgba(6, 12, 24, 0.25)), url("${backgroundUrl(art.id)}") center / cover no-repeat`,
          }}
        />
      )}
      <div id="bg-vign" />
    </>
  );
}
