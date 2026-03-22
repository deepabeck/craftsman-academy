"use client";

import { useEffect, useState, useTransition } from "react";
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

/** Hour (24h local time) at which tech time unlocks — change to taste */
const TECH_TIME_HOUR = 17; // 5:00 PM

function formatUnlockTime(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
}

export function TodayClient({ initialTasks, student, weather, calendarEvents, weekSummary }: TodayClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [modal, setModal] = useState<Task | null>(null);
  const [, startTransition] = useTransition();
  const [isEvening, setIsEvening] = useState(() => new Date().getHours() >= TECH_TIME_HOUR);

  // Re-check the clock every minute so the banner flips automatically at unlock time
  useEffect(() => {
    const tick = () => setIsEvening(new Date().getHours() >= TECH_TIME_HOUR);
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Cancelled tasks don't count as active missions — treat as excused
  const activeTasks = tasks.filter((t) => t.status !== "cancelled");
  const done = activeTasks.filter(
    (t) => t.status === "done" || t.status === "review" || t.status === "approved",
  ).length;
  const allDone = done === activeTasks.length && activeTasks.length > 0;
  const isRestDay = activeTasks.length === 0;
  // Tech time is earned when all tasks are done OR it's a rest day
  const techTimeEarned = allDone || isRestDay;

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

      {/* Top row: missions (left) + tech time (right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
        {/* LEFT — mission cards or rest day */}
        <div style={{ paddingLeft: tasks.length > 0 ? 36 : 0 }}>
          {tasks.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Rest day panel */}
              <div
                className="glass"
                style={{
                  padding: "22px 18px",
                  textAlign: "center",
                  borderColor: rgba(student.color, 0.3),
                }}
              >
                <Icon name="completed" size={52} style={{ margin: "0 auto 10px" }} />
                <div className="cinzel" style={{ fontSize: 15, fontWeight: 700, color: student.color }}>
                  Rest Day
                </div>
                <div style={{ fontSize: 13, color: "#506070", marginTop: 5 }}>
                  No missions scheduled &mdash; recharge your engines.
                </div>
              </div>

              {/* Preceding week summary */}
              {weekSummary &&
                (weekSummary.completed === weekSummary.total ? (
                  <div
                    className="glass-warm"
                    style={{
                      padding: "18px 16px",
                      textAlign: "center",
                      borderColor: "rgba(232,168,32,0.45)",
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                    <div className="cinzel brass" style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                      Perfect Week!
                    </div>
                    <div style={{ fontSize: 13, color: "#9AABBC", lineHeight: 1.6 }}>
                      Every mission completed the week of {weekSummary.weekLabel}. Outstanding work, cadet!
                    </div>
                  </div>
                ) : (
                  <div
                    className="glass"
                    style={{
                      padding: "18px 16px",
                      borderColor: "rgba(212,168,48,0.35)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>📋</span>
                      <div className="cinzel" style={{ fontSize: 13, color: "#D4A830", fontWeight: 700 }}>
                        Last Week
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#9AABBC", lineHeight: 1.65 }}>
                      {weekSummary.completed}/{weekSummary.total} missions finished the week of {weekSummary.weekLabel}.
                    </div>
                    <div style={{ fontSize: 13, color: "#D4A830", marginTop: 8, fontStyle: "italic" }}>
                      {weekSummary.total - weekSummary.completed} still incomplete &mdash; use today&apos;s downtime to
                      catch up!
                    </div>
                  </div>
                ))}

              {!weekSummary && (
                <div
                  className="glass"
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#404858", fontStyle: "italic" }}>
                    No task history for the previous week yet.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {tasks.map((task) => {
                const isCancelled = task.status === "cancelled";
                const isDone = task.status === "done" || task.status === "review" || task.status === "approved";
                return (
                  <div
                    key={task.id}
                    className="task-card"
                    style={{
                      background: isCancelled
                        ? "rgba(4,8,16,0.4)"
                        : isDone
                          ? "rgba(5,10,18,0.55)"
                          : "rgba(4,10,22,0.88)",
                      borderColor: isCancelled ? "rgba(60,70,90,0.3)" : rgba(task.subjectColor, isDone ? 0.18 : 0.45),
                      boxShadow: isCancelled || isDone ? "none" : `0 4px 22px ${rgba(task.subjectColor, 0.18)}`,
                      opacity: isCancelled ? 0.5 : isDone ? 0.65 : 1,
                      cursor: isCancelled || isDone ? "default" : "pointer",
                      pointerEvents: isCancelled ? "none" : undefined,
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
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: isCancelled ? "#506070" : "#F0E8D8",
                          lineHeight: 1.2,
                        }}
                      >
                        {task.subjectName}
                      </div>
                      {isCancelled ? (
                        <div style={{ fontSize: 12, color: "#4A5A70", marginTop: 3 }}>
                          Excused · {task.cancelledReason ?? "Cancelled"}
                        </div>
                      ) : (
                        <>
                          <StatusBadge status={task.status} />
                          {!isDone && (
                            <div style={{ fontSize: 13, color: "#4ABCCC", marginTop: 2, letterSpacing: "0.02em" }}>
                              See assignment &rarr;
                            </div>
                          )}
                          {isDone && <div style={{ fontSize: 13, color: "#70C090", marginTop: 2 }}>✓ Complete</div>}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — tech time */}
        <div>
          {/* Locked — tasks still in progress */}
          {!techTimeEarned && tasks.length > 0 && (
            <div className="glass" style={{ padding: "20px 22px", borderColor: "rgba(60,75,95,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/icon-techtime-unlocked.png"
                  alt="Tech Time"
                  style={{
                    width: 44,
                    height: 44,
                    objectFit: "contain",
                    flexShrink: 0,
                    filter: "grayscale(85%) brightness(0.35)",
                    opacity: 0.5,
                  }}
                />
                <div className="cinzel" style={{ fontSize: 15, fontWeight: 700, color: "#2A3848" }}>
                  TECH TIME
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#2A3848", lineHeight: 1.7 }}>
                Complete today&apos;s missions to earn your tech time this evening.
              </div>
            </div>
          )}

          {/* Earned — waiting for evening */}
          {techTimeEarned && !isEvening && (
            <div className="glass" style={{ padding: "20px 22px", borderColor: "rgba(184,134,11,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/icon-techtime-unlocked.png"
                  alt="Tech Time"
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: "contain",
                    flexShrink: 0,
                    filter: "grayscale(55%) brightness(0.72)",
                    opacity: 0.8,
                  }}
                />
                <div>
                  <div className="cinzel" style={{ fontSize: 16, fontWeight: 700, color: "#D4A830" }}>
                    TECH TIME EARNED
                  </div>
                  <div style={{ fontSize: 13, color: "#506070", marginTop: 2 }}>
                    {isRestDay ? "Rest day" : "All missions done"}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#9AABBC", lineHeight: 1.7, marginBottom: 16 }}>
                {isRestDay ? "No missions today — enjoy your day." : "Outstanding work, cadet!"} Your tech time unlocks
                at <span style={{ color: "#E8A820", fontWeight: 600 }}>{formatUnlockTime(TECH_TIME_HOUR)}</span>.
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 18px",
                  borderRadius: 20,
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(184,134,11,0.28)",
                  fontSize: 13,
                  color: "#506070",
                  letterSpacing: "0.05em",
                }}
              >
                🔒 Locked until {formatUnlockTime(TECH_TIME_HOUR)}
              </div>
            </div>
          )}

          {/* Fully unlocked */}
          {techTimeEarned && isEvening && (
            <div className="glass tech-glow" style={{ padding: "20px 22px", borderColor: "rgba(184,134,11,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/icon-techtime-unlocked.png"
                  alt="Tech Time"
                  className="coin-spin"
                  style={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }}
                />
                <div>
                  <div className="cinzel brass" style={{ fontSize: 18, fontWeight: 700 }}>
                    TECH TIME UNLOCKED!
                  </div>
                  <div style={{ fontSize: 13, color: "#9AABBC", marginTop: 3 }}>
                    Show this code to unlock your device.
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#F5D680",
                  letterSpacing: "0.22em",
                  padding: "14px 20px",
                  background: "rgba(0,0,0,0.5)",
                  borderRadius: 8,
                  border: "1px solid rgba(184,134,11,0.5)",
                  textAlign: "center",
                }}
              >
                {student.id === "deven" ? "CRAFT-7734" : "CRAFT-5521"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: weather (wide) + upcoming events */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
        <WeatherWidget color={student.color} weather={weather} wide />
        <CalendarWidget color={student.color} events={calendarEvents} />
      </div>

      {modal && (
        <SubmitModal task={modal} student={student} onClose={() => setModal(null)} onSubmit={submit} onCheck={check} />
      )}
    </div>
  );
}
