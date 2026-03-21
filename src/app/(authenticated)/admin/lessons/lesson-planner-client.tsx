"use client";

import { useCallback, useState, useTransition } from "react";
import {
  copyWeekPlans,
  deleteLessonPlan,
  getLessonPlansForWeek,
  type LessonPlanRow,
  upsertLessonPlan,
} from "@/app/actions/lesson-plans";
import { Icon, PageHeader } from "@/components/ui";
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

interface Props {
  subjects: SubjectInfo[];
  initialWeekStart: string;
  initialPlans: LessonPlanRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addWeeks(weekStart: string, delta: number): string {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(weekStart: string): string {
  const d = new Date(`${weekStart}T12:00:00`);
  const end = new Date(d);
  end.setDate(end.getDate() + 4);
  const fmt = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(d)} – ${fmt(end)}`;
}

function isThisWeek(weekStart: string): boolean {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + diff);
  return weekStart === currentMonday.toISOString().split("T")[0];
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

export function LessonPlannerClient({ subjects, initialWeekStart, initialPlans }: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [plans, setPlans] = useState<LessonPlanRow[]>(initialPlans);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isLoading, startLoading] = useTransition();
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

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
          style={{ fontSize: 12, padding: "7px 14px" }}
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
            fontSize: 12,
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
          style={{ padding: "6px 14px", fontSize: 13 }}
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
          style={{ padding: "6px 14px", fontSize: 13 }}
          onClick={() => goToWeek(addWeeks(weekStart, 1))}
        >
          Next →
        </button>
        {!isThisWeek(weekStart) && (
          <button
            type="button"
            className="btn-brass"
            style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={() => goToWeek(initialWeekStart)}
          >
            Today
          </button>
        )}
      </div>

      {isLoading && <div style={{ textAlign: "center", fontSize: 12, color: "#506070", padding: 8 }}>Loading…</div>}

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
          {DAYS_FULL.map((d) => (
            <div
              key={d}
              className="cinzel"
              style={{
                fontSize: 11,
                textAlign: "center",
                letterSpacing: "0.07em",
                color: "#E8A820",
                padding: "6px 0",
                background: "rgba(184,134,11,0.08)",
                borderRadius: 5,
              }}
            >
              {d}
            </div>
          ))}
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
                <div style={{ fontSize: 12, fontWeight: 600, color: subject.color, lineHeight: 1.2 }}>
                  {subject.name}
                </div>
                {subject.onlyStudentKey && (
                  <div style={{ fontSize: 10, color: "#506070" }}>{subject.onlyStudentKey} only</div>
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
                          fontSize: 10,
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
                              fontSize: 9,
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
                    <div style={{ fontSize: 10, color: "#3A4858", textAlign: "center" }}>+ Add plan</div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

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
              <div style={{ fontSize: 11, color: "#506070" }}>
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
            <label htmlFor="edit-detail" style={{ fontSize: 11, color: "#8A9AAA", display: "block", marginBottom: 5 }}>
              ASSIGNMENT INSTRUCTIONS
            </label>
            <textarea
              id="edit-detail"
              className="inp"
              value={editing.assignmentDetail}
              onChange={(e) => setEditing({ ...editing, assignmentDetail: e.target.value })}
              placeholder="What should the student do? (e.g. Complete pages 42–44 in the workbook)"
              style={{ minHeight: 72, fontSize: 13, lineHeight: 1.6 }}
            />
          </div>

          {/* Proof types */}
          <div>
            <p style={{ fontSize: 11, color: "#8A9AAA", margin: "0 0 8px" }}>HOW DOES THE STUDENT PROVE COMPLETION?</p>
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
                      fontSize: 12,
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
              <label htmlFor="edit-duration" style={{ fontSize: 11, color: "#8A9AAA", whiteSpace: "nowrap" }}>
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
            <label htmlFor="edit-scoring" style={{ fontSize: 11, color: "#8A9AAA", whiteSpace: "nowrap" }}>
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
            <span style={{ fontSize: 12, color: "#9AABBC" }}>Requires parent review before marking complete</span>
          </label>

          {/* Admin notes */}
          <div>
            <label htmlFor="edit-notes" style={{ fontSize: 11, color: "#8A9AAA", display: "block", marginBottom: 5 }}>
              PRIVATE NOTES (not shown to students)
            </label>
            <textarea
              id="edit-notes"
              className="inp"
              value={editing.adminNotes}
              onChange={(e) => setEditing({ ...editing, adminNotes: e.target.value })}
              placeholder="Reminders for yourself…"
              style={{ minHeight: 48, fontSize: 12 }}
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
                style={{ padding: "10px 16px", color: "#F08080", borderColor: "rgba(200,60,60,0.4)", fontSize: 12 }}
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
