"use client";

import { useState, useTransition } from "react";
import { markTaskDone, submitTaskProof } from "@/app/actions/tasks";
import { type StoragePath, SubmitModal } from "@/components/modals/submit-modal";
import { Icon, PageHeader, ProgBar, StatusBadge } from "@/components/ui";
import type { Student, Task } from "@/lib/types";
import { rgba } from "@/lib/utils";

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

interface WeekClientProps {
  tasks: (Task & { taskDate: string })[];
  student: Student;
  weekStart: string; // "YYYY-MM-DD" — always a Monday
}

/** YYYY-MM-DD for day offset from a Monday string */
function dateForDay(weekStart: string, dayIndex: number): string {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + dayIndex);
  return d.toISOString().split("T")[0];
}

/** Today's date as YYYY-MM-DD (local) */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function WeekClient({ tasks: initialTasks, student, weekStart }: WeekClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    // Default-open today's column
    const today = todayStr();
    for (let i = 0; i < 5; i++) {
      if (dateForDay(weekStart, i) === today) return i;
    }
    return 0;
  });
  const [modal, setModal] = useState<Task | null>(null);
  const [, startTransition] = useTransition();

  const today = todayStr();

  // ── Task mutation helpers (same pattern as today-client) ─────────────────

  const check = (tid: string) => {
    const task = tasks.find((t) => t.id === tid);
    if (!task) return;
    const nowDone = task.status !== "done";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === tid
          ? { ...t, status: nowDone ? "done" : "pending", completedAt: nowDone ? new Date().toISOString() : null }
          : t,
      ),
    );
    startTransition(async () => {
      const result = await markTaskDone(tid, nowDone);
      if (!result.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === tid ? { ...t, status: task.status, completedAt: task.completedAt } : t)),
        );
      }
    });
  };

  const submit = (tid: string, data: { storagePaths: StoragePath[]; text: string; timer: number }) => {
    const task = tasks.find((t) => t.id === tid);
    if (!task) return;
    const newStatus = (task.requiresReview ? "review" : "done") as Task["status"];
    setTasks((prev) =>
      prev.map((t) =>
        t.id === tid
          ? {
              ...t,
              status: newStatus,
              notes: data.text,
              timerSeconds: data.timer,
              completedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
    setModal(null);
    startTransition(async () => {
      const result = await submitTaskProof(tid, {
        text: data.text,
        timerSeconds: data.timer > 0 ? data.timer : undefined,
        fileDetails: data.storagePaths,
        requiresReview: task.requiresReview ?? false,
      });
      if (!result.success) {
        setTasks((prev) => prev.map((t) => (t.id === tid ? { ...t, status: task.status, notes: task.notes } : t)));
      }
    });
  };

  // ── Per-day stats ────────────────────────────────────────────────────────

  const dayData = DAYS_SHORT.map((_, i) => {
    const date = dateForDay(weekStart, i);
    const dayTasks = tasks.filter((t) => t.taskDate === date);
    const done = dayTasks.filter((t) => ["done", "review", "approved"].includes(t.status)).length;
    const pct = dayTasks.length > 0 ? Math.round((done / dayTasks.length) * 100) : 0;
    const isPast = date < today;
    const isToday = date === today;
    const isFuture = date > today;
    return { date, dayTasks, done, pct, isPast, isToday, isFuture };
  });

  const selectedDayData = selectedDay !== null ? dayData[selectedDay] : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader
        icon="week"
        title="This Week"
        sub="Your mission map — click any day to view assignments"
        color={student.color}
      />

      {/* 5-column day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, alignItems: "start" }}>
        {dayData.map((d, i) => {
          const isSelected = selectedDay === i;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : i)}
              style={{
                padding: "12px 10px",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                border: isSelected
                  ? `2px solid ${rgba(student.color, 0.7)}`
                  : d.isToday
                    ? `1.5px solid ${rgba(student.color, 0.45)}`
                    : "1px solid rgba(184,134,11,0.18)",
                background: isSelected ? "rgba(20,30,50,0.85)" : "rgba(8,17,30,0.70)",
                transition: "all 0.15s",
              }}
            >
              {/* Day header */}
              <div
                className="cinzel"
                style={{
                  fontSize: 13,
                  textAlign: "center",
                  marginBottom: 7,
                  color: isSelected || d.isToday ? student.color : "#9AABBC",
                  letterSpacing: "0.08em",
                }}
              >
                {DAYS_SHORT[i]}
                {d.isToday && <div style={{ fontSize: 13, color: "#C8860A" }}>TODAY</div>}
              </div>

              {/* Progress bar */}
              <ProgBar value={d.pct} color={student.color} style={{ marginBottom: 9 }} />

              {/* Subject icons */}
              {d.dayTasks.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {d.dayTasks.map((t) => {
                    const isDone = ["done", "review", "approved"].includes(t.status);
                    return (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name={t.subjectIcon} size={20} style={{ opacity: isDone ? 0.5 : 1 }} />
                        <span
                          style={{
                            fontSize: 13,
                            color: isDone ? "#506070" : "#9AABBC",
                            flex: 1,
                            lineHeight: 1.2,
                            textDecoration: isDone ? "line-through" : "none",
                          }}
                        >
                          {t.subjectName}
                        </span>
                        {isDone && <span style={{ fontSize: 13, color: "#70C090" }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#404858", textAlign: "center", padding: "6px 0" }}>
                  {d.isFuture ? "Planned" : "Free day"}
                </div>
              )}

              {/* Click hint */}
              <div
                style={{
                  fontSize: 13,
                  color: isSelected ? rgba(student.color, 0.7) : "rgba(255,255,255,0.18)",
                  textAlign: "center",
                  marginTop: 8,
                  letterSpacing: "0.06em",
                }}
              >
                {isSelected ? "▲ collapse" : "▼ view tasks"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay !== null && selectedDayData && (
        <div
          className="glass-warm"
          style={{
            padding: 20,
            borderColor: rgba(student.color, 0.3),
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="cinzel" style={{ fontSize: 15, color: student.color, flex: 1 }}>
              {DAYS_FULL[selectedDay]}
            </div>
            <div style={{ fontSize: 13, color: "#506070" }}>
              {selectedDayData.done}/{selectedDayData.dayTasks.length} complete
            </div>
          </div>

          {selectedDayData.dayTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#506070", fontSize: 14 }}>
              <Icon name="completed" size={40} style={{ margin: "0 auto 10px" }} />
              No assignments scheduled for this day.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedDayData.dayTasks.map((task) => {
                const isDone = ["done", "review", "approved"].includes(task.status);
                const isFuture = selectedDayData.date > today;

                return (
                  <div
                    key={task.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 9,
                      background: isDone ? "rgba(0,0,0,0.2)" : rgba(task.subjectColor, 0.08),
                      border: `1px solid ${rgba(task.subjectColor, isDone ? 0.12 : 0.32)}`,
                      opacity: isDone ? 0.7 : 1,
                    }}
                  >
                    <Icon name={task.subjectIcon} size={36} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#F0E8D8" }}>{task.subjectName}</span>
                        <StatusBadge status={task.status} />
                      </div>
                      {task.detail && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "#7A8B9C",
                            lineHeight: 1.5,
                            borderLeft: `2px solid ${rgba(task.subjectColor, 0.4)}`,
                            paddingLeft: 8,
                            marginBottom: 6,
                          }}
                        >
                          {task.detail}
                        </div>
                      )}
                      {task.adminNote && (
                        <div style={{ fontSize: 13, color: "#C8860A", marginBottom: 6 }}>📌 {task.adminNote}</div>
                      )}
                    </div>

                    {/* Action button */}
                    {!isDone && (
                      <button
                        type="button"
                        className="btn-brass"
                        style={{ padding: "7px 14px", fontSize: 13, flexShrink: 0 }}
                        onClick={() => setModal(task)}
                      >
                        {isFuture ? "Work Ahead →" : "Start →"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modal && (
        <SubmitModal task={modal} student={student} onClose={() => setModal(null)} onSubmit={submit} onCheck={check} />
      )}
    </div>
  );
}
