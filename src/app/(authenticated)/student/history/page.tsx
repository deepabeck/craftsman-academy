"use client";

import { Icon, PageHeader, StatusBadge } from "@/components/ui";
import { BASE_STUDENTS, SUBJECTS_ALL } from "@/lib/constants";
import type { Student } from "@/lib/types";
import { rgba } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

// Deterministic mock history entries
function buildHistory(student: Student) {
  const statuses = ["done", "done", "done", "review", "done", "missed", "done", "done"] as const;
  const scores = [92, 88, 95, null, 85, null, 90, 78];
  return student.subjects
    .flatMap((s, si) =>
      [0, 1, 2, 3].map((i) => ({
        id: `${s.id}-${i}`,
        subjectName: s.name,
        subjectIcon: s.icon,
        subjectColor: s.color,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        status: statuses[(si + i) % statuses.length],
        score: scores[(si + i) % scores.length],
      })),
    )
    .slice(0, 16);
}

export default function HistoryPage() {
  const { user } = useAuth();
  const studentId = user?.studentId || "deven";
  const base = BASE_STUDENTS[studentId] || BASE_STUDENTS.deven;
  const student: Student = {
    ...base,
    subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === studentId),
  };
  const entries = buildHistory(student);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="history" title="Mission Log" sub="Completed assignments" color={student.color} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {entries.map((e) => (
          <div
            key={e.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 13px",
              borderRadius: 9,
              background: "rgba(0,0,0,0.26)",
              border: `1px solid ${rgba(e.subjectColor, 0.18)}`,
              opacity: e.status === "missed" ? 0.52 : 1,
            }}
          >
            <Icon name={e.subjectIcon} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#EEE4CC",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {e.subjectName}
              </div>
              <div style={{ fontSize: 10, color: "#506070", marginTop: 2 }}>{e.date}</div>
            </div>
            {e.score != null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: student.color, flexShrink: 0 }}>{e.score}%</span>
            )}
            <StatusBadge status={e.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
