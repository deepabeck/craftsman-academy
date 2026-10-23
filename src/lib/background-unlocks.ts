import { BACKGROUND_UNLOCK_START, BACKGROUNDS } from "@/lib/backgrounds";
import { createServiceClient } from "@/lib/supabase/service";

// Server-side helpers for background unlocks. Not a "use server" file on purpose:
// nothing here should be callable straight from the browser.

const APP_TZ = process.env.APP_TIMEZONE ?? "America/Denver";

/** YYYY-MM-DD + n days (pure calendar math, no timezone involved). */
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Today's date in the app's timezone, YYYY-MM-DD. */
export function todayInAppTz(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

/** Monday of the most recent Mon–Fri week that has fully ended (today is Saturday or later). */
export function lastFinishedWeekStart(today: string): string {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=Sun … 6=Sat
  // Sat/Sun: the week that just ended started this past Monday. Mon–Fri: it started 7 days before this Monday.
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  return dow === 6 || dow === 0 ? addDays(today, -daysSinceMonday) : addDays(today, -daysSinceMonday - 7);
}

/**
 * Award one random, not-yet-owned background if the student closed out the whole
 * Mon–Fri week starting `weekStart` (every non-cancelled task submitted: done/review/approved) and
 * the week is over. Idempotent: one award per student per week, never a duplicate.
 * Returns the awarded background id, or null if nothing was awarded.
 */
export async function maybeAwardWeeklyBackground(studentId: string, weekStart: string): Promise<string | null> {
  if (weekStart < BACKGROUND_UNLOCK_START) return null;
  const weekEnd = addDays(weekStart, 4);
  if (todayInAppTz() <= weekEnd) return null; // week isn't over yet

  const service = createServiceClient();

  const { data: tasks } = await service
    .from("tasks")
    .select("status")
    .eq("student_id", studentId)
    .gte("task_date", weekStart)
    .lte("task_date", weekEnd)
    .neq("status", "cancelled");
  if (!tasks || tasks.length === 0) return null;
  // Submitted counts: tasks still waiting on parent review (status "review") don't hold the unlock back.
  if (!tasks.every((t) => t.status === "done" || t.status === "approved" || t.status === "review")) return null;

  const { data: owned } = await service
    .from("background_unlocks")
    .select("background_id, week_start")
    .eq("student_id", studentId);
  if (owned?.some((r) => r.week_start === weekStart)) return null; // already awarded for this week

  const have = new Set((owned ?? []).map((r) => r.background_id as string));
  const pool = BACKGROUNDS.filter((b) => !have.has(b.id));
  if (pool.length === 0) return null; // collection complete

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const { error } = await service.from("background_unlocks").insert({
    student_id: studentId,
    background_id: pick.id,
    source: "weekly",
    week_start: weekStart,
  });
  if (error) {
    // 23505 = another request awarded this week first; that's fine.
    if (error.code !== "23505") console.error("[backgrounds] award insert:", error.message);
    return null;
  }
  return pick.id;
}
