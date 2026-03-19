"use client";

import { useState } from "react";
import { Divider, Icon, PageHeader, ProgBar, StatusBadge } from "@/components/ui";
import { AI_NOTES_INIT, BASE_STUDENTS, SUBJECTS_ALL } from "@/lib/constants";
import type { AiNote, Student } from "@/lib/types";
import { getTodayDow, getTodayLabel, rgba } from "@/lib/utils";

function AISummaryPanel({
  sid,
  aiNotes,
  setAiNotes,
  students,
}: {
  sid: string;
  aiNotes: Record<string, AiNote>;
  setAiNotes: React.Dispatch<React.SetStateAction<Record<string, AiNote>>>;
  students: Record<string, Student>;
}) {
  const note = aiNotes[sid];
  const s = students[sid];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.parentNote);

  const save = () => {
    setAiNotes((p) => ({ ...p, [sid]: { ...p[sid], parentNote: draft } }));
    setEditing(false);
  };

  return (
    <div
      className="glass"
      style={{
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderColor: rgba(s.color, 0.32),
        background: rgba(s.color, 0.07),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="ai-obs" size={36} />
        <div style={{ flex: 1 }}>
          <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.08em" }}>
            AI DISPATCH
          </div>
          <div style={{ fontSize: 11, color: "#506070" }}>{s.name} &middot; Weekly Summary</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.avatar}
          alt={s.name}
          style={{ width: 40, height: "auto", borderRadius: 5, border: `2px solid ${rgba(s.color, 0.5)}` }}
        />
      </div>
      <Divider />
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.75,
          color: "#9AABBC",
          padding: "10px 12px",
          background: "rgba(0,0,0,0.26)",
          borderRadius: 8,
          borderLeft: `3px solid ${rgba(s.color, 0.65)}`,
        }}
      >
        &ldquo;{note.summary}&rdquo;
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {note.tags.map((t, _i) => (
          <span
            key={`tag-${t.l}`}
            style={{
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background:
                t.t === "auto"
                  ? "rgba(74,144,208,0.16)"
                  : t.t === "alert"
                    ? "rgba(180,60,40,0.16)"
                    : "rgba(184,134,11,0.13)",
              color: t.t === "auto" ? "#7ABFDF" : t.t === "alert" ? "#F09080" : "#D4A830",
              border: `1px solid ${t.t === "auto" ? "rgba(74,144,208,0.38)" : t.t === "alert" ? "rgba(200,80,60,0.38)" : "rgba(184,134,11,0.32)"}`,
            }}
          >
            {t.l}
          </span>
        ))}
      </div>
      <div style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
          <Icon name="parent-note" size={18} />
          <span style={{ fontSize: 10, color: "#506070", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Parent Note
          </span>
        </div>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <textarea
              className="inp"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Your observation..."
              style={{ minHeight: 60, fontSize: 12 }}
            />
            <div style={{ display: "flex", gap: 7 }}>
              <button type="button" className="btn-brass" style={{ flex: 1, padding: "7px" }} onClick={save}>
                Save
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ flex: 1, padding: "7px" }}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setEditing(true)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
            role="button"
            tabIndex={0}
            style={{
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: 7,
              border: "1px dashed rgba(184,134,11,0.32)",
              background: "rgba(0,0,0,0.2)",
              minHeight: 36,
              fontSize: 12,
              color: note.parentNote ? "#9AABBC" : "#404858",
            }}
          >
            {note.parentNote || "Click to add parent note\u2026"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [active, setActive] = useState("deven");
  const [aiNotes, setAiNotes] = useState(AI_NOTES_INIT);
  const todayDow = getTodayDow();

  // Build students with subjects
  const students: Record<string, Student> = {
    deven: { ...BASE_STUDENTS.deven, subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === "deven") },
    shaan: { ...BASE_STUDENTS.shaan, subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === "shaan") },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="command-center" title="Command Center" sub={getTodayLabel()} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {(["deven", "shaan"] as const).map((sid) => {
          const s = students[sid];
          const p = sid === "deven" ? 65 : 72; // Fixed values instead of Math.random()
          return (
            <div
              key={sid}
              onClick={() => setActive(sid)}
              onKeyDown={(e) => e.key === "Enter" && setActive(sid)}
              role="button"
              tabIndex={0}
              style={{
                padding: 16,
                cursor: "pointer",
                borderRadius: 10,
                background: rgba(s.color, active === sid ? 0.13 : 0.06),
                transition: "all 0.2s",
                border: `1px solid ${rgba(s.color, active === sid ? 0.42 : 0.2)}`,
                boxShadow: active === sid ? `0 0 22px ${rgba(s.color, 0.18)}` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.avatar}
                  alt={s.name}
                  style={{ width: 44, height: "auto", borderRadius: 5, border: `2px solid ${rgba(s.color, 0.55)}` }}
                />
                <div style={{ flex: 1 }}>
                  <div className="cinzel" style={{ fontSize: 15, fontWeight: 700, color: s.color }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#506070" }}>{s.grade}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{p}%</div>
                  <div style={{ fontSize: 10, color: "#506070" }}>today</div>
                </div>
              </div>
              <ProgBar value={p} color={s.color} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <AISummaryPanel sid={active} aiNotes={aiNotes} setAiNotes={setAiNotes} students={students} />
        <div className="glass" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="active-subjects" size={30} />
            <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.07em" }}>
              TODAY &mdash; {students[active].name.toUpperCase()}
            </div>
          </div>
          {students[active].subjects
            .filter((s) => s.days.includes(todayDow))
            .map((sub, idx) => {
              const progress = [80, 45, 100, 60, 90, 30, 75][idx % 7]; // Deterministic
              const status = progress >= 80 ? "done" : "pending";
              return (
                <div
                  key={sub.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 9,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.2)",
                    border: `1px solid ${rgba(sub.color, 0.22)}`,
                  }}
                >
                  <Icon name={sub.icon} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#EEE4CC", fontWeight: 500 }}>{sub.name}</div>
                    <ProgBar value={progress} color={sub.color} style={{ marginTop: 4 }} />
                  </div>
                  <StatusBadge status={status} />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
