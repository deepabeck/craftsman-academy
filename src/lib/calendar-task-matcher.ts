/**
 * Calendar ↔ Task matching logic.
 *
 * Two effects of a calendar event on a day's tasks:
 *  1. FULFILLMENT  — event covers a subject (e.g. "CU Science Class" → Science)
 *  2. CANCELLATION — event takes time, displacing lower-priority tasks
 *     < 2 hours  → cancel 1 lowest-priority task
 *     ≥ 2 hours  → cancel everything except Math + student's protected elective
 */

import type { CalendarEvent } from "./types";

// ── Keyword → subject ID mapping ─────────────────────────────────────────────
// Order matters: more-specific phrases must come before shorter ones.
export const KEYWORD_FULFILLMENTS: { keywords: string[]; subjectId: string | null; category?: string }[] = [
  { keywords: ["field trip science"], subjectId: "science" },
  { keywords: ["field trip outdoors", "outdoor field trip"], subjectId: "pe" },
  {
    keywords: ["field trip arts", "arts field trip", "art museum", "art tour"],
    subjectId: null,
    category: "Enrichment",
  },
  { keywords: ["playdate"], subjectId: "pe" },
  { keywords: ["cu science class", "science class", "science"], subjectId: "science" },
  { keywords: ["piano lesson", "piano class"], subjectId: "piano" },
  { keywords: ["music lesson", "music class", "music composition"], subjectId: "music" },
  { keywords: ["coding class", "coding camp"], subjectId: "coding" },
];

// ── Protection rules ─────────────────────────────────────────────────────────
/** Always protected — never auto-cancelled regardless of event duration. */
export const ALWAYS_PROTECTED_SUBJECTS = new Set(["math"]);

/** Per-student electives that survive even a long event (admin can still override). */
export const STUDENT_PROTECTED_SUBJECTS: Record<string, string[]> = {
  deven: ["coding"],
  shaan: ["piano", "music"],
};

// ── Cancellation priority ─────────────────────────────────────────────────────
/**
 * Subjects ordered from lowest priority (cancel first) to highest.
 * Anything not in this list is treated as medium priority (after enrichment).
 */
export const CANCEL_PRIORITY: string[] = [
  "pe", // first to go
  "writing-journal",
  "apex",
  "apex-hw",
  "geo",
  "lang",
  "reading",
  "science",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TaskSummary {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCategory?: string;
  status: string;
}

export type AdjustmentAction = "cancel" | "fulfill";

export interface CalendarAdjustment {
  taskId: string;
  subjectId: string;
  subjectName: string;
  action: AdjustmentAction;
  reason: string; // display reason, e.g. event label
  isProtected: boolean; // true = admin can override but it's flagged as unusual
  fulfilledByEvent?: string; // event label, for fulfill actions
}

// ── Matching helpers ──────────────────────────────────────────────────────────

/** Returns the matching subjectId (or category info) for a given event label. */
export function matchFulfillment(eventLabel: string): { subjectId: string | null; category?: string } | null {
  const lower = eventLabel.toLowerCase();
  for (const entry of KEYWORD_FULFILLMENTS) {
    if (entry.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { subjectId: entry.subjectId, category: entry.category };
    }
  }
  return null;
}

/** Returns whether a subject is protected for a given student. */
function isProtected(subjectId: string, studentKey: string): boolean {
  if (ALWAYS_PROTECTED_SUBJECTS.has(subjectId)) return true;
  const studentProtected = STUDENT_PROTECTED_SUBJECTS[studentKey] ?? [];
  return studentProtected.includes(subjectId);
}

/**
 * Sorts tasks from lowest priority (cancel first) to highest.
 * Tasks already cancelled/done are skipped in cancellation logic.
 */
function sortByCancelPriority(tasks: TaskSummary[]): TaskSummary[] {
  return [...tasks].sort((a, b) => {
    const ai = CANCEL_PRIORITY.indexOf(a.subjectId);
    const bi = CANCEL_PRIORITY.indexOf(b.subjectId);
    const aScore = ai === -1 ? CANCEL_PRIORITY.length : ai;
    const bScore = bi === -1 ? CANCEL_PRIORITY.length : bi;
    return aScore - bScore; // lower index = lower priority = cancel first
  });
}

// ── Main proposal function ────────────────────────────────────────────────────

/**
 * Given today's calendar events and a student's pending tasks,
 * returns a list of proposed adjustments (fulfillments + cancellations).
 * The admin reviews and approves these before they are applied.
 */
export function proposeAdjustments(
  events: CalendarEvent[],
  tasks: TaskSummary[],
  studentKey: string,
): CalendarAdjustment[] {
  const adjustments: CalendarAdjustment[] = [];
  // Track which tasks have already been proposed for cancellation this pass
  const proposedCancel = new Set<string>();

  // Pending tasks only (already done tasks aren't affected)
  const pendingTasks = tasks.filter((t) => t.status === "pending");

  for (const event of events) {
    // ── 1. Fulfillment ──────────────────────────────────────────────────────
    const match = matchFulfillment(event.label);
    if (match) {
      // Find the matching task
      const matchedTask = match.subjectId
        ? pendingTasks.find((t) => t.subjectId === match.subjectId)
        : match.category
          ? pendingTasks.find((t) => t.subjectCategory === match.category)
          : null;

      if (matchedTask) {
        adjustments.push({
          taskId: matchedTask.id,
          subjectId: matchedTask.subjectId,
          subjectName: matchedTask.subjectName,
          action: "fulfill",
          reason: `Covered by "${event.label}"`,
          isProtected: false,
          fulfilledByEvent: event.label,
        });
        // Don't also propose cancelling a task we're fulfilling
        proposedCancel.add(matchedTask.id);
      }
    }

    // ── 2. Cancellation ─────────────────────────────────────────────────────
    const isLongEvent = event.durationHours >= 2;
    const cancelCandidates = sortByCancelPriority(pendingTasks.filter((t) => !proposedCancel.has(t.id)));

    if (isLongEvent) {
      // Cancel everything non-protected
      for (const task of cancelCandidates) {
        const protected_ = isProtected(task.subjectId, studentKey);
        adjustments.push({
          taskId: task.id,
          subjectId: task.subjectId,
          subjectName: task.subjectName,
          action: "cancel",
          reason: event.label,
          isProtected: protected_,
        });
        proposedCancel.add(task.id);
      }
    } else {
      // Cancel 1 lowest-priority task (first unprotected candidate)
      const toCancel = cancelCandidates.find((t) => !isProtected(t.subjectId, studentKey));
      if (toCancel) {
        adjustments.push({
          taskId: toCancel.id,
          subjectId: toCancel.subjectId,
          subjectName: toCancel.subjectName,
          action: "cancel",
          reason: event.label,
          isProtected: false,
        });
        proposedCancel.add(toCancel.id);
      }
    }
  }

  return adjustments;
}
