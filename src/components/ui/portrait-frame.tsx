"use client";

import { useRef } from "react";

interface PortraitFrameProps {
  src: string;
  name: string;
  onUpload?: (url: string) => void;
}

export function PortraitFrame({ src, name, onUpload }: PortraitFrameProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    /*
     * Strategy: the frame <img> sits in NORMAL FLOW so it establishes the
     * container height from its intrinsic 1024×1536 aspect ratio.  The photo
     * is then position:absolute behind the frame, clipped to the transparent
     * window area.  This is more reliable than CSS `aspect-ratio` for
     * percentage-based absolute children.
     *
     * Frame window bounds (measured from goldframe_profile.png alpha channel):
     *   top  = 18.2%   left  = 11.7%
     *   width = 74.2%  height = 64.5%
     */
    <div style={{ position: "relative", flexShrink: 0, lineHeight: 0, width: "78%", margin: "0 auto" }}>
      {/* Photo clipped to the frame window — rendered BEFORE the frame so it
          sits behind the opaque frame borders */}
      <div
        style={{
          position: "absolute",
          top: "18.2%",
          left: "11.7%",
          width: "74.2%",
          height: "64.5%",
          overflow: "hidden",
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

      {/* Frame in normal flow — sets container height and renders on top of
          the photo.  Transparent window reveals the photo; opaque borders
          cover the edges, chain, and ornaments. */}
      {/* biome-ignore lint/performance/noImgElement: static frame asset */}
      <img
        src="/assets/goldframe_profile.png"
        alt=""
        aria-hidden="true"
        style={{
          position: "relative",
          width: "100%",
          display: "block",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

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
          {/* Hover target over the photo window only */}
          <div
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            role="button"
            tabIndex={0}
            style={{
              position: "absolute",
              top: "18.2%",
              left: "11.7%",
              width: "74.2%",
              height: "64.5%",
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
