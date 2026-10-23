"use client";

import { backgroundThumbUrl, getBackground } from "@/lib/backgrounds";

interface BackgroundRevealModalProps {
  /** Newly unlocked background id (the first not-yet-revealed one). */
  backgroundId: string;
  /** How many more are waiting after this one. */
  remaining: number;
  bgColor: string;
  onUse: () => void;
  onKeep: () => void;
}

export function BackgroundRevealModal({ backgroundId, remaining, bgColor, onUse, onKeep }: BackgroundRevealModalProps) {
  const bg = getBackground(backgroundId);
  if (!bg) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 8000,
        padding: 20,
      }}
    >
      <style>
        {
          "@keyframes bgRevealPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.05);opacity:1}100%{transform:scale(1)}}"
        }
      </style>
      <div
        className="glass-warm"
        style={{ padding: 26, width: 420, maxWidth: "100%", textAlign: "center", borderColor: "rgba(232,168,32,0.5)" }}
      >
        <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.14em", marginBottom: 6 }}>
          NEW BACKGROUND UNLOCKED
        </div>
        <div style={{ fontSize: 13, color: "#9AABBC", marginBottom: 16, lineHeight: 1.5 }}>
          You closed out the whole week. Here&apos;s your mystery background!
        </div>
        <div
          style={{
            aspectRatio: "3 / 2",
            borderRadius: 8,
            overflow: "hidden",
            background: bgColor,
            border: "2px solid #E8A820",
            animation: "bgRevealPop 0.7s ease-out",
          }}
        >
          {/* biome-ignore lint/performance/noImgElement: small local thumbnail */}
          <img
            src={backgroundThumbUrl(bg.id)}
            alt={bg.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div
          className="cinzel"
          style={{ fontSize: 18, color: "#E8C870", margin: "14px 0 4px", letterSpacing: "0.06em" }}
        >
          {bg.name}
        </div>
        {remaining > 0 && <div style={{ fontSize: 12, color: "#9AABBC" }}>{remaining} more waiting to be revealed</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
          <button type="button" className="btn-ghost" style={{ padding: "8px 18px", fontSize: 13 }} onClick={onKeep}>
            Keep my current look
          </button>
          <button type="button" className="btn-brass" style={{ padding: "8px 18px", fontSize: 13 }} onClick={onUse}>
            Use it now
          </button>
        </div>
      </div>
    </div>
  );
}
