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
 * Grid of every background in the catalog. Everything is visible so kids can see
 * what's in the collection; unlocked ones can be picked, locked ones are shown
 * slightly dimmed with a padlock. Which one unlocks next stays a surprise.
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
        className="cinzel brass"
        style={{
          ...tileBase,
          alignSelf: "start",
          border: selectedId === null ? "2px solid #E8A820" : "2px solid rgba(255,255,255,0.12)",
          background: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
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
              aria-label={unlocked ? `Use ${b.name}` : `${b.name} (locked)`}
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
                  // Locked: full picture, just a little dimmer than the unlocked ones.
                  ...(unlocked ? {} : { filter: "brightness(0.62) saturate(0.8)" }),
                }}
              />
              {!unlocked && (
                <div
                  style={{
                    position: "absolute",
                    right: 6,
                    bottom: 6,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: "1.5px solid rgba(232, 168, 32, 0.75)",
                    background: "rgba(8, 5, 3, 0.65)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="#E8A820"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>
              )}
            </button>
            <div
              className="cinzel"
              style={{
                fontSize: 11,
                textAlign: "center",
                color: unlocked ? "#C8B080" : "#7F8FA3",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {b.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
