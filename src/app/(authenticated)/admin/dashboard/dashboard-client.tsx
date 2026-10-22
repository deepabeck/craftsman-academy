"use client";

import Image from "next/image";
import { useState } from "react";
import { saveParentNote } from "@/app/actions/ai-notes";
import { Divider, Icon, PageHeader, ProgBar, StatusBadge } from "@/components/ui";
import { getTodayLabel, gradeLabel, rgba } from "@/lib/utils";

export interface SubjectTask {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: string;
  pct: number;
}

export interface SubjectMonth {
  id: string;
  name: string;
  icon: string;
  color: string;
  pct30: number;
  total30: number;
  done30: number;
  aiNote: string;
}

export interface StudentDashData {
  id: string;
  name: string;
  color: string;
  avatarUrl: string | null;
  currentGrade: number | null;
  tagline: string;
  studentKey: string;
  todayPct: number;
  todaySubjects: SubjectTask[];
  weekPct: number;
  monthSubjects: SubjectMonth[];
  cogsBalance: number;
  parentNote: string;
  weekStart: string;
}

function letterGrade(pct: number): string {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

function gradeColor(pct: number): string {
  if (pct >= 80) return "#70E090";
  if (pct >= 70) return "#D4A830";
  return "#F08080";
}

// ── Parent Note inline editor ─────────────────────────────────────────────────
function ParentNoteEditor({ student }: { student: StudentDashData }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(student.parentNote);
  const [saved, setSaved] = useState(student.parentNote);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await saveParentNote(student.id, student.weekStart, draft);
    setSaved(draft);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(saved);
    setEditing(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Icon name="parent-note" size={18} />
        <span style={{ fontSize: 12, color: "#506070", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Parent Note for the Week
        </span>
      </div>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <textarea
            className="inp"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your observation…"
            style={{ minHeight: 56, fontSize: 13 }}
          />
          <div style={{ display: "flex", gap: 7 }}>
            <button
              type="button"
              className="btn-brass"
              style={{ flex: 1, padding: "6px" }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ flex: 1, padding: "6px" }}
              onClick={handleCancel}
              disabled={saving}
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
            padding: "7px 11px",
            borderRadius: 7,
            border: "1px dashed rgba(184,134,11,0.32)",
            background: "rgba(0,0,0,0.2)",
            minHeight: 34,
            fontSize: 13,
            color: saved ? "#9AABBC" : "#404858",
          }}
        >
          {saved || "Click to add parent note\u2026"}
        </div>
      )}
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────
export function DashboardClient({ students }: { students: StudentDashData[] }) {
  const [activeId, setActiveId] = useState(students[0]?.id ?? "");
  const active = students.find((s) => s.id === activeId) ?? students[0];

  // Compute 30-day average across all subjects for the active student
  const avgPct30 =
    active && active.monthSubjects.length > 0
      ? Math.round(active.monthSubjects.reduce((sum, s) => sum + s.pct30, 0) / active.monthSubjects.length)
      : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="command-center" title="Command Center" sub={getTodayLabel()} />

      {/* ── Compact student selector cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {students.map((s) => (
          <div
            key={s.id}
            className="glass"
            onClick={() => setActiveId(s.id)}
            onKeyDown={(e) => e.key === "Enter" && setActiveId(s.id)}
            role="button"
            tabIndex={0}
            style={{
              padding: "11px 14px",
              cursor: "pointer",
              borderRadius: 10,
              background: activeId === s.id ? rgba(s.color, 0.28) : undefined,
              transition: "all 0.2s",
              borderColor: rgba(s.color, activeId === s.id ? 0.65 : 0.2),
              boxShadow: activeId === s.id ? `0 0 24px ${rgba(s.color, 0.32)}` : "none",
            }}
          >
            {/* Top row: avatar · name/grade · today% · week% */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* biome-ignore lint/performance/noImgElement: dynamic Supabase signed URL */}
              <img
                src={s.avatarUrl ?? `/assets/profile-${s.studentKey}-framed.png`}
                alt={s.name}
                style={{
                  width: 36,
                  height: "auto",
                  borderRadius: 4,
                  border: `2px solid ${rgba(s.color, 0.55)}`,
                  flexShrink: 0,
                }}
              />
              {/* Name + grade — auto width, no flex */}
              <div style={{ minWidth: 0 }}>
                <div
                  className="cinzel"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: s.color,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textShadow: "0 1px 6px rgba(0,0,0,0.8)",
                  }}
                >
                  {s.name}
                </div>
                <div style={{ fontSize: 11, color: "#8090A0" }}>{gradeLabel(s.currentGrade)}</div>
              </div>

              {/* Cogs — centered in the remaining space between name and percentages */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                }}
              >
                <Image
                  src="/assets/icon_coin.png"
                  alt="cogs"
                  width={22}
                  height={22}
                  style={{
                    display: "block",
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.9)) drop-shadow(0 0 8px rgba(232,168,32,0.5))",
                  }}
                />
                <span
                  className="cinzel"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#E8A820",
                    letterSpacing: "0.02em",
                    textShadow: "0 1px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.8)",
                  }}
                >
                  {s.cogsBalance.toLocaleString()}
                </span>
                <span
                  className="cinzel"
                  style={{
                    fontSize: 11,
                    color: "#C8860A",
                    letterSpacing: "0.1em",
                    textShadow: "0 1px 5px rgba(0,0,0,0.9)",
                  }}
                >
                  COGS
                </span>
              </div>
              {/* Today % and Week % */}
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.todayPct}%</div>
                  <div style={{ fontSize: 10, color: "#506070", letterSpacing: "0.04em" }}>today</div>
                </div>
                <div style={{ width: 1, background: "rgba(255,255,255,0.08)", alignSelf: "stretch" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color, opacity: 0.7, lineHeight: 1 }}>
                    {s.weekPct}%
                  </div>
                  <div style={{ fontSize: 10, color: "#506070", letterSpacing: "0.04em" }}>week</div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <ProgBar value={s.todayPct} color={s.color} style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>

      {/* ── Detail panel ── */}
      {active && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
          {/* LEFT COLUMN — Right Now */}
          <div
            className="glass"
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              borderColor: rgba(active.color, 0.28),
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="active-subjects" size={28} />
              <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.08em" }}>
                RIGHT NOW — {active.name.toUpperCase()}
              </div>
            </div>

            {/* Today progress */}
            <div>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}
              >
                <span style={{ fontSize: 12, color: "#7090A8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Today
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: active.color }}>{active.todayPct}%</span>
              </div>
              <ProgBar value={active.todayPct} color={active.color} />
            </div>

            {/* Week progress */}
            <div>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}
              >
                <span style={{ fontSize: 12, color: "#7090A8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  This Week
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: active.color, opacity: 0.75 }}>
                  {active.weekPct}%
                </span>
              </div>
              <ProgBar value={active.weekPct} color={active.color} />
            </div>

            {/* 30-Day Average with letter grade */}
            {active.monthSubjects.length > 0 && (
              <div>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}
                >
                  <span style={{ fontSize: 12, color: "#7090A8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    30-Day Avg
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: gradeColor(avgPct30),
                        letterSpacing: "0.04em",
                        background: `${gradeColor(avgPct30)}18`,
                        border: `1px solid ${gradeColor(avgPct30)}55`,
                        borderRadius: 5,
                        padding: "1px 7px",
                        lineHeight: 1.5,
                      }}
                    >
                      {letterGrade(avgPct30)}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: gradeColor(avgPct30) }}>{avgPct30}%</span>
                  </div>
                </div>
                <ProgBar value={avgPct30} color={gradeColor(avgPct30)} />
              </div>
            )}

            <Divider />

            {/* Today's task list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#506070",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Today's Tasks
              </div>
              {active.todaySubjects.length === 0 ? (
                <div style={{ fontSize: 13, color: "#506070", padding: "12px 0", textAlign: "center" }}>
                  No tasks scheduled for today.
                </div>
              ) : (
                active.todaySubjects.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "7px 10px",
                      borderRadius: 8,
                      background: "rgba(0,0,0,0.2)",
                      border: `1px solid ${rgba(sub.color, 0.2)}`,
                    }}
                  >
                    <Icon name={sub.icon} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#EEE4CC",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {sub.name}
                      </div>
                    </div>
                    <StatusBadge status={sub.status as "done" | "pending" | "review" | "missed" | "approved"} />
                  </div>
                ))
              )}
            </div>

            <Divider />

            {/* Parent note for the week */}
            <ParentNoteEditor key={active.id} student={active} />
          </div>

          {/* RIGHT COLUMN — 30-day subject overview */}
          <div
            className="glass"
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              borderColor: rgba(active.color, 0.25),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="progress" size={28} />
              <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.08em" }}>
                30-DAY OVERVIEW
              </div>
            </div>

            {active.monthSubjects.length === 0 ? (
              <div style={{ fontSize: 13, color: "#506070", padding: "12px 0", textAlign: "center" }}>
                No task data for the last 30 days.
              </div>
            ) : (
              active.monthSubjects.map((sub) => (
                <div key={sub.id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name={sub.icon} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#EEE4CC", fontWeight: 500 }}>{sub.name}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: sub.color, flexShrink: 0, marginLeft: 8 }}>
                          {sub.pct30}%
                        </span>
                      </div>
                      <ProgBar value={sub.pct30} color={sub.color} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#5C7080", fontStyle: "italic", paddingLeft: 36 }}>
                    {sub.aiNote}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
