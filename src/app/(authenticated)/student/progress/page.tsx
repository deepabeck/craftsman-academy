"use client";

import { Icon, PageHeader, ProgBar } from "@/components/ui";
import { BASE_STUDENTS, SUBJECTS_ALL } from "@/lib/constants";
import type { Student } from "@/lib/types";
import { rgba } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const SUBJECT_PROGRESS = [82, 75, 90, 68, 85, 77, 92, 60];

export default function ProgressPage() {
  const { user } = useAuth();
  const studentId = user?.studentId || "deven";
  const base = BASE_STUDENTS[studentId] || BASE_STUDENTS.deven;
  const student: Student = {
    ...base,
    subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === studentId),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="progress" title="Progress Report" sub="Your journey so far" color={student.color} />
      <div className="glass-warm" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="cinzel brass" style={{ fontSize: 14 }}>
            Overall &mdash; This Week
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: student.color }}>78%</div>
        </div>
        <ProgBar value={78} color={student.color} style={{ height: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
          {(
            [
              ["Tasks Done", "23", student.color],
              ["Day Streak", "5 \uD83D\uDD25", "#E8A820"],
              ["Avg Score", "91%", "#5BAA60"],
            ] as const
          ).map(([l, v, c]) => (
            <div
              key={l}
              style={{
                textAlign: "center",
                padding: 12,
                borderRadius: 8,
                background: "rgba(0,0,0,0.28)",
                border: `1px solid ${rgba(c, 0.28)}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: "#506070", marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {student.subjects.map((sub, idx) => {
          const p = SUBJECT_PROGRESS[idx % SUBJECT_PROGRESS.length];
          return (
            <div key={sub.id} className="glass" style={{ padding: 14, borderColor: rgba(sub.color, 0.28) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Icon name={sub.icon} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#EEE4CC" }}>{sub.name}</div>
                  <ProgBar value={p} color={sub.color} style={{ marginTop: 5 }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: sub.color }}>{p}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
