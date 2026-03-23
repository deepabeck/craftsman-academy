"use client";

import { useState } from "react";
import { saveParentNote } from "@/app/actions/ai-notes";
import { Divider, Icon, PageHeader, ProgBar, StatusBadge } from "@/components/ui";
import { getTodayLabel, gradeLabel, rgba } from "@/lib/utils";

export interface AiTag {
  l: string;
  t: "auto" | "alert" | "manual";
}

export interface SubjectTask {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: string;
  pct: number;
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
  aiSummary: string;
  aiTags: AiTag[];
  parentNote: string;
  weekStart: string;
}

function AISummaryPanel({ student }: { student: StudentDashData }) {
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
    <div
      className="glass"
      style={{
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderColor: rgba(student.color, 0.32),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="ai-obs" size={36} />
        <div style={{ flex: 1 }}>
          <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.08em" }}>
            AI DISPATCH
          </div>
          <div style={{ fontSize: 13, color: "#506070" }}>{student.name} &middot; Weekly Summary</div>
        </div>
        {/* biome-ignore lint/performance/noImgElement: dynamic Supabase signed URL */}
        <img
          src={student.avatarUrl ?? `/assets/profile-${student.studentKey}-framed.png`}
          alt={student.name}
          style={{ width: 40, height: "auto", borderRadius: 5, border: `2px solid ${rgba(student.color, 0.5)}` }}
        />
      </div>
      <Divider />
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.75,
          color: "#9AABBC",
          padding: "10px 12px",
          background: "rgba(0,0,0,0.26)",
          borderRadius: 8,
          borderLeft: `3px solid ${rgba(student.color, 0.65)}`,
        }}
      >
        &ldquo;{student.aiSummary}&rdquo;
      </div>
      {student.aiTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {student.aiTags.map((tag) => (
            <span
              key={tag.l}
              style={{
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                background:
                  tag.t === "auto"
                    ? "rgba(74,144,208,0.16)"
                    : tag.t === "alert"
                      ? "rgba(180,60,40,0.16)"
                      : "rgba(184,134,11,0.13)",
                color: tag.t === "auto" ? "#7ABFDF" : tag.t === "alert" ? "#F09080" : "#D4A830",
                border: `1px solid ${tag.t === "auto" ? "rgba(74,144,208,0.38)" : tag.t === "alert" ? "rgba(200,80,60,0.38)" : "rgba(184,134,11,0.32)"}`,
              }}
            >
              {tag.l}
            </span>
          ))}
        </div>
      )}
      <div style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
          <Icon name="parent-note" size={18} />
          <span style={{ fontSize: 13, color: "#506070", letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
              style={{ minHeight: 60, fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 7 }}>
              <button
                type="button"
                className="btn-brass"
                style={{ flex: 1, padding: "7px" }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ flex: 1, padding: "7px" }}
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
              padding: "8px 12px",
              borderRadius: 7,
              border: "1px dashed rgba(184,134,11,0.32)",
              background: "rgba(0,0,0,0.2)",
              minHeight: 36,
              fontSize: 13,
              color: saved ? "#9AABBC" : "#404858",
            }}
          >
            {saved || "Click to add parent note\u2026"}
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardClient({ students }: { students: StudentDashData[] }) {
  const [activeId, setActiveId] = useState(students[0]?.id ?? "");
  const active = students.find((s) => s.id === activeId) ?? students[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="command-center" title="Command Center" sub={getTodayLabel()} />

      {/* Student selector cards */}
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
              padding: 16,
              cursor: "pointer",
              borderRadius: 10,
              background: activeId === s.id ? rgba(s.color, 0.32) : undefined,
              transition: "all 0.2s",
              borderColor: rgba(s.color, activeId === s.id ? 0.65 : 0.2),
              boxShadow: activeId === s.id ? `0 0 28px ${rgba(s.color, 0.35)}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              {/* biome-ignore lint/performance/noImgElement: dynamic Supabase signed URL */}
              <img
                src={s.avatarUrl ?? `/assets/profile-${s.studentKey}-framed.png`}
                alt={s.name}
                style={{ width: 44, height: "auto", borderRadius: 5, border: `2px solid ${rgba(s.color, 0.55)}` }}
              />
              <div style={{ flex: 1 }}>
                <div className="cinzel" style={{ fontSize: 15, fontWeight: 700, color: s.color }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 13, color: "#EEE4CC" }}>{gradeLabel(s.currentGrade)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.todayPct}%</div>
                <div style={{ fontSize: 13, color: "#506070" }}>today</div>
              </div>
            </div>
            <ProgBar value={s.todayPct} color={s.color} />
          </div>
        ))}
      </div>

      {active && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <AISummaryPanel student={active} />
          <div className="glass" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Icon name="active-subjects" size={30} />
              <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.07em" }}>
                TODAY &mdash; {active.name.toUpperCase()}
              </div>
            </div>
            {active.todaySubjects.length === 0 ? (
              <div style={{ fontSize: 13, color: "#506070", padding: "20px 0", textAlign: "center" }}>
                No tasks scheduled for today.
              </div>
            ) : (
              active.todaySubjects.map((sub) => (
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
                    <div style={{ fontSize: 14, color: "#EEE4CC", fontWeight: 500 }}>{sub.name}</div>
                    <ProgBar value={sub.pct} color={sub.color} style={{ marginTop: 4 }} />
                  </div>
                  <StatusBadge status={sub.status as "done" | "pending" | "review" | "missed" | "approved"} />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
