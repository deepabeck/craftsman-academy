"use server";

import { createServiceClient } from "@/lib/supabase/service";

// ── Point values ────────────────────────────────────────────────────────────────
const PTS_SUBMIT = 5;
const PTS_DAILY_SUBMIT_BONUS = 20;
const PTS_DAILY_APPROVE_BONUS = 10;
const PTS_WEEKLY_COMPLETE = 50;
const PTS_WEEKLY_NO_MISS = 30;
const PTS_WEEKLY_GRADE_B = 25;
const PTS_WEEKLY_GRADE_A = 50;
const PTS_WEEKLY_PERFECT = 100;

function scoreToApprovalPoints(score: number): number {
  if (score >= 90) return 15;
  if (score >= 80) return 12;
  if (score >= 70) return 8;
  if (score >= 60) return 5;
  return 0;
}

/** Insert a points_log row; silently ignores duplicates (unique constraint). */
async function logPoints(row: {
  student_id: string;
  category: string;
  source_id?: string | null;
  source_date?: string | null;
  points: number;
  note: string;
}) {
  const service = createServiceClient();
  const { error } = await service.from("points_log").insert(row);
  // 23505 = unique_violation — expected when bonus already awarded
  if (error && error.code !== "23505") {
    console.error("[points] insert error:", error.message, "category:", row.category);
  }
}

// ── Per-task events ─────────────────────────────────────────────────────────────

/**
 * Award 5 pts when a task is submitted. Also checks if all tasks for that day
 * are now submitted and awards the daily submission bonus (+20 pts) if so.
 * Calls from submitTaskProof via after() — runs after response is sent.
 */
export async function awardSubmissionPoints(taskId: string, studentId: string) {
  const service = createServiceClient();

  const { data: task } = await service.from("tasks").select("task_date").eq("id", taskId).single();
  if (!task) return;

  const date: string = task.task_date;

  await logPoints({
    student_id: studentId,
    category: "task_submit",
    source_id: taskId,
    source_date: date,
    points: PTS_SUBMIT,
    note: "Task submitted",
  });

  // Daily submission bonus — all tasks submitted (any non-cancelled status except pending/missed)
  const { data: dayTasks } = await service
    .from("tasks")
    .select("status")
    .eq("student_id", studentId)
    .eq("task_date", date)
    .neq("status", "cancelled");

  if (dayTasks && dayTasks.length > 0 && dayTasks.every((t) => ["done", "review", "approved"].includes(t.status))) {
    await logPoints({
      student_id: studentId,
      category: "daily_submit_bonus",
      source_date: date,
      points: PTS_DAILY_SUBMIT_BONUS,
      note: "All tasks submitted today",
    });
  }
}

/**
 * Award grade-based pts when a task is approved. Also checks if all tasks for
 * that day are now approved and awards the daily approval bonus (+10 pts) if so.
 * Called from approveTask via after() — runs after response is sent.
 */
export async function awardApprovalPoints(taskId: string, score: number) {
  const service = createServiceClient();

  const { data: task } = await service.from("tasks").select("student_id, task_date").eq("id", taskId).single();
  if (!task) return;

  const { student_id: studentId, task_date: date } = task;
  const pts = scoreToApprovalPoints(score);

  if (pts > 0) {
    await logPoints({
      student_id: studentId,
      category: "task_approve",
      source_id: taskId,
      source_date: date,
      points: pts,
      note: `Approved: ${score}%`,
    });
  }

  // Daily approval bonus — all tasks approved for the day
  const { data: dayTasks } = await service
    .from("tasks")
    .select("status")
    .eq("student_id", studentId)
    .eq("task_date", date)
    .neq("status", "cancelled");

  if (dayTasks && dayTasks.length > 0 && dayTasks.every((t) => t.status === "approved")) {
    await logPoints({
      student_id: studentId,
      category: "daily_approve_bonus",
      source_date: date,
      points: PTS_DAILY_APPROVE_BONUS,
      note: "All tasks approved today",
    });
  }
}

// ── Weekly bonus ────────────────────────────────────────────────────────────────

/**
 * Award weekly bonuses for a completed week. Fully idempotent — safe to call
 * on every week page load; the unique index prevents double-awarding.
 *
 * Bonuses:
 *   +50  all tasks completed (no pending/missed)
 *   +30  zero missed tasks
 *   +25  weekly average ≥ 80% (B)
 *   +50  weekly average ≥ 90% (A) — replaces the B bonus
 *   +100 perfect week: all done + no misses + A average
 */
export async function awardWeeklyBonus(studentId: string, weekStart: string, weekEnd: string) {
  const service = createServiceClient();

  const { data: weekTasks } = await service
    .from("tasks")
    .select("id, status, final_score")
    .eq("student_id", studentId)
    .gte("task_date", weekStart)
    .lte("task_date", weekEnd)
    .neq("status", "cancelled");

  if (!weekTasks || weekTasks.length === 0) return;

  const missed = weekTasks.filter((t) => t.status === "missed").length;
  const allDone = weekTasks.every((t) => ["done", "approved"].includes(t.status));
  const approved = weekTasks.filter((t) => t.status === "approved" && t.final_score != null);
  const avgScore =
    approved.length > 0 ? approved.reduce((sum, t) => sum + (t.final_score ?? 0), 0) / approved.length : 0;

  if (allDone) {
    await logPoints({
      student_id: studentId,
      category: "weekly_complete",
      source_date: weekStart,
      points: PTS_WEEKLY_COMPLETE,
      note: "All tasks completed this week",
    });
  }

  if (missed === 0) {
    await logPoints({
      student_id: studentId,
      category: "weekly_no_miss",
      source_date: weekStart,
      points: PTS_WEEKLY_NO_MISS,
      note: "Zero missed tasks this week",
    });
  }

  if (approved.length > 0) {
    if (avgScore >= 90) {
      await logPoints({
        student_id: studentId,
        category: "weekly_grade_a",
        source_date: weekStart,
        points: PTS_WEEKLY_GRADE_A,
        note: `Weekly average ${Math.round(avgScore)}% — A`,
      });
    } else if (avgScore >= 80) {
      await logPoints({
        student_id: studentId,
        category: "weekly_grade_b",
        source_date: weekStart,
        points: PTS_WEEKLY_GRADE_B,
        note: `Weekly average ${Math.round(avgScore)}% — B`,
      });
    }
  }

  // Perfect week: all tasks done, no misses, every approved task is A-level
  if (allDone && missed === 0 && avgScore >= 90 && approved.length === weekTasks.length) {
    await logPoints({
      student_id: studentId,
      category: "weekly_perfect",
      source_date: weekStart,
      points: PTS_WEEKLY_PERFECT,
      note: "Perfect week — all A's, no misses!",
    });
  }
}

// ── Balance queries ─────────────────────────────────────────────────────────────

/** Lifetime points balance for a student. */
export async function getStudentBalance(studentId: string): Promise<number> {
  const service = createServiceClient();
  const { data } = await service.from("points_log").select("points").eq("student_id", studentId);
  return (data ?? []).reduce((sum, r) => sum + r.points, 0);
}
