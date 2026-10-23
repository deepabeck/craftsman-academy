"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Crop window aspect ratio: the photo area inside the profile frame is a fixed 3:4 box
 * (see PortraitFrame), so what you crop here is exactly what shows in the frame.
 */
export const AVATAR_ASPECT = 3 / 4;

const VIEW_W = 300;
const VIEW_H = Math.round(VIEW_W / AVATAR_ASPECT);
const OUT_W = 900;
const OUT_H = Math.round(OUT_W / AVATAR_ASPECT);
const MAX_ZOOM = 4;

interface Props {
  file: File;
  onCancel: () => void;
  /** Receives the cropped JPEG, already sized for upload. */
  onConfirm: (cropped: File) => void;
}

export function AvatarCropperModal({ file, onCancel, onConfirm }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 }); // image-center offset from view center, px
  const [busy, setBusy] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => setImg(el);
    el.onerror = () => setLoadError(true);
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = img ? Math.max(VIEW_W / img.naturalWidth, VIEW_H / img.naturalHeight) : 1;
  const scale = baseScale * zoom;

  // Keep the image covering the whole crop window
  const clamp = useCallback(
    (o: { x: number; y: number }, s: number) => {
      if (!img) return o;
      const maxX = Math.max(0, (img.naturalWidth * s - VIEW_W) / 2);
      const maxY = Math.max(0, (img.naturalHeight * s - VIEW_H) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
    },
    [img],
  );

  const applyZoom = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoom(next);
    setOff((o) => clamp(o, baseScale * next));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      applyZoom(pinchStart.current.zoom * (dist / pinchStart.current.dist));
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setOff((o) => clamp({ x: o.x + dx, y: o.y + dy }, scale));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  };

  const handleSave = async () => {
    if (!img) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    // Crop window in source-image pixels
    const sw = VIEW_W / scale;
    const sh = VIEW_H / scale;
    const sx = img.naturalWidth / 2 - (VIEW_W / 2 + off.x) / scale + 0;
    const sy = img.naturalHeight / 2 - (VIEW_H / 2 + off.y) / scale + 0;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) return;
        onConfirm(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.88,
    );
  };

  const left = img ? VIEW_W / 2 + off.x - (img.naturalWidth * scale) / 2 : 0;
  const top = img ? VIEW_H / 2 + off.y - (img.naturalHeight * scale) / 2 : 0;

  return (
    <div className="modal-bg" onClick={onCancel} onKeyDown={() => {}}>
      <div
        className="glass-warm"
        style={{ padding: 22, width: VIEW_W + 44, maxWidth: "92vw", textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="cinzel brass" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Adjust Photo
        </div>
        <div style={{ fontSize: 12, color: "#9AABBC", marginBottom: 14 }}>
          Drag to reposition. Scroll or use the slider to zoom.
        </div>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          style={{
            position: "relative",
            width: VIEW_W,
            height: VIEW_H,
            maxWidth: "100%",
            margin: "0 auto",
            overflow: "hidden",
            borderRadius: 6,
            background: "#000",
            border: "1px solid rgba(232,168,32,0.4)",
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {loadError && (
            <div style={{ padding: 20, fontSize: 13, color: "#F08080" }}>
              This image couldn&apos;t be opened. Try a JPG or PNG.
            </div>
          )}
          {img && (
            // biome-ignore lint/performance/noImgElement: local blob preview
            <img
              src={img.src}
              alt="Crop preview"
              draggable={false}
              style={{
                position: "absolute",
                left,
                top,
                width: img.naturalWidth * scale,
                height: img.naturalHeight * scale,
                maxWidth: "none",
                pointerEvents: "none",
              }}
            />
          )}
          {/* rule-of-thirds guides */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "linear-gradient(to right, transparent 33.2%, rgba(255,255,255,0.25) 33.3%, transparent 33.5%, transparent 66.5%, rgba(255,255,255,0.25) 66.6%, transparent 66.8%), linear-gradient(to bottom, transparent 33.2%, rgba(255,255,255,0.25) 33.3%, transparent 33.5%, transparent 66.5%, rgba(255,255,255,0.25) 66.6%, transparent 66.8%)",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 4px 4px" }}>
          <span style={{ fontSize: 12, color: "#9AABBC" }}>−</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label="Zoom"
            style={{ flex: 1, accentColor: "#E8A820" }}
          />
          <span style={{ fontSize: 12, color: "#9AABBC" }}>+</span>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
          <button type="button" className="btn-ghost" style={{ padding: "8px 18px", fontSize: 13 }} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-brass"
            style={{ padding: "8px 18px", fontSize: 13 }}
            onClick={handleSave}
            disabled={!img || busy}
          >
            {busy ? "Saving…" : "Save Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
