"use client";

import { COLOR_PRESETS } from "@/lib/constants";

interface HexPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function HexPicker({ value, onChange, label }: HexPickerProps) {
  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 13,
            color: "#506070",
            marginBottom: 6,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {COLOR_PRESETS.map((c) => (
          <div
            key={c}
            className={`swatch${value === c ? " active" : ""}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            onKeyDown={(e) => e.key === "Enter" && onChange(c)}
            role="button"
            tabIndex={0}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 24,
            height: 24,
            padding: 2,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "transparent",
            cursor: "pointer",
          }}
        />
        <span style={{ fontSize: 13, color: "#506070", fontFamily: "monospace" }}>{value}</span>
      </div>
    </div>
  );
}
