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
                  // Locked: only a soft, blurred gray shape of the art shows through, never the details.
                  ...(unlocked
                    ? {}
                    : { filter: "grayscale(1) blur(7px) brightness(0.75) contrast(0.8)", opacity: 0.6 }),
                }}
              />
              {!unlocked && (
                <>
                  {/* translucent gray veil */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(150, 158, 170, 0.28)",
                      backdropFilter: "blur(2px)",
                      WebkitBackdropFilter: "blur(2px)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        border: "2px solid rgba(232, 168, 32, 0.75)",
                        background: "rgba(8, 5, 3, 0.55)",
                        backdropFilter: "blur(4px)",
                        WebkitBackdropFilter: "blur(4px)",
                        boxShadow: "0 0 10px rgba(232, 168, 32, 0.22), inset 0 0 0 1px rgba(232,168,32,0.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span className="cinzel brass" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                        ?
                      </span>
                    </div>
                  </div>
                </>
              )}
            </button>
            <div
              className="cinzel"
              style={{
                fontSize: 11,
                textAlign: "center",
                color: unlocked ? "#C8B080" : "#506070",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
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
