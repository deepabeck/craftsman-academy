"use client";

import { useEffect, useState, useTransition } from "react";
import { markTaskDone, submitTaskProof } from "@/app/actions/tasks";
import { type StoragePath, SubmitModal } from "@/components/modals/submit-modal";
import { Icon, PageHeader, ProgBar, StatusBadge } from "@/components/ui";
import { CalendarWidget } from "@/components/widgets/calendar-widget";
import { WeatherWidget } from "@/components/widgets/weather-widget";
import { usePoints } from "@/contexts/points-context";
import type { CalendarEvent, Student, Task } from "@/lib/types";
import { getTodayLabel, rgba } from "@/lib/utils";
import type { WeatherData } from "@/lib/weather";

export interface WeekSummary {
  total: number;
  completed: number;
  weekLabel: string;
}

export interface LateTask {
  id: string;
  subjectName: string;
  subjectIcon: string;
  subjectColor: string;
  status: "pending" | "missed";
}

interface TodayClientProps {
  initialTasks: Task[];
  student: Student;
  weather: WeatherData | null;
  calendarEvents: CalendarEvent[];
  weekSummary: WeekSummary | null;
  dayOfWeek: number; // 0=Sun 1=Mon … 6=Sat
  lateTasks: LateTask[];
}

/** Hour (24h local time) at which tech time unlocks — change to taste */
const TECH_TIME_HOUR = 17; // 5:00 PM

function formatUnlockTime(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
}

