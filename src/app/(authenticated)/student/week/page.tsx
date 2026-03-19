"use client";

import { Icon, PageHeader, ProgBar } from "@/components/ui";
import { BASE_STUDENTS, SUBJECTS_ALL } from "@/lib/constants";
import type { Student } from "@/lib/types";
import { getTodayDow, rgba } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const WEEK_PROGRESS: Record<string, number> = {
  Mon: 85,
  Tue: 72,
  Wed: 60,
  Thu: 45,
  Fri: 90,
};

export default function WeekPage() {
  const { user } = useAuth();
  const studentId = user?.studentId || "deven";
  const base = BASE_STUDENTS[studentId] || BASE_STUDENTS.deven;
  const student: Student = {
    ...base,
    subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === studentId),
  };
  const todayDow = getTodayDow();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="week" title="This Week" sub="Your mission map" color={student.color} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {days.map((day) => {
          const subs = student.subjects.filter((s) => s.days.includes(day));
          const isToday = day === todayDow;
          const pct = WEEK_PROGRESS[day] || 50;
          return (
            <div
              key={day}
              className="glass"
              style={{
                padding: 12,
                borderColor: isToday ? rgba(student.color, 0.5) : "rgba(184,134,11,0.18)",
                background: isToday ? rgba(student.color, 0.1) : "rgba(8,17,30,0.70)",
              }}
            >
              <div
                className="cinzel"
                style={{
                  fontSize: 12,
                  textAlign: "center",
                  marginBottom: 7,
                  color: isToday ? student.color : "#9AABBC",
                  letterSpacing: "0.08em",
                }}
              >
                {day}
                {isToday && <div style={{ fontSize: 9, color: "#C8860A" }}>TODAY</div>}
              </div>
              <ProgBar value={pct} color={student.color} style={{ marginBottom: 9 }} />
              {subs.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <Icon name={s.icon} size={24} />
                  <span style={{ fontSize: 11, color: "#9AABBC", flex: 1, lineHeight: 1.2 }}>{s.name}</span>
                </div>
              ))}
              {subs.length === 0 && (
                <div style={{ fontSize: 10, color: "#404858", textAlign: "center", padding: "6px 0" }}>Free day</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
