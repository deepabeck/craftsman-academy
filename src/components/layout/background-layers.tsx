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
        // Unlockable background art: transparent PNG-style artwork hugging the right edge.
        // Sits above the color tint and below the app (z 2 vs 10) so cards and text stay on top.
        <div
          id="bg-art"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background: `url("${backgroundUrl(art.id)}") right center / auto 100% no-repeat`,
          }}
        />
      )}
      <div id="bg-vign" />
    </>
  );
}
