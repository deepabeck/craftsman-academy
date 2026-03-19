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
    <div style={{ position: "relative", flexShrink: 0, lineHeight: 0, width: "78%", margin: "0 auto" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} style={{ width: "100%", display: "block" }} />
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
          <div
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            role="button"
            tabIndex={0}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0)",
              cursor: "pointer",
              transition: "background 0.2s",
              fontSize: 11,
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
