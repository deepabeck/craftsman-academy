"use client";

import { useEffect, useRef, useState } from "react";
import { saveBgColor, saveStudentColor } from "@/app/actions/customize";
import { HexPicker, PageHeader } from "@/components/ui";
import { rgba } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

interface Props {
  initialColor: string;
  initialBgColor: string;
  studentKey: string;
  displayName: string;
}

export function CustomizeClient({ initialColor, initialBgColor, studentKey, displayName }: Props) {
  const { setUserColor } = useAuth();
  const { setBgColor } = useTheme();
  const [color, setColor] = useState(initialColor);
  const [bgColor, setBgColorLocal] = useState(initialBgColor);
  const [colorSaved, setColorSaved] = useState(false);
  const [bgSaved, setBgSaved] = useState(false);
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync ThemeProvider with saved bg_color on mount so every page shows correct color
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount
  useEffect(() => {
    setBgColor(initialBgColor);
  }, []);

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setUserColor(newColor); // live update sidebar immediately
    setColorSaved(false);
    if (colorTimer.current) clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(async () => {
      const result = await saveStudentColor(newColor);
      if (!result.error) {
        setColorSaved(true);
        setTimeout(() => setColorSaved(false), 2500);
      }
    }, 600);
  };

  const handleBgColorChange = (newBg: string) => {
    setBgColorLocal(newBg);
    setBgColor(newBg); // live preview via ThemeProvider
    setBgSaved(false);
    if (bgTimer.current) clearTimeout(bgTimer.current);
    bgTimer.current = setTimeout(async () => {
      await saveBgColor(newBg);
      setBgSaved(true);
      setTimeout(() => setBgSaved(false), 2500);
    }, 600);
  };

  const avatarSrc = `/assets/profile-${studentKey}.png`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="customize" title="Customize" sub="Make it yours" color={color} />

      {/* Accent color */}
      <div className="glass-warm" style={{ padding: 22, borderColor: rgba(color, 0.3) }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.1em" }}>
            YOUR SIGNATURE COLOR
          </div>
          {colorSaved && <span style={{ fontSize: 12, color: "#70E090", fontWeight: 600 }}>✓ Saved</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            {/* biome-ignore lint/performance/noImgElement: local asset */}
            <img
              src={avatarSrc}
              alt={displayName}
              style={{
                width: 70,
                height: "auto",
                borderRadius: 6,
                border: `2px solid ${rgba(color, 0.6)}`,
                display: "block",
              }}
            />
            <div
              className="cinzel"
              style={{ fontSize: 11, color, letterSpacing: "0.1em", marginTop: 6, fontWeight: 700 }}
            >
              {displayName.toUpperCase()}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "#9AABBC", marginBottom: 12, lineHeight: 1.6 }}>
              This color appears on your dashboard, progress bars, and cards.
            </div>
            <HexPicker value={color} onChange={handleColorChange} />
          </div>
        </div>
      </div>

      {/* Background color */}
      <div className="glass-warm" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.1em" }}>
            WORLD BACKGROUND COLOR
          </div>
          {bgSaved && <span style={{ fontSize: 12, color: "#70E090", fontWeight: 600 }}>✓ Saved</span>}
        </div>
        <div style={{ fontSize: 13, color: "#9AABBC", marginBottom: 14, lineHeight: 1.6 }}>
          Tint the Academy&apos;s atmosphere. The steampunk details stay fixed — only the ambient color shifts.
        </div>
        <HexPicker value={bgColor} onChange={handleBgColorChange} label="Hue Tint" />
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 7,
            background: "rgba(0,0,0,0.28)",
            fontSize: 13,
            color: "#404858",
            lineHeight: 1.6,
          }}
        >
          Try deep blues (#1A3A5C), forest greens (#1A3A28), or warm ambers (#3A2010) for different moods.
        </div>
      </div>
    </div>
  );
}