export function TodayClient({
  initialTasks,
  student,
  weather,
  calendarEvents,
  weekSummary,
  dayOfWeek,
  lateTasks,
}: TodayClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [modal, setModal] = useState<Task | null>(null);
  const [, startTransition] = useTransition();
  const { refreshBalance, celebrate } = usePoints();
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
      } else if (nowDone) {
        refreshBalance(1500);
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
      } else {
        refreshBalance(1500);
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

      {/* Main row: missions (left) + widgets column (right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 14, alignItems: "start" }}>
        {/* LEFT — mission cards or weekend panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ paddingLeft: tasks.length > 0 ? 36 : 0 }}>
            {tasks.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* ── Sunday: new-week message ───────────────────────────────── */}
                {dayOfWeek === 0 && (
                  <div
                    className={isEvening ? "glass tech-glow" : "glass"}
                    style={{
                      padding: "26px 22px",
                      textAlign: "center",
                      borderColor: isEvening ? "rgba(184,134,11,0.5)" : rgba(student.color, 0.25),
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {/* biome-ignore lint/performance/noImgElement: animated asset */}
                    <img
                      src="/assets/icon-techtime-unlocked.png"
                      alt="Tech Time"
                      className="coin-spin"
                      style={{ width: 54, height: 54, objectFit: "contain", marginBottom: 14 }}
                    />
                    <div className="cinzel brass" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                      New Week Begins Tomorrow
                    </div>
                    <div style={{ fontSize: 13, color: "#9AABBC", lineHeight: 1.7 }}>
                      No missions today — enjoy your weekend, cadet.
                      <br />
                      Your next assignments start Monday.
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid rgba(184,134,11,0.15)",
                        fontSize: 13,
                        color: isEvening ? "#E8A820" : "#D4A830",
                        fontWeight: 600,
                      }}
                    >
                      {isEvening
                        ? "Tech time is unlocked — enjoy!"
                        : `🔒 Tech time unlocks at ${formatUnlockTime(TECH_TIME_HOUR)}`}
                    </div>
                  </div>
                )}

                {/* ── Saturday: late tasks from Mon–Fri ─────────────────────── */}
                {dayOfWeek === 6 && (
                  <>
                    <div
                      className="glass"
                      style={{ padding: "20px 18px", textAlign: "center", borderColor: rgba(student.color, 0.25) }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 8 }}>⚙</div>
                      <div className="cinzel" style={{ fontSize: 15, fontWeight: 700, color: student.color }}>
                        Weekend Rest
                      </div>
                      <div style={{ fontSize: 13, color: "#506070", marginTop: 5 }}>
                        No new missions today — recharge your engines.
                      </div>
                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          fontSize: 13,
                          color: isEvening ? "#D4A830" : "#506070",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/assets/icon-techtime-unlocked.png"
                          alt=""
                          style={{
                            width: 16,
                            height: 16,
                            objectFit: "contain",
                            verticalAlign: "middle",
                            marginRight: 6,
                            opacity: 0.7,
                          }}
                        />
                        {isEvening
                          ? "Tech time is unlocked — enjoy!"
                          : `Tech time unlocks at ${formatUnlockTime(TECH_TIME_HOUR)}.`}
                      </div>
                    </div>
                    {lateTasks.length > 0 && (
                      <div className="glass" style={{ padding: "18px 16px", borderColor: "rgba(240,128,128,0.3)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ fontSize: 18 }}>📋</span>
                          <div className="cinzel" style={{ fontSize: 13, color: "#F08080", fontWeight: 700 }}>
                            Incomplete from This Week
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {lateTasks.map((t) => (
                            <div
                              key={t.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "8px 10px",
                                borderRadius: 6,
                                background: "rgba(4,8,16,0.5)",
                                border: `1px solid ${rgba(t.subjectColor, 0.2)}`,
                              }}
                            >
                              <Icon name={t.subjectIcon} size={32} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#D8CDB8" }}>{t.subjectName}</div>
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: t.status === "missed" ? "#F08080" : "#D4A830",
                                  fontWeight: 600,
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                }}
                              >
                                {t.status === "missed" ? "Missed" : "Pending"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {lateTasks.length === 0 && (
                      <div
                        className="glass-warm"
                        style={{ padding: "16px", textAlign: "center", borderColor: "rgba(232,168,32,0.4)" }}
                      >
                        <div style={{ fontSize: 26, marginBottom: 6 }}>🏆</div>
                        <div className="cinzel brass" style={{ fontSize: 13, fontWeight: 700 }}>
                          Clean Week!
                        </div>
                        <div style={{ fontSize: 12, color: "#9AABBC", marginTop: 4 }}>
                          All missions completed. Outstanding work, cadet!
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Other rest days (holidays, etc.) ──────────────────────── */}
                {dayOfWeek !== 0 && dayOfWeek !== 6 && (
                  <>
                    <div
                      className="glass"
                      style={{ padding: "22px 18px", textAlign: "center", borderColor: rgba(student.color, 0.3) }}
                    >
                      <Icon name="completed" size={52} style={{ margin: "0 auto 10px" }} />
                      <div className="cinzel" style={{ fontSize: 15, fontWeight: 700, color: student.color }}>
                        Rest Day
                      </div>
                      <div style={{ fontSize: 13, color: "#506070", marginTop: 5 }}>
                        No missions scheduled &mdash; recharge your engines.
                      </div>
                    </div>
                    {weekSummary &&
                      (weekSummary.completed === weekSummary.total ? (
                        <div
                          className="glass-warm"
                          style={{ padding: "18px 16px", textAlign: "center", borderColor: "rgba(232,168,32,0.45)" }}
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
                        <div className="glass" style={{ padding: "18px 16px", borderColor: "rgba(212,168,48,0.35)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: 22 }}>📋</span>
                            <div className="cinzel" style={{ fontSize: 13, color: "#D4A830", fontWeight: 700 }}>
                              Last Week
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: "#9AABBC", lineHeight: 1.65 }}>
                            {weekSummary.completed}/{weekSummary.total} missions finished the week of{" "}
                            {weekSummary.weekLabel}.
                          </div>
                          <div style={{ fontSize: 13, color: "#D4A830", marginTop: 8, fontStyle: "italic" }}>
                            {weekSummary.total - weekSummary.completed} still incomplete &mdash; use today&apos;s
                            downtime to catch up!
                          </div>
                        </div>
                      ))}
                  </>
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
                      // biome-ignore lint/a11y/useSemanticElements: task card is a styled div, not a plain button
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
                            {task.cancelledReason?.startsWith("⚡")
                              ? task.cancelledReason
                              : `Excused · ${task.cancelledReason ?? "Cancelled"}`}
                          </div>
                        ) : (
                          <>
                            <StatusBadge
                              status={task.wasRevised && task.status === "pending" ? "revision" : task.status}
                            />
                            {!isDone && (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: task.wasRevised ? "#f0a060" : "#4ABCCC",
                                  marginTop: 2,
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {task.wasRevised ? "Feedback waiting — tap to revise" : "See assignment →"}
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

          {/* Tech time — appears in left column only after all tasks submitted */}
          {techTimeEarned && tasks.length > 0 && (
            <div
              className={isEvening ? "glass tech-glow" : "glass"}
              style={{ padding: "16px 20px", borderColor: isEvening ? "rgba(184,134,11,0.5)" : "rgba(184,134,11,0.3)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/icon-techtime-unlocked.png"
                  alt="Tech Time"
                  className={isEvening ? "coin-spin" : undefined}
                  style={{
                    width: 38,
                    height: 38,
                    objectFit: "contain",
                    flexShrink: 0,
                    filter: isEvening ? "none" : "grayscale(30%) brightness(0.8)",
                  }}
                />
                <div>
                  <div
                    className="cinzel"
                    style={{ fontSize: 14, fontWeight: 700, color: isEvening ? "#E8A820" : "#D4A830" }}
                  >
                    Great Job
                  </div>
                  <div style={{ fontSize: 12, color: "#9AABBC", marginTop: 2 }}>
                    You completed all your tasks today.
                  </div>
                  <div style={{ fontSize: 12, color: isEvening ? "#E8A820" : "#D4A830", marginTop: 4 }}>
                    {isEvening
                      ? "Tech time is unlocked — enjoy!"
                      : `Tech time unlocks at ${formatUnlockTime(TECH_TIME_HOUR)}`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — weather + calendar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <WeatherWidget color={student.color} weather={weather} />
          <CalendarWidget color={student.color} events={calendarEvents} />
        </div>
      </div>

      {modal && (
        <SubmitModal
          task={modal}
          student={student}
          onClose={() => setModal(null)}
          onSubmit={submit}
          onCheck={check}
          onSuccess={(pts) => {
            celebrate(pts);
            refreshBalance(2500);
          }}
        />
      )}
    </div>
  );
}
