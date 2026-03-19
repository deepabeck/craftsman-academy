"use client";

import { useTheme } from "@/providers/theme-provider";

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
      <div id="bg-gears" />
      <div id="bg-vign" />
    </>
  );
}
