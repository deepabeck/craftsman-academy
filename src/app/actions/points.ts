"use server";

import { createServiceClient } from "@/lib/supabase/service";

// ── Point values ────────────────────────────────────────────────────────────────
const PTS_SUBMIT = 5;
const PTS_DAILY_SUBMIT_BONUS = 20;
const PTS_DAILY_APPROVE_BONUS = 10;
const PTS_WEEKLY_COMPLETE = 50;
const PTS_WEEKLY_GRADE_B = 25;
const PTS_WEEKLY_GRADE_A = 50;
const PTS_WEEKLY_PERFECT = 100;
const PTS_STREAK_FIRST = 500; // 30-day milestone
const PTS_STREAK_REPEAT = 300; // 60, 90, 120… day milestones

const APP_TZ = process.env.APP_TIMEZONE ?? "America/Denver";

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
    // Check if this completed day hit a 30-day streak milestone
    await checkAndAwardStreakMilestone(studentId);
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

// ── Streak milestone bonus ───────────────────────────────────────────────────────

/**
 * Computes the current school-day streak for a student and awards a bonus if
 * the streak just hit a multiple of 30.
 *   First milestone (30 days):  +500 Cogs
 *   Each repeat (60, 90, …):    +300 Cogs
 *
 * Idempotent — source_id = 'streak_30' / 'streak_60' etc. prevents double-awarding.
 * Called after a student completes all tasks for the day.
 */
async function checkAndAwardStreakMilestone(studentId: string) {
  const service = createServiceClient();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ });
  const sixtyDaysAgo = new Date(`${today}T00:00:00`);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 62);
  const sixtyDaysAgoStr = sixtyDaysAgo.toLocaleDateString("en-CA", { timeZone: APP_TZ });

  const { data: tasks } = await service
    .from("tasks")
    .select("task_date, status")
    .eq("student_id", studentId)
    .gte("task_date", sixtyDaysAgoStr)
    .lte("task_date", today);

  if (!tasks) return;

  // Build map: date → true (all done) | false (some incomplete) — skip cancelled tasks
  const byDate: Record<string, boolean> = {};
  for (const t of tasks) {
    if (t.status === "cancelled") continue;
    const done = ["done", "approved", "review"].includes(t.status);
    if (byDate[t.task_date] === undefined) byDate[t.task_date] = done;
    else byDate[t.task_date] = byDate[t.task_date] && done;
  }

  // Walk back day by day, skipping weekends and empty days
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00`);
  for (let i = 0; i < 90; i++) {
    const dow = cursor.getDay();
    const ds = cursor.toLocaleDateString("en-CA", { timeZone: APP_TZ });

    if (dow === 0 || dow === 6) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (byDate[ds] === undefined) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (byDate[ds] === true) {
      streak++;
    } else if (ds !== today) {
      break;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  if (streak === 0 || streak % 30 !== 0) return;

  const milestone = streak; // e.g. 30, 60, 90
  const pts = milestone === 30 ? PTS_STREAK_FIRST : PTS_STREAK_REPEAT;
  const sourceId = `streak_${milestone}`;

  await logPoints({
    student_id: studentId,
    category: "streak_milestone",
    source_id: sourceId,
    source_date: today,
    points: pts,
    note: `${milestone}-day streak bonus! 🔥`,
  });
}

// ── Weekly bonus ────────────────────────────────────────────────────────────────

/**
 * Award weekly bonuses for a completed week. Fully idempotent — safe to call
 * on every week page load; the unique index prevents double-awarding.
 *
 * Bonuses:
 *   +50  all tasks completed (no pending/missed)
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

  // Perfect week: all tasks done, no misses, graded tasks (if any) average A
  // Checkbox/done tasks count as completed — students aren't penalized for task type
  if (allDone && missed === 0 && (approved.length === 0 || avgScore >= 90)) {
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

// ── Unseen points ────────────────────────────────────────────────────────────────

export interface UnseenEntry {
  id: string;
  category: string;
  points: number;
  note: string;
  earned_at: string;
}

/** Returns all points_log entries earned after the student's last seen timestamp.
 *  If points_last_seen_at is NULL (first ever visit), silently initializes it to now
 *  and returns empty — prevents dumping the full historical ledger on first load. */
export async function getUnseenPoints(studentId: string): Promise<UnseenEntry[]> {
  const service = createServiceClient();
  const { data: profile } = await service.from("profiles").select("points_last_seen_at").eq("id", studentId).single();

  const since = profile?.points_last_seen_at ?? null;

  // First-ever visit — initialize timestamp silently, show nothing
  if (!since) {
    await service
      .from("profiles")
      .update({ points_last_seen_at: new Date().toISOString() })
      .eq("id", studentId);
    return [];
  }

  const { data } = await service
    .from("points_log")
    .select("id, category, points, note, earned_at")
    .eq("student_id", studentId)
    .gt("earned_at", since)
    .order("earned_at", { ascending: true });

  return (data ?? []) as UnseenEntry[];
}

/** Updates points_last_seen_at to now for the student. */
export async function markPointsSeen(studentId: string): Promise<void> {
  const service = createServiceClient();
  await service.from("profiles").update({ points_last_seen_at: new Date().toISOString() }).eq("id", studentId);
}

// ── Admin ledger ─────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  student_id: string;
  studentName: string;
  studentColor: string;
  category: string;
  points: number;
  note: string;
  source_date: string | null;
  earned_at: string;
}

/** Returns full points ledger for all students (admin only), newest first. */
export async function getPointsLedger(): Promise<LedgerEntry[]> {
  const service = createServiceClient();
  const { data: logs } = await service
    .from("points_log")
    .select("id, student_id, category, points, note, source_date, earned_at")
    .order("earned_at", { ascending: false });

  const { data: profiles } = await service.from("profiles").select("id, display_name, color").eq("role", "student");

  const profileMap: Record<string, { name: string; color: string }> = {};
  for (const p of profiles ?? []) profileMap[p.id] = { name: p.display_name, color: p.color ?? "#4A90D0" };

  return (logs ?? []).map(
    (l: {
      id: string;
      student_id: string;
      category: string;
      points: number;
      note: string | null;
      source_date: string | null;
      earned_at: string;
    }) => ({
      id: l.id,
      student_id: l.student_id,
      studentName: profileMap[l.student_id]?.name ?? "Unknown",
      studentColor: profileMap[l.student_id]?.color ?? "#4A90D0",
      category: l.category,
      points: l.points,
      note: l.note ?? "",
      source_date: l.source_date,
      earned_at: l.earned_at,
    }),
  );
}
