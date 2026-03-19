"use client";

import { useState } from "react";
import { HexPicker, Icon, PageHeader, PortraitFrame, ProgBar } from "@/components/ui";
import { BASE_STUDENTS, SUBJECTS_ALL } from "@/lib/constants";
import type { Student } from "@/lib/types";
import { rgba } from "@/lib/utils";

export default function ProfilesPage() {
  const [students, setStudents] = useState<Record<string, Student>>({
    deven: { ...BASE_STUDENTS.deven, subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === "deven") },
    shaan: { ...BASE_STUDENTS.shaan, subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === "shaan") },
  });
  const [active, setActive] = useState("deven");
  const s = students[active];

  const upd = (k: keyof Student, v: string) => setStudents((p) => ({ ...p, [active]: { ...p[active], [k]: v } }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader icon="profile" title="Student Profiles" sub="Manage student settings and photo" />
      <div style={{ display: "flex", gap: 10 }}>
        {(["deven", "shaan"] as const).map((sid) => (
          <button
            key={sid}
            type="button"
            onClick={() => setActive(sid)}
            className={active === sid ? "btn-brass" : "btn-ghost"}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={students[sid].avatar}
              alt={students[sid].name}
              style={{ width: 22, height: "auto", borderRadius: 3, objectFit: "cover", objectPosition: "top" }}
            />
            {students[sid].name}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, alignItems: "start" }}>
        {/* Photo */}
        <div className="glass-warm" style={{ padding: 16, borderColor: rgba(s.color, 0.32), textAlign: "center" }}>
          <div className="cinzel brass" style={{ fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
            PROFILE PHOTO
          </div>
          <PortraitFrame src={s.avatar} name={s.name} onUpload={(url) => upd("avatar", url)} />
          <div style={{ fontSize: 10, color: "#506070", marginTop: 8, lineHeight: 1.5 }}>
            Hover over photo and click to upload a new image.
          </div>
        </div>
        {/* Identity */}
        <div className="glass-warm" style={{ padding: 18, borderColor: rgba(s.color, 0.32) }}>
          <div className="cinzel brass" style={{ fontSize: 11, letterSpacing: "0.1em", marginBottom: 14 }}>
            IDENTITY
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#506070",
                  marginBottom: 4,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Display Name
              </div>
              <input className="inp" value={s.name} onChange={(e) => upd("name", e.target.value)} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#506070",
                  marginBottom: 4,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Tagline / Title
              </div>
              <input
                className="inp"
                value={s.tagline}
                onChange={(e) => upd("tagline", e.target.value)}
                placeholder="e.g. Explorer of Systems"
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#506070",
                  marginBottom: 4,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Grade
              </div>
              <input
                className="inp"
                value={s.grade}
                onChange={(e) => upd("grade", e.target.value)}
                placeholder="e.g. 5th Grade"
              />
            </div>
          </div>
        </div>
        {/* Colors */}
        <div className="glass-warm" style={{ padding: 18, borderColor: rgba(s.color, 0.32) }}>
          <div className="cinzel brass" style={{ fontSize: 11, letterSpacing: "0.1em", marginBottom: 14 }}>
            ACCENT COLOR
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: s.color,
                boxShadow: `0 0 12px ${s.color}`,
                border: "2px solid rgba(255,255,255,0.15)",
              }}
            />
            <div style={{ fontSize: 12, color: "#9AABBC" }}>Used on nav, cards, and progress bars</div>
          </div>
          <HexPicker value={s.color} onChange={(c) => upd("color", c)} />
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 11,
                color: "#506070",
                marginBottom: 6,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Preview
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 7,
                background: rgba(s.color, 0.12),
                border: `1px solid ${rgba(s.color, 0.35)}`,
                fontSize: 12,
                color: s.color,
                fontWeight: 600,
              }}
            >
              {s.name} &mdash; {s.grade}
            </div>
          </div>
        </div>
        {/* Enrolled subjects */}
        <div className="glass" style={{ padding: 16 }}>
          <div className="cinzel brass" style={{ fontSize: 11, letterSpacing: "0.08em", marginBottom: 12 }}>
            ENROLLED SUBJECTS ({s.subjects.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {s.subjects.length === 0 && (
              <div style={{ fontSize: 11, color: "#404858", fontStyle: "italic" }}>No subjects assigned yet.</div>
            )}
            {s.subjects.map((sub, idx) => (
              <div
                key={sub.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 7,
                  background: "rgba(0,0,0,0.25)",
                  border: `1px solid ${rgba(sub.color, 0.22)}`,
                }}
              >
                <Icon name={sub.icon} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#EEE4CC",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sub.name}
                  </div>
                  <div style={{ fontSize: 9, color: "#506070", marginTop: 1 }}>{sub.days.join("\u00B7")}</div>
                </div>
                <ProgBar value={[75, 60, 90, 45, 80, 55, 70][idx % 7]} color={sub.color} style={{ width: 48 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
