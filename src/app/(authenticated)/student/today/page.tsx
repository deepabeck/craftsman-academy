"use client";

import { useState } from "react";
import { SubmitModal } from "@/components/modals/submit-modal";
import { Icon, PageHeader, ProgBar, StatusBadge } from "@/components/ui";
import { CalendarWidget } from "@/components/widgets/calendar-widget";
import { WeatherWidget } from "@/components/widgets/weather-widget";
import { BASE_STUDENTS, SUBJECTS_ALL } from "@/lib/constants";
import type { Student, Task } from "@/lib/types";
import { getTodayDow, getTodayLabel, rgba } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function makeTasks(student: Student): Task[] {
  const todayDow = getTodayDow();
  return student.subjects
    .filter((s) => s.days.includes(todayDow))
    .map((s) => ({
      id: `${student.id}-${s.id}`,
      subjectId: s.id,
      subjectName: s.name,
      subjectIcon: s.icon,
      subjectColor: s.color,
      detail: s.detail,
      proofType:
        s.id === "math" || s.id === "reading" || s.id === "geo"
          ? ("photo" as const)
          : s.id === "piano"
            ? ("timer" as const)
            : ("checkbox" as const),
      duration: s.id === "piano" ? 20 : s.id === "music" ? 30 : 45,
      status: "pending" as const,
      notes: "",
      files: [],
      completedAt: null,
    }));
}

export default function TodayPage() {
  const { user } = useAuth();
  const studentId = user?.studentId || "deven";
  const base = BASE_STUDENTS[studentId] || BASE_STUDENTS.deven;
  const student: Student = {
    ...base,
    subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === studentId),
  };

  const [tasks, setTasks] = useState<Task[]>(() => makeTasks(student));
  const [modal, setModal] = useState<Task | null>(null);

  const done = tasks.filter((t) => t.status === "done" || t.status === "review").length;
  const allDone = done === tasks.length && tasks.length > 0;

  const submit = (tid: string, data: { files: { name: string; url: string }[]; text: string; timer: number }) => {
    setTasks((p) => p.map((t) => (t.id === tid ? { ...t, status: "review" as const, ...data } : t)));
    setModal(null);
  };

  const check = (tid: string) => {
    setTasks((p) =>
      p.map((t) =>
        t.id === tid
          ? {
              ...t,
              status: t.status === "done" ? ("pending" as const) : ("done" as const),
              completedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <PageHeader
          icon="today"
          title="Today's Missions"
          sub={`${getTodayLabel()} \u00B7 ${done}/${tasks.length} complete`}
          color={student.color}
        />
        <ProgBar value={tasks.length ? (done / tasks.length) * 100 : 0} color={student.color} style={{ height: 10 }} />
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* LEFT — mission cards */}
        <div style={{ width: 250, flexShrink: 0, marginLeft: 40 }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#506070" }}>
              <Icon name="completed" size={52} style={{ margin: "0 auto 12px" }} />
              <div className="cinzel" style={{ fontSize: 14 }}>
                No missions today!
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {tasks.map((task) => {
                const isDone = task.status === "done" || task.status === "review";
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
          {/* Tech time banner */}
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
          <WeatherWidget color={student.color} />
          <CalendarWidget color={student.color} />
        </div>
      </div>
      {modal && (
        <SubmitModal task={modal} student={student} onClose={() => setModal(null)} onSubmit={submit} onCheck={check} />
      )}
    </div>
  );
}
