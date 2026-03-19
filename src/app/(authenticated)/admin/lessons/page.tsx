"use client";

import { useState } from "react";
import { Divider, Icon, PageHeader } from "@/components/ui";
import { SUBJECTS_ALL, WEEKDAYS } from "@/lib/constants";
import type { Subject } from "@/lib/types";
import { getTodayDow, rgba } from "@/lib/utils";

export default function LessonsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(SUBJECTS_ALL);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const todayDow = getTodayDow();

  const startEdit = (sub: Subject) => {
    setEditing(sub.id);
    setDraft(sub.detail || "");
  };

  const save = (subId: string) => {
    setSubjects((p) => p.map((s) => (s.id === subId ? { ...s, detail: draft } : s)));
    setEditing(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader icon="schedule" title="Lesson Planner" sub="Set what each student sees on their task cards" />
      <div
        style={{
          fontSize: 12,
          color: "#8A9AAA",
          padding: "9px 14px",
          borderRadius: 7,
          background: "rgba(184,134,11,0.07)",
          border: "1px solid rgba(184,134,11,0.2)",
          lineHeight: 1.6,
        }}
      >
        Edit the assignment instructions below. Students see these when they tap to expand a task card. Changes take
        effect immediately on active task cards.
      </div>
      {/* Schedule matrix */}
      <div className="glass" style={{ padding: 18, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4, minWidth: 500, marginBottom: 8 }}>
          <div className="cinzel" style={{ fontSize: 11, color: "#E8A820", letterSpacing: "0.08em" }}>
            SUBJECT
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 58px)", gap: 4, textAlign: "center" }}>
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="cinzel"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: d === todayDow ? "#E8A820" : "#506070",
                  background: d === todayDow ? "rgba(184,134,11,0.12)" : "transparent",
                  borderRadius: 4,
                  padding: "3px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>
        </div>
        <Divider />
        {subjects.map((sub) => (
          <div
            key={sub.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 4,
              marginTop: 8,
              padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name={sub.icon} size={26} />
              <div>
                <div style={{ fontSize: 13, color: sub.color, fontWeight: 600 }}>{sub.name}</div>
                <div style={{ fontSize: 10, color: "#506070" }}>{sub.only ? `${sub.only} only` : "Both"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 58px)", gap: 4, textAlign: "center" }}>
              {WEEKDAYS.map((d) => (
                <div key={d} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sub.days.includes(d) ? (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: rgba(sub.color, 0.22),
                        border: `1px solid ${rgba(sub.color, 0.45)}`,
                      }}
                    >
                      <Icon name={sub.icon} size={20} />
                    </div>
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(0,0,0,0.2)" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Assignment instructions editing */}
      <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.1em", marginTop: 4 }}>
        ASSIGNMENT INSTRUCTIONS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {subjects.map((sub) => (
          <div key={sub.id} className="glass" style={{ padding: "14px 16px", borderColor: rgba(sub.color, 0.25) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Icon name={sub.icon} size={32} />
              <div className="cinzel" style={{ fontSize: 13, color: sub.color, flex: 1 }}>
                {sub.name}
              </div>
              {editing !== sub.id && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "5px 12px", fontSize: 12 }}
                  onClick={() => startEdit(sub)}
                >
                  Edit
                </button>
              )}
            </div>
            {editing === sub.id ? (
              <div>
                <textarea
                  className="inp"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  style={{ minHeight: 80, fontSize: 12, lineHeight: 1.6, marginBottom: 9 }}
                  placeholder="What should students do for this subject?"
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn-brass"
                    style={{ flex: 1, padding: "8px" }}
                    onClick={() => save(sub.id)}
                  >
                    Save &mdash; Updates Student Cards Live
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "8px 14px" }}
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: sub.detail ? "#C0B090" : "#404858",
                  lineHeight: 1.6,
                  fontStyle: "italic",
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.25)",
                  borderRadius: 6,
                  borderLeft: `2px solid ${rgba(sub.color, 0.45)}`,
                }}
              >
                {sub.detail || "No instructions set. Click Edit to add them."}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
