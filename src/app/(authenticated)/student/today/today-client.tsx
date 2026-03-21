"use client";

import { useState, useTransition } from "react";
import { markTaskDone, submitTaskProof } from "@/app/actions/tasks";
import { type StoragePath, SubmitModal } from "@/components/modals/submit-modal";
import { Icon, PageHeader, ProgBar, StatusBadge } from "@/components/ui";
import { CalendarWidget } from "@/components/widgets/calendar-widget";
import { WeatherWidget } from "@/components/widgets/weather-widget";
import type { CalendarEvent, Student, Task } from "@/lib/types";
import { getTodayLabel, rgba } from "@/lib/utils";
import type { WeatherData } from "@/lib/weather";

export interface WeekSummary {
  total: number;
  completed: number;
  weekLabel: string;
}

interface TodayClientProps {
  initialTasks: Task[];
  student: Student;
  weather: WeatherData | null;
  calendarEvents: CalendarEvent[];
  weekSummary: WeekSummary | null;
}

export function TodayClient({ initialTasks, student, weather, calendarEvents, weekSummary }: TodayClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [modal, setModal] = useState<Task | null>(null);
  const [, startTransition] = useTransition();

  const done = tasks.filter((t) => t.status === "done" || t.status === "review" || t.status === "approved").length;
  const allDone = done === tasks.length && tasks.length > 0;

  // Checkbox-style task: toggle pending ↔ done, persist to DB
  const check = (tid: string) => {
    const task = tasks.find((t) => t.id === tid);
    if (!task) return;
    const nowDone = task.status !== "done";

    // Optimistic update
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
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === tid ? { ...t, status: task.status, completedAt: task.completedAt } : t)),
        );
      }
    });
  };

  // Submission modal: save proof + notes, persist to DB
  const submit = (tid: string, data: { storagePaths: StoragePath[]; text: string; timer: number }) => {
    const task = tasks.find((t) => t.id === tid);
    if (!task) return;
    const newStatus = (task.requiresReview ? "review" : "done") as Task["status"];

    // Optimistic update
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
        // Revert on failure
        setTasks((prev) => prev.map((t) => (t.id === tid ? { ...t, status: task.status, notes: task.notes } : t)));
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <PageHeader
          icon="today"
          title="Today's Missions"
          sub={`${getTodayLabel()} · ${done}/${tasks.length} complete`}
          color={student.color}
        />
        <ProgBar value={tasks.length ? (done / tasks.length) * 100 : 0} color={student.color} style={{ height: 10 }} />
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* LEFT — mission cards */}
        <div style={{ width: 250, flexShrink: 0, marginLeft: 40 }}>
          {tasks.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Rest day panel */}
              <div
                className="glass"
                style={{
                  padding: "22px 18px",
                  textAlign: "center",
                  borderColor: rgba(student.color, 0.3),
                  background: rgba(student.color, 0.06),
                }}
              >
                <Icon name="completed" size={52} style={{ margin: "0 auto 10px" }} />
                <div className="cinzel" style={{ fontSize: 15, fontWeight: 700, color: student.color }}>
                  Rest Day
                </div>
                <div style={{ fontSize: 11, color: "#506070", marginTop: 5 }}>
                  No missions scheduled &mdash; recharge your engines.
                </div>
              </div>

              {/* Preceding week summary */}
              {weekSummary &&
                (weekSummary.completed === weekSummary.total ? (
                  /* All done — congratulations */
                  <div
                    className="glass-warm"
                    style={{
                      padding: "18px 16px",
                      textAlign: "center",
                      borderColor: "rgba(232,168,32,0.45)",
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                    <div className="cinzel brass" style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                      Perfect Week!
                    </div>
                    <div style={{ fontSize: 11, color: "#9AABBC", lineHeight: 1.6 }}>
                      Every mission completed the week of {weekSummary.weekLabel}. Outstanding work, cadet!
                    </div>
                  </div>
                ) : (
                  /* Some incomplete — nudge */
                  <div
                    className="glass"
                    style={{
                      padding: "18px 16px",
                      borderColor: "rgba(212,168,48,0.35)",
                      background: "rgba(212,168,48,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>📋</span>
                      <div className="cinzel" style={{ fontSize: 12, color: "#D4A830", fontWeight: 700 }}>
                        Last Week
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#9AABBC", lineHeight: 1.65 }}>
                      {weekSummary.completed}/{weekSummary.total} missions finished the week of{" "}
                      {weekSummary.weekLabel}.
                    </div>
                    <div style={{ fontSize: 11, color: "#D4A830", marginTop: 8, fontStyle: "italic" }}>
                      {weekSummary.total - weekSummary.completed} still incomplete &mdash; use today&apos;s
                      downtime to catch up!
                    </div>
                  </div>
                ))}

              {/* No data for preceding week */}
              {!weekSummary && (
                <div
                  className="glass"
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#404858", fontStyle: "italic" }}>
                    No task history for the previous week yet.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {tasks.map((task) => {
                const isDone = task.status === "done" || task.status === "review" || task.status === "approved";
                return (
                  <div
                    key={task.id}
                    className="task-card"
                    style={{
                      background: isDone ? "rgba(5,10,18,0.55)" : "rgba(4,10,22,0.88)",
                      borderColor: rgba(task.subjectColor, isDone ? 0.18 : 0.45),
                      boxShadow: isDone ? "none" : `0 4px 22px ${rgba(task.subjectColor, 0.18)}`,
                      opacity: isDone ? 0.65 : 1,
                      cursor: isDone ? "default" : "pointer",
                    }}
                    onClick={() => {
                      if (!isDone) setModal(task);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isDone) setModal(task);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: "-30px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        filter: `drop-shadow(0 4px 14px rgba(0,0,0,0.75)) drop-shadow(0 0 10px ${rgba(task.subjectColor, 0.5)})`,
                      }}
                    >
                      <Icon name={task.subjectIcon} size={80} />
                    </div>
                    <div className="task-card-body">
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#F0E8D8", lineHeight: 1.2 }}>
                        {task.subjectName}
                      </div>
                      <StatusBadge status={task.status} />
                      {!isDone && (
                        <div style={{ fontSize: 11, color: "#4ABCCC", marginTop: 2, letterSpacing: "0.02em" }}>
                          See assignment &rarr;
                        </div>
                      )}
                      {isDone && <div style={{ fontSize: 11, color: "#70C090", marginTop: 2 }}>✓ Complete</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tech time banner — unlocks when all missions done */}
          {allDone && (
            <div
              className="glass tech-glow"
              style={{ padding: 20, textAlign: "center", borderColor: "rgba(184,134,11,0.5)", marginTop: 14 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/icon-techtime-unlocked.png"
                alt="Tech Time"
                className="coin-spin"
                style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 10 }}
              />
              <div className="cinzel brass" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                TECH TIME UNLOCKED!
              </div>
              <div style={{ fontSize: 12, color: "#9AABBC", marginBottom: 12 }}>
                All missions complete. Show this code to unlock your device.
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#F5D680",
                  letterSpacing: "0.25em",
                  padding: "10px 24px",
                  display: "inline-block",
                  background: "rgba(0,0,0,0.5)",
                  borderRadius: 8,
                  border: "1px solid rgba(184,134,11,0.5)",
                }}
              >
                {student.id === "deven" ? "CRAFT-7734" : "CRAFT-5521"}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — weather + calendar */}
        <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <WeatherWidget color={student.color} weather={weather} />
          <CalendarWidget color={student.color} events={calendarEvents} />
        </div>
      </div>

      {modal && (
        <SubmitModal task={modal} student={student} onClose={() => setModal(null)} onSubmit={submit} onCheck={check} />
      )}
    </div>
  );
}
