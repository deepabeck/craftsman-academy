"use client";

import { useCallback, useState, useTransition } from "react";
import { cancelTask, fulfillTask, restoreTask } from "@/app/actions/calendar-adjustments";
import {
  copyWeekPlans,
  deleteLessonPlan,
  getLessonPlansForWeek,
  type LessonPlanRow,
  upsertLessonPlan,
} from "@/app/actions/lesson-plans";
import { generateWritingJournalPrompt } from "@/app/actions/writing-journal";
import { Icon, PageHeader } from "@/components/ui";
import { type CalendarAdjustment, proposeAdjustments, type TaskSummary } from "@/lib/calendar-task-matcher";
import type { CalendarEvent } from "@/lib/types";
import { rgba } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const PROOF_OPTIONS = [
  { value: "checkbox", label: "✓ Checkbox", tip: "Simple done/not done" },
  { value: "photo", label: "📷 Photo", tip: "Photograph of work" },
  { value: "file", label: "📎 File", tip: "Any file (PDF, doc, audio, video…)" },
  { value: "timer", label: "⏱ Timer", tip: "Timed session" },
  { value: "text", label: "✍ Written", tip: "Text response" },
  { value: "platform_sync", label: "🔗 Platform", tip: "Auto-sync from app" },
];

const SCORING_OPTIONS = [
  { value: "completion", label: "Completion (done / not done)" },
  { value: "review_based", label: "Quality review (parent/AI scores)" },
  { value: "time_based", label: "Time on task (timer vs goal)" },
  { value: "platform_sync", label: "Platform score (external app)" },
  { value: "mixed", label: "Mixed (averaged)" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubjectInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  days: string[];
  onlyStudentKey: string | null;
  defaultDetail: string;
  defaultProofTypes: string[];
  defaultDuration: number;
  defaultRequiresReview: boolean;
}

interface EditState {
  subjectId: string;
  dayOfWeek: number;
  planId: string | null;
  assignmentDetail: string;
  adminNotes: string;
  proofTypes: string[];
  durationMinutes: number | null;
  requiresReview: boolean;
  scoringApproach: string;
}

interface StudentTaskRow {
  id: string;
  status: string;
  subjectId: string;
  subjectName: string;
  subjectCategory?: string;
  cancelledReason: string | null;
}

interface StudentTaskGroup {
  studentKey: string;
  studentId: string;
  tasks: StudentTaskRow[];
}

interface Props {
  subjects: SubjectInfo[];
  initialWeekStart: string;
  initialPlans: LessonPlanRow[];
  weekCalendarEvents: CalendarEvent[];
  todayDate: string; // YYYY-MM-DD
  initialStudentTasks: StudentTaskGroup[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addWeeks(weekStart: string, delta: number): string {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(weekStart: string): string {
  // weekStart is Sunday; school days are Mon (Sun+1) – Fri (Sun+5)
  const mon = new Date(`${weekStart}T12:00:00`);
  mon.setDate(mon.getDate() + 1);
  const fri = new Date(`${weekStart}T12:00:00`);
  fri.setDate(fri.getDate() + 5);
  const fmt = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(mon)} – ${fmt(fri)}`;
}

function isThisWeek(weekStart: string): boolean {
  const today = new Date();
  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - today.getDay()); // back to Sunday
  return weekStart === currentSunday.toISOString().split("T")[0];
}

function inferScoringApproach(proofTypes: string[]): string {
  if (proofTypes.length === 1) {
    if (proofTypes[0] === "checkbox") return "completion";
    if (proofTypes[0] === "timer") return "time_based";
    if (proofTypes[0] === "platform_sync") return "platform_sync";
    if (["photo", "file", "text"].includes(proofTypes[0])) return "review_based";
  }
  if (proofTypes.length > 1) return "mixed";
  return "completion";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LessonPlannerClient({
  subjects,
  initialWeekStart,
  initialPlans,
  weekCalendarEvents,
  todayDate,
  initialStudentTasks,
}: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [plans, setPlans] = useState<LessonPlanRow[]>(initialPlans);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isLoading, startLoading] = useTransition();
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  // ── Calendar adjustments state ────────────────────────────────────────────
  const [studentTasks, setStudentTasks] = useState<StudentTaskGroup[]>(initialStudentTasks);
  const [appliedAdjustments, setAppliedAdjustments] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  // Build proposals for today's events only (tasks already exist)
  const todayEvents = weekCalendarEvents.filter((e) => e.isoDate === todayDate);

  const proposalsByStudent = studentTasks.map((group) => {
    const taskSummaries: TaskSummary[] = group.tasks.map((t) => ({
      id: t.id,
      subjectId: t.subjectId,
      subjectName: t.subjectName,
      subjectCategory: t.subjectCategory,
      status: t.status,
    }));
    return {
      studentKey: group.studentKey,
      proposals: proposeAdjustments(todayEvents, taskSummaries, group.studentKey),
    };
  });

  const allProposals = proposalsByStudent.flatMap((g) => g.proposals.map((p) => ({ ...p, studentKey: g.studentKey })));

  // Toggleable selection — start with all non-protected proposals checked
  const [selectedAdjustments, setSelectedAdjustments] = useState<Set<string>>(
    () => new Set(allProposals.filter((p) => !p.isProtected).map((p) => p.taskId)),
  );

  const toggleAdjustment = (taskId: string) => {
    setSelectedAdjustments((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const applyAdjustments = async () => {
    setIsApplying(true);
    const toApply = allProposals.filter((p) => selectedAdjustments.has(p.taskId) && !appliedAdjustments.has(p.taskId));
    for (const adj of toApply) {
      if (adj.action === "cancel") {
        await cancelTask(adj.taskId, adj.reason);
      } else if (adj.action === "fulfill" && adj.fulfilledByEvent) {
        await fulfillTask(adj.taskId, adj.fulfilledByEvent);
      }
      setAppliedAdjustments((prev) => new Set([...prev, adj.taskId]));
    }
    // Refresh task statuses
    setStudentTasks((prev) =>
      prev.map((group) => ({
        ...group,
        tasks: group.tasks.map((t) => {
          const adj = toApply.find((a) => a.taskId === t.id);
          if (!adj) return t;
          return {
            ...t,
            status: adj.action === "cancel" ? "cancelled" : "approved",
            cancelledReason: adj.action === "cancel" ? adj.reason : null,
          };
        }),
      })),
    );
    setIsApplying(false);
  };

  const undoAdjustment = async (taskId: string) => {
    await restoreTask(taskId);
    setAppliedAdjustments((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    setStudentTasks((prev) =>
      prev.map((group) => ({
        ...group,
        tasks: group.tasks.map((t) => (t.id === taskId ? { ...t, status: "pending", cancelledReason: null } : t)),
      })),
    );
  };

  // ── Generate AI writing prompt ────────────────────────────────────────────
  const generatePrompt = async () => {
    setIsGenerating(true);
    setPromptError(null);
    const result = await generateWritingJournalPrompt();
    setIsGenerating(false);
    if (result.prompt) {
      setEditing((prev) => (prev ? { ...prev, assignmentDetail: result.prompt! } : prev));
    } else {
      setPromptError(result.error ?? "Failed to generate prompt");
    }
  };

  // ── Week navigation ──────────────────────────────────────────────────────
  const goToWeek = useCallback((newWeek: string) => {
    setWeekStart(newWeek);
    setEditing(null);
    startLoading(async () => {
      const fresh = await getLessonPlansForWeek(newWeek);
      setPlans(fresh);
    });
  }, []);

  // ── Plan lookup ──────────────────────────────────────────────────────────
  const getPlan = (subjectId: string, dayOfWeek: number) =>
    plans.find((p) => p.subjectId === subjectId && p.dayOfWeek === dayOfWeek && p.studentId === null) ?? null;

  // ── Open cell for editing ────────────────────────────────────────────────
  const openEdit = (subject: SubjectInfo, dayOfWeek: number) => {
    const existing = getPlan(subject.id, dayOfWeek);
    setEditing({
      subjectId: subject.id,
      dayOfWeek,
      planId: existing?.id ?? null,
      assignmentDetail: existing?.assignmentDetail ?? subject.defaultDetail,
      adminNotes: existing?.adminNotes ?? "",
      proofTypes: existing?.proofTypes ?? subject.defaultProofTypes,
      durationMinutes: existing?.durationMinutes ?? (subject.defaultDuration !== 45 ? subject.defaultDuration : null),
      requiresReview: existing?.requiresReview ?? subject.defaultRequiresReview,
      scoringApproach:
        existing?.scoringApproach ?? inferScoringApproach(existing?.proofTypes ?? subject.defaultProofTypes),
    });
    // Auto-generate a fresh AI prompt whenever a Writing Journal cell is opened
    // without a real custom prompt (no plan, empty, or still the placeholder default).
    const hasCustomPrompt =
      existing?.assignmentDetail &&
      existing.assignmentDetail.trim() !== "" &&
      existing.assignmentDetail !== "Write your journal entry for today.";
    if (subject.id === "writing-journal" && !hasCustomPrompt) {
      generatePrompt();
    }
  };

  // ── Save plan ────────────────────────────────────────────────────────────
  const savePlan = () => {
    if (!editing) return;
    startSaving(async () => {
      const result = await upsertLessonPlan({
        subjectId: editing.subjectId,
        weekStart,
        dayOfWeek: editing.dayOfWeek,
        studentId: null,
        assignmentDetail: editing.assignmentDetail,
        adminNotes: editing.adminNotes,
        proofTypes: editing.proofTypes,
        durationMinutes: editing.durationMinutes,
        requiresReview: editing.requiresReview,
        scoringApproach: editing.scoringApproach,
      });
      if (result.success) {
        // Refresh plans for this week
        const fresh = await getLessonPlansForWeek(weekStart);
        setPlans(fresh);
        setEditing(null);
      }
    });
  };

  // ── Clear plan ───────────────────────────────────────────────────────────
  const clearPlan = () => {
    if (!editing?.planId) {
      setEditing(null);
      return;
    }
    const planId = editing.planId;
    startSaving(async () => {
      await deleteLessonPlan(planId);
      const fresh = await getLessonPlansForWeek(weekStart);
      setPlans(fresh);
      setEditing(null);
    });
  };

  // ── Copy week forward ────────────────────────────────────────────────────
  const copyForward = () => {
    const nextWeek = addWeeks(weekStart, 1);
    startSaving(async () => {
      const result = await copyWeekPlans(weekStart, nextWeek);
      if (result.success) {
        setCopyMsg(`Copied ${result.copied} plans → week of ${formatWeekLabel(nextWeek)}`);
        setTimeout(() => setCopyMsg(null), 4000);
      }
    });
  };

  // ── Toggle proof type ────────────────────────────────────────────────────
  const toggleProofType = (value: string) => {
    if (!editing) return;
    const next = editing.proofTypes.includes(value)
      ? editing.proofTypes.filter((t) => t !== value)
      : [...editing.proofTypes, value];
    const safNext = next.length === 0 ? ["checkbox"] : next;
    setEditing({
      ...editing,
      proofTypes: safNext,
      scoringApproach: inferScoringApproach(safNext),
      durationMinutes: safNext.includes("timer") ? (editing.durationMinutes ?? 30) : null,
    });
  };

  const editingSubject = editing ? subjects.find((s) => s.id === editing.subjectId) : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <PageHeader icon="schedule" title="Lesson Planner" sub="Plan assignments by subject and day" />
        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: 13, padding: "7px 14px" }}
          onClick={copyForward}
          disabled={isSaving || plans.length === 0}
          title="Copy this week's plans to next week"
        >
          Copy Week →
        </button>
      </div>

      {copyMsg && (
        <div
          style={{
            fontSize: 13,
            color: "#70E090",
            padding: "8px 14px",
            background: "rgba(80,200,100,0.08)",
            border: "1px solid rgba(80,200,100,0.25)",
            borderRadius: 7,
          }}
        >
          ✓ {copyMsg}
        </div>
      )}

      {/* Week navigation */}
      <div className="glass" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: "6px 14px", fontSize: 14 }}
          onClick={() => goToWeek(addWeeks(weekStart, -1))}
        >
          ← Prev
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span className="cinzel brass" style={{ fontSize: 14 }}>
            {isThisWeek(weekStart) ? "This Week · " : ""}
            {formatWeekLabel(weekStart)}
          </span>
        </div>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: "6px 14px", fontSize: 14 }}
          onClick={() => goToWeek(addWeeks(weekStart, 1))}
        >
          Next →
        </button>
        {!isThisWeek(weekStart) && (
          <button
            type="button"
            className="btn-brass"
            style={{ padding: "6px 14px", fontSize: 13 }}
            onClick={() => goToWeek(initialWeekStart)}
          >
            Today
          </button>
        )}
      </div>

      {isLoading && <div style={{ textAlign: "center", fontSize: 13, color: "#506070", padding: 8 }}>Loading…</div>}

      {/* Grid */}
      <div className="glass" style={{ padding: 16, overflowX: "auto" }}>
        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px repeat(5, minmax(80px, 1fr))",
            gap: 6,
            marginBottom: 8,
            minWidth: 580,
          }}
        >
          <div />
          {DAYS.map((dayCode, idx) => {
            const isoDate = (() => {
              const d = new Date(`${weekStart}T12:00:00`);
              d.setDate(d.getDate() + idx + 1); // weekStart=Sunday; Mon=+1 … Fri=+5
              return d.toISOString().split("T")[0];
            })();
            const dayEvents = weekCalendarEvents.filter((e) => e.isoDate === isoDate);
            const isToday = isoDate === todayDate;
            return (
              <div
                key={dayCode}
                style={{
                  fontSize: 13,
                  textAlign: "center",
                  padding: "6px 4px 4px",
                  background: isToday ? "rgba(184,134,11,0.14)" : "rgba(184,134,11,0.08)",
                  borderRadius: 5,
                  border: isToday ? "1px solid rgba(232,168,32,0.3)" : "none",
                }}
              >
                <span className="cinzel" style={{ letterSpacing: "0.07em", color: "#E8A820" }}>
                  {DAYS_FULL[idx]}
                </span>
                {dayEvents.map((ev) => (
                  <div
                    key={ev.label}
                    title={`${ev.label} (${ev.durationHours < 2 ? `${ev.durationHours}h` : `${ev.durationHours}h — long event`})`}
                    style={{
                      fontSize: 10,
                      marginTop: 3,
                      padding: "2px 5px",
                      borderRadius: 3,
                      background: ev.durationHours >= 2 ? "rgba(200,80,80,0.18)" : "rgba(74,144,208,0.18)",
                      color: ev.durationHours >= 2 ? "#F08080" : "#7AB4E0",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                    }}
                  >
                    {ev.icon} {ev.label}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Subject rows */}
        {subjects.map((subject) => (
          <div
            key={subject.id}
            style={{
              display: "grid",
              gridTemplateColumns: "180px repeat(5, minmax(80px, 1fr))",
              gap: 6,
              marginBottom: 6,
              minWidth: 580,
            }}
          >
            {/* Subject label */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 8 }}>
              <Icon name={subject.icon} size={24} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: subject.color, lineHeight: 1.2 }}>
                  {subject.name}
                </div>
                {subject.onlyStudentKey && (
                  <div style={{ fontSize: 13, color: "#506070" }}>{subject.onlyStudentKey} only</div>
                )}
              </div>
            </div>

            {/* Day cells */}
            {[0, 1, 2, 3, 4].map((dow) => {
              const dayCode = DAYS[dow];
              const scheduled = subject.days.includes(dayCode);
              const plan = getPlan(subject.id, dow);
              const isEditing = editing?.subjectId === subject.id && editing?.dayOfWeek === dow;

              if (!scheduled) {
                return (
                  <div
                    key={dow}
                    style={{
                      height: 56,
                      borderRadius: 7,
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  />
                );
              }

              return (
                <button
                  key={dow}
                  type="button"
                  onClick={() => openEdit(subject, dow)}
                  title={plan ? plan.assignmentDetail : "Click to add plan"}
                  style={{
                    height: 56,
                    borderRadius: 7,
                    cursor: "pointer",
                    padding: "6px 8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    transition: "all 0.15s",
                    textAlign: "left",
                    width: "100%",
                    background: isEditing
                      ? rgba(subject.color, 0.2)
                      : plan
                        ? rgba(subject.color, 0.12)
                        : "rgba(255,255,255,0.03)",
                    border: isEditing
                      ? `1.5px solid ${rgba(subject.color, 0.7)}`
                      : plan
                        ? `1px solid ${rgba(subject.color, 0.35)}`
                        : "1px dashed rgba(255,255,255,0.12)",
                  }}
                >
                  {plan ? (
                    <>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#C0B080",
                          lineHeight: 1.3,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {plan.assignmentDetail || <span style={{ color: "#506070" }}>No detail</span>}
                      </div>
                      <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
                        {plan.proofTypes.map((pt) => (
                          <span
                            key={pt}
                            style={{
                              fontSize: 13,
                              padding: "1px 4px",
                              borderRadius: 3,
                              background: rgba(subject.color, 0.2),
                              color: subject.color,
                            }}
                          >
                            {pt === "checkbox"
                              ? "✓"
                              : pt === "photo"
                                ? "📷"
                                : pt === "timer"
                                  ? "⏱"
                                  : pt === "text"
                                    ? "✍"
                                    : pt === "file"
                                      ? "📎"
                                      : "🔗"}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: "#3A4858", textAlign: "center" }}>+ Add plan</div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Calendar Adjustments panel — only shown when today has events */}
      {todayEvents.length > 0 && allProposals.length > 0 && (
        <div
          className="glass"
          style={{
            padding: 16,
            border: "1px solid rgba(74,144,208,0.3)",
            background: "rgba(8,20,40,0.6)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div className="cinzel" style={{ fontSize: 13, color: "#7AB4E0", letterSpacing: "0.06em" }}>
                📅 CALENDAR ADJUSTMENTS — TODAY
              </div>
              <div style={{ fontSize: 12, color: "#506070", marginTop: 2 }}>
                {todayEvents.map((e) => `${e.icon} ${e.label} (${e.durationHours}h)`).join(" · ")}
              </div>
            </div>
            <button
              type="button"
              className="btn-brass"
              style={{ fontSize: 13, padding: "7px 16px" }}
              onClick={applyAdjustments}
              disabled={isApplying || selectedAdjustments.size === 0}
            >
              {isApplying ? "Applying…" : "Apply Selected"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {proposalsByStudent.map(({ studentKey, proposals }) =>
              proposals.length === 0 ? null : (
                <div key={studentKey}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#506070",
                      marginBottom: 5,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {studentKey}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {proposals.map((adj) => {
                      const applied = appliedAdjustments.has(adj.taskId);
                      const selected = selectedAdjustments.has(adj.taskId);
                      const actionColor = adj.action === "cancel" ? "#F08080" : "#70E090";
                      const actionLabel = adj.action === "cancel" ? "Cancel" : "Fulfill";
                      return (
                        <div
                          key={adj.taskId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 7,
                            background: applied
                              ? "rgba(80,80,80,0.15)"
                              : selected
                                ? `rgba(${adj.action === "cancel" ? "200,80,80" : "80,200,100"},0.08)`
                                : "rgba(255,255,255,0.03)",
                            border: `1px solid ${applied ? "rgba(255,255,255,0.06)" : selected ? `rgba(${adj.action === "cancel" ? "200,80,80" : "80,200,100"},0.25)` : "rgba(255,255,255,0.08)"}`,
                            opacity: applied ? 0.7 : 1,
                          }}
                        >
                          {/* Toggle checkbox */}
                          {!applied && (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleAdjustment(adj.taskId)}
                              style={{ width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
                            />
                          )}
                          {/* Action badge */}
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 6px",
                              borderRadius: 3,
                              background: `rgba(${adj.action === "cancel" ? "200,80,80" : "80,200,100"},0.15)`,
                              color: actionColor,
                              flexShrink: 0,
                            }}
                          >
                            {actionLabel}
                          </span>
                          {/* Subject name */}
                          <span style={{ fontSize: 13, color: "#C0B080", flex: 1 }}>{adj.subjectName}</span>
                          {/* Reason */}
                          <span style={{ fontSize: 12, color: "#506070" }}>{adj.reason}</span>
                          {/* Protected flag */}
                          {adj.isProtected && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#D4A830",
                                padding: "2px 5px",
                                border: "1px solid rgba(212,168,48,0.3)",
                                borderRadius: 3,
                              }}
                            >
                              protected
                            </span>
                          )}
                          {/* Applied + undo */}
                          {applied && (
                            <button
                              type="button"
                              onClick={() => undoAdjustment(adj.taskId)}
                              style={{
                                fontSize: 11,
                                color: "#506070",
                                background: "none",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 4,
                                padding: "2px 7px",
                                cursor: "pointer",
                              }}
                            >
                              Undo
                            </button>
                          )}
                          {applied && <span style={{ fontSize: 11, color: "#70E090" }}>✓ Applied</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Edit panel — lightbox overlay */}
      {editing && editingSubject && (
        <>
          {/* Backdrop */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "rgba(4,10,22,0.75)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={() => setEditing(null)}
          />
          {/* Panel */}
          <div
            className="glass-warm"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 101,
              width: "calc(100% - 32px)",
              maxWidth: 560,
              maxHeight: "88vh",
              overflowY: "auto",
              padding: 24,
              borderColor: rgba(editingSubject.color, 0.4),
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name={editingSubject.icon} size={32} />
              <div style={{ flex: 1 }}>
                <div className="cinzel" style={{ fontSize: 14, color: editingSubject.color }}>
                  {editingSubject.name}
                </div>
                <div style={{ fontSize: 13, color: "#506070" }}>
                  {DAYS_FULL[editing.dayOfWeek]} · week of {formatWeekLabel(weekStart)}
                </div>
              </div>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "#506070", cursor: "pointer", fontSize: 18 }}
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>

            {/* Assignment detail */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <label htmlFor="edit-detail" style={{ fontSize: 13, color: "#8A9AAA" }}>
                  {editing.subjectId === "writing-journal" ? "AI WRITING PROMPT" : "ASSIGNMENT INSTRUCTIONS"}
                </label>
                {editing.subjectId === "writing-journal" && (
                  <button
                    type="button"
                    onClick={generatePrompt}
                    disabled={isGenerating}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "1px solid rgba(155,164,240,0.5)",
                      background: isGenerating ? "rgba(155,164,240,0.06)" : "rgba(155,164,240,0.14)",
                      color: isGenerating ? "#506070" : "#9BA4F0",
                      cursor: isGenerating ? "default" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {isGenerating ? "✦ Generating…" : "✦ Generate Prompt"}
                  </button>
                )}
              </div>
              {promptError && <div style={{ fontSize: 12, color: "#F08080", marginBottom: 5 }}>{promptError}</div>}
              <textarea
                id="edit-detail"
                className="inp"
                value={editing.assignmentDetail}
                onChange={(e) => setEditing({ ...editing, assignmentDetail: e.target.value })}
                placeholder={
                  editing.subjectId === "writing-journal"
                    ? "Click ✦ Generate Prompt to create an AI writing prompt, or type one manually."
                    : "What should the student do? (e.g. Complete pages 42–44 in the workbook)"
                }
                style={{ minHeight: 72, fontSize: 14, lineHeight: 1.6 }}
              />
            </div>

            {/* Proof types */}
            <div>
              <p style={{ fontSize: 13, color: "#8A9AAA", margin: "0 0 8px" }}>
                HOW DOES THE STUDENT PROVE COMPLETION?
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PROOF_OPTIONS.map((opt) => {
                  const active = editing.proofTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleProofType(opt.value)}
                      title={opt.tip}
                      style={{
                        padding: "7px 13px",
                        borderRadius: 7,
                        border: active
                          ? `1.5px solid ${rgba(editingSubject.color, 0.7)}`
                          : "1px solid rgba(255,255,255,0.12)",
                        background: active ? rgba(editingSubject.color, 0.18) : "rgba(0,0,0,0.2)",
                        color: active ? editingSubject.color : "#506070",
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration — only shown if timer selected */}
            {editing.proofTypes.includes("timer") && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label htmlFor="edit-duration" style={{ fontSize: 13, color: "#8A9AAA", whiteSpace: "nowrap" }}>
                  TIMER GOAL (MINUTES)
                </label>
                <input
                  id="edit-duration"
                  className="inp"
                  type="number"
                  min={1}
                  max={240}
                  value={editing.durationMinutes ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      durationMinutes: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                    })
                  }
                  style={{ width: 90 }}
                  placeholder="30"
                />
              </div>
            )}

            {/* Scoring approach */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label htmlFor="edit-scoring" style={{ fontSize: 13, color: "#8A9AAA", whiteSpace: "nowrap" }}>
                SCORING
              </label>
              <select
                id="edit-scoring"
                className="inp"
                value={editing.scoringApproach}
                onChange={(e) => setEditing({ ...editing, scoringApproach: e.target.value })}
                style={{ flex: 1, minWidth: 200 }}
              >
                {SCORING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Requires review toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={editing.requiresReview}
                onChange={(e) => setEditing({ ...editing, requiresReview: e.target.checked })}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, color: "#9AABBC" }}>Requires parent review before marking complete</span>
            </label>

            {/* Admin notes */}
            <div>
              <label htmlFor="edit-notes" style={{ fontSize: 13, color: "#8A9AAA", display: "block", marginBottom: 5 }}>
                PRIVATE NOTES (not shown to students)
              </label>
              <textarea
                id="edit-notes"
                className="inp"
                value={editing.adminNotes}
                onChange={(e) => setEditing({ ...editing, adminNotes: e.target.value })}
                placeholder="Reminders for yourself…"
                style={{ minHeight: 48, fontSize: 13 }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn-brass"
                style={{ flex: 1, padding: "10px" }}
                onClick={savePlan}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : "Save Plan"}
              </button>
              {editing.planId && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "10px 16px", color: "#F08080", borderColor: "rgba(200,60,60,0.4)", fontSize: 13 }}
                  onClick={clearPlan}
                  disabled={isSaving}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "10px 16px" }}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
