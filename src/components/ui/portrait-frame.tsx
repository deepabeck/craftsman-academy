"use client";

import { useRef } from "react";

interface PortraitFrameProps {
  src: string;
  name: string;
  onUpload?: (url: string) => void;
}

/** Thickness of the black frame around the photo, in px. */
const FRAME_PX = 7;

/**
 * Profile photo in a simple black frame. The photo area is a fixed 3:4 box, which
 * is also the shape the photo cropper produces, so uploads fit with no gaps.
 */
export function PortraitFrame({ src, name, onUpload }: PortraitFrameProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        lineHeight: 0,
        width: "78%",
        margin: "0 auto",
        boxSizing: "border-box",
        padding: FRAME_PX,
        background: "#0a0a0c",
        borderRadius: 3,
        boxShadow: "0 6px 20px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "3 / 4",
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: dynamic avatar URL */}
        <img
          src={src}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            display: "block",
          }}
          onError={(e) => {
            e.currentTarget.src = "/assets/icon-profile.png";
          }}
        />
      </div>

      {onUpload && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(URL.createObjectURL(f));
            }}
          />
          {/* Hover target over the photo only */}
          <div
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            role="button"
            tabIndex={0}
            style={{
              position: "absolute",
              inset: FRAME_PX,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0)",
              cursor: "pointer",
              transition: "background 0.2s",
              fontSize: 13,
              color: "transparent",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.55)";
              e.currentTarget.style.color = "#E8C870";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0)";
              e.currentTarget.style.color = "transparent";
            }}
          >
            Change Photo
          </div>
        </>
      )}
    </div>
  );
}
