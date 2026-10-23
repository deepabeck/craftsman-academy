"use client";

import { BACKGROUNDS, backgroundThumbUrl } from "@/lib/backgrounds";

interface BackgroundPickerProps {
  ownedIds: string[];
  selectedId: string | null;
  /** The user's tint color, so transparent art previews the way it will look. */
  bgColor: string;
  onSelect: (id: string | null) => void;
}

const tileBase = {
  position: "relative" as const,
  aspectRatio: "3 / 2",
  borderRadius: 8,
  overflow: "hidden",
  padding: 0,
  cursor: "pointer",
  background: "none",
};

/**
 * Grid of every background in the catalog. Unlocked ones can be picked; locked
 * ones show as dark silhouettes with the name hidden, so what's left to unlock
 * stays a surprise.
 */
export function BackgroundPicker({ ownedIds, selectedId, bgColor, onSelect }: BackgroundPickerProps) {
  const owned = new Set(ownedIds);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
      {/* None */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selectedId === null}
        style={{
          ...tileBase,
          border: selectedId === null ? "2px solid #E8A820" : "2px solid rgba(255,255,255,0.12)",
          background: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9AABBC",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        No background
      </button>

      {BACKGROUNDS.map((b) => {
        const unlocked = owned.has(b.id);
        const selected = unlocked && selectedId === b.id;
        return (
          <div key={b.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              type="button"
              disabled={!unlocked}
              onClick={() => unlocked && onSelect(b.id)}
              aria-pressed={selected}
              aria-label={unlocked ? `Use ${b.name}` : "Locked background"}
              style={{
                ...tileBase,
                background: bgColor,
                cursor: unlocked ? "pointer" : "default",
                border: selected ? "2px solid #E8A820" : "2px solid rgba(255,255,255,0.12)",
                boxShadow: selected ? "0 0 12px rgba(232,168,32,0.45)" : "none",
              }}
            >
              {/* biome-ignore lint/performance/noImgElement: small local thumbnail */}
              <img
                src={backgroundThumbUrl(b.id)}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  // Locked art is flattened to a dark silhouette so it reads as "something's here".
                  filter: unlocked ? "none" : "grayscale(1) brightness(0.18) contrast(1.2)",
                  opacity: unlocked ? 1 : 0.9,
                }}
              />
              {!unlocked && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    color: "rgba(255,255,255,0.55)",
                    fontWeight: 700,
                  }}
                >
                  ?
                </div>
              )}
            </button>
            <div
              style={{
                fontSize: 12,
                textAlign: "center",
                color: unlocked ? "#C8B080" : "#506070",
                letterSpacing: "0.04em",
              }}
            >
              {unlocked ? b.name : "???"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
