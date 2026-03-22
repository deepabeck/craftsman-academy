"use client";

import { useTheme } from "@/providers/theme-provider";

const STEAM_WISPS = [
  { left: "4%", width: 340, duration: 9, delay: 0 },
  { left: "20%", width: 280, duration: 12, delay: 3 },
  { left: "38%", width: 380, duration: 10, delay: 2 },
  { left: "55%", width: 310, duration: 13, delay: 6 },
  { left: "70%", width: 360, duration: 10, delay: 4 },
  { left: "85%", width: 290, duration: 12, delay: 8 },
];

export function BackgroundLayers() {
  const { bgColor } = useTheme();

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
      <div id="bg-haze" />
      <div id="bg-steam">
        {STEAM_WISPS.map((w, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static decorative array, index is stable
            key={i}
            className="steam-wisp"
            style={{
              left: w.left,
              width: `${w.width}px`,
              animationDuration: `${w.duration}s`,
              animationDelay: `-${w.delay}s`,
            }}
          />
        ))}
      </div>
      <div id="bg-gears" />
      <div id="bg-vign" />
    </>
  );
}
