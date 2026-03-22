"use client";

import { useState } from "react";
import { HexPicker, Icon, Rivet } from "@/components/ui";
import { ICON_OPTIONS, WEEKDAYS } from "@/lib/constants";
import type { Subject } from "@/lib/types";

interface SubjectModalProps {
  subject: Subject | null;
  onSave: (subject: Subject) => void;
  onClose: () => void;
}

const PROOF_TYPES = [
  { value: "checkbox", label: "Checkbox", emoji: "✓" },
  { value: "photo", label: "Photo", emoji: "📷" },
  { value: "timer", label: "Timer", emoji: "⏱" },
  { value: "text", label: "Written", emoji: "✍" },
  { value: "audio", label: "Audio", emoji: "🎙" },
  { value: "video", label: "Video", emoji: "🎬" },
  { value: "file", label: "File", emoji: "📎" },
];

const CATEGORIES = ["Core Academic", "Elective", "Enrichment", "Physical", "Life Skills"] as const;

const labelStyle = {
  fontSize: 13,
  color: "#506070",
  marginBottom: 5,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

export function SubjectModal({ subject, onSave, onClose }: SubjectModalProps) {
  const isNew = !subject;
  const [form, setForm] = useState<Subject>(
    subject ?? {
      id: `new-${Date.now()}`,
      name: "",
      icon: "subjects",
      color: "#4A90D0",
      days: ["Mon", "Wed", "Fri"],
      only: null,
      detail: "",
      active: true,
      category: "Core Academic",
      proofTypes: ["checkbox"],
      requiresReview: false,
      duration: 45,
      externalPlatform: null,
    },
  );

  const toggleDay = (day: string) => {
    setForm((p) => ({
      ...p,
      days: p.days.includes(day) ? p.days.filter((d) => d !== day) : [...p.days, day],
    }));
  };

  const toggleProofType = (pt: string) => {
    setForm((p) => {
      const current = p.proofTypes ?? [];
      return {
        ...p,
        proofTypes: current.includes(pt) ? current.filter((t) => t !== pt) : [...current, pt],
      };
    });
  };

  const save = () => {
    if (!form.name.trim()) return;
    if ((form.proofTypes ?? []).length === 0) return;
    onSave(form);
  };

  return (
    <div className="modal-bg" onClick={onClose} onKeyDown={() => {}}>
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
        className="glass-warm"
        style={{
          width: "100%",
          maxWidth: 560,
          padding: 26,
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <Rivet />
        </div>
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <Rivet />
        </div>

        <div className="cinzel brass" style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>
          {isNew ? "Add New Subject" : "Edit Subject"}
        </div>

        {/* Name + Active toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 14, alignItems: "end" }}>
          <div>
            <div style={labelStyle}>Subject Name</div>
            <input
              className="inp"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Mathematics, Art, History..."
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Active</div>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, active: !p.active }))}
              style={{
                padding: "8px 14px",
                borderRadius: 7,
                border: `1px solid ${form.active ? "rgba(112,224,144,0.4)" : "rgba(255,255,255,0.12)"}`,
                background: form.active ? "rgba(112,224,144,0.12)" : "rgba(0,0,0,0.3)",
                color: form.active ? "#70E090" : "#506070",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {form.active ? "On" : "Off"}
            </button>
          </div>
        </div>

        {/* Category + Duration */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 14, alignItems: "end" }}>
          <div>
            <div style={labelStyle}>Category</div>
            <select
              className="inp"
              value={form.category ?? "Core Academic"}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              style={{ cursor: "pointer" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: 90 }}>
            <div style={labelStyle}>Duration (min)</div>
            <input
              className="inp"
              type="number"
              min={5}
              max={480}
              value={form.duration ?? 45}
              onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))}
              style={{ textAlign: "center" }}
            />
          </div>
        </div>

        {/* Icon + Color row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <div style={labelStyle}>Icon</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, icon: ic }))}
                  style={{
                    padding: 5,
                    borderRadius: 6,
                    cursor: "pointer",
                    border: `1px solid ${form.icon === ic ? "rgba(184,134,11,0.8)" : "rgba(255,255,255,0.1)"}`,
                    background: form.icon === ic ? "rgba(184,134,11,0.18)" : "transparent",
                  }}
                >
                  <Icon name={ic} size={24} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Color</div>
            <HexPicker value={form.color} onChange={(c) => setForm((p) => ({ ...p, color: c }))} />
            <div style={{ marginTop: 12 }}>
              <div style={labelStyle}>Assigned To</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    { v: null, l: "Both" },
                    { v: "deven", l: "Deven" },
                    { v: "shaan", l: "Shaan" },
                  ] as const
                ).map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, only: o.v }))}
                    className={form.only === o.v ? "btn-brass" : "btn-ghost"}
                    style={{ padding: "5px 10px", fontSize: 13 }}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Days */}
        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Schedule Days</div>
          <div style={{ display: "flex", gap: 8 }}>
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={form.days.includes(d) ? "btn-brass" : "btn-ghost"}
                style={{ padding: "6px 12px", fontSize: 13, fontWeight: 700 }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Proof Types */}
        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Proof Types (select all that apply)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {PROOF_TYPES.map((pt) => {
              const selected = (form.proofTypes ?? []).includes(pt.value);
              return (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => toggleProofType(pt.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 7,
                    border: `1px solid ${selected ? "rgba(232,168,32,0.6)" : "rgba(255,255,255,0.12)"}`,
                    background: selected ? "rgba(232,168,32,0.16)" : "rgba(0,0,0,0.3)",
                    color: selected ? "#E8A820" : "#7A8B9C",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span>{pt.emoji}</span>
                  <span>{pt.label}</span>
                </button>
              );
            })}
          </div>
          {(form.proofTypes ?? []).length === 0 && (
            <div style={{ fontSize: 13, color: "#F08080", marginTop: 5 }}>Select at least one proof type.</div>
          )}
        </div>

        {/* Requires Review + External Platform */}
        <div
          style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, marginBottom: 14, alignItems: "center" }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.requiresReview ?? false}
              onChange={(e) => setForm((p) => ({ ...p, requiresReview: e.target.checked }))}
              style={{ accentColor: "#B0A0F0", width: 15, height: 15 }}
            />
            <span style={{ fontSize: 13, color: "#B0A0F0" }}>Requires parent review</span>
          </label>
          <div>
            <div style={labelStyle}>External Platform (optional)</div>
            <input
              className="inp"
              value={form.externalPlatform ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, externalPlatform: e.target.value.trim() || null }))}
              placeholder="e.g. Skoove, Pickcode, Duolingo…"
            />
          </div>
        </div>

        {/* Default Assignment Instructions */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Default Assignment Instructions</div>
          <textarea
            className="inp"
            value={form.detail}
            onChange={(e) => setForm((p) => ({ ...p, detail: e.target.value }))}
            placeholder="What should the student do? This text appears on their task card."
            style={{ minHeight: 80, fontSize: 13, lineHeight: 1.6 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn-brass" style={{ flex: 1, padding: "11px" }} onClick={save}>
            {isNew ? "Add Subject" : "Save Changes"}
          </button>
          <button type="button" className="btn-ghost" style={{ padding: "11px 18px" }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
