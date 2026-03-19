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

export function SubjectModal({ subject, onSave, onClose }: SubjectModalProps) {
  const isNew = !subject;
  const [form, setForm] = useState<Subject>(
    subject ?? {
      id: `subj_${Date.now()}`,
      name: "",
      icon: "subjects",
      color: "#4A90D0",
      days: ["Mon", "Wed", "Fri"],
      only: null,
      detail: "",
    },
  );

  const toggleDay = (day: string) => {
    setForm((p) => ({
      ...p,
      days: p.days.includes(day) ? p.days.filter((d) => d !== day) : [...p.days, day],
    }));
  };

  const save = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <div className="modal-bg" onClick={onClose} onKeyDown={() => {}}>
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
        className="glass-warm"
        style={{ width: "100%", maxWidth: 520, padding: 26, position: "relative" }}
      >
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <Rivet />
        </div>
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <Rivet />
        </div>
        <div style={{ position: "absolute", bottom: 8, left: 8 }}>
          <Rivet />
        </div>
        <div style={{ position: "absolute", bottom: 8, right: 8 }}>
          <Rivet />
        </div>

        <div className="cinzel brass" style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>
          {isNew ? "Add New Subject" : "Edit Subject"}
        </div>

        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: "#506070",
              marginBottom: 5,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Subject Name
          </div>
          <input
            className="inp"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Mathematics, Art, History..."
          />
        </div>

        {/* Icon + Color row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#506070",
                marginBottom: 5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Icon
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ICON_OPTIONS.map((ic) => (
                <div
                  key={ic}
                  onClick={() => setForm((p) => ({ ...p, icon: ic }))}
                  onKeyDown={(e) => e.key === "Enter" && setForm((p) => ({ ...p, icon: ic }))}
                  role="button"
                  tabIndex={0}
                  style={{
                    padding: 5,
                    borderRadius: 6,
                    cursor: "pointer",
                    border: `1px solid ${form.icon === ic ? "rgba(184,134,11,0.8)" : "rgba(255,255,255,0.1)"}`,
                    background: form.icon === ic ? "rgba(184,134,11,0.18)" : "transparent",
                  }}
                >
                  <Icon name={ic} size={24} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#506070",
                marginBottom: 5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Color
            </div>
            <HexPicker value={form.color} onChange={(c) => setForm((p) => ({ ...p, color: c }))} />
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#506070",
                  marginBottom: 5,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Assigned To
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    { v: null, l: "Both" },
                    { v: "deven", l: "Deven Only" },
                    { v: "shaan", l: "Shaan Only" },
                  ] as const
                ).map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, only: o.v }))}
                    className={form.only === o.v ? "btn-brass" : "btn-ghost"}
                    style={{ padding: "5px 10px", fontSize: 11 }}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Days */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: "#506070",
              marginBottom: 7,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Schedule Days
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={form.days.includes(d) ? "btn-brass" : "btn-ghost"}
                style={{ padding: "6px 12px", fontSize: 12, fontWeight: 700 }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              color: "#506070",
              marginBottom: 5,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Default Assignment Instructions
          </div>
          <textarea
            className="inp"
            value={form.detail}
            onChange={(e) => setForm((p) => ({ ...p, detail: e.target.value }))}
            placeholder="What should the student do? This text appears on their task card."
            style={{ minHeight: 80, fontSize: 12, lineHeight: 1.6 }}
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
