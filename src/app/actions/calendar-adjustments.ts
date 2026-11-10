"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { awardApprovalPoints, awardSubmissionPoints } from "./points";

export interface DayTaskRow {
  id: string;
  status: string;
  subjectId: string;
  subjectName: string;
  cancelledReason: string | null;
}

export interface DayTaskGroup {
  studentKey: string;
  studentId: string;
  tasks: DayTaskRow[];
}

export interface MovedTask {
  subjectId: string;
  fromDate: string;
  toDate: string;
}

/** One-off moves in a Mon–Fri week: cancelled "Moved to …" rows paired with their new date. */
export async function getMovedTasksForWeek(weekStart: string): Promise<MovedTask[]> {
  const service = createServiceClient();
  const end = new Date(`${weekStart}T12:00:00`);
  end.setDate(end.getDate() + 4);
  const endIso = end.toISOString().split("T")[0];
  const { data } = await service
    .from("tasks")
    .select("student_id, subject_id, task_date, status, cancelled_reason")
    .gte("task_date", weekStart)
    .lte("task_date", endIso);
  const rows = data ?? [];
  const out = new Map<string, MovedTask>();
  for (const r of rows) {
    if (r.status !== "cancelled" || !String(r.cancelled_reason ?? "").startsWith("Moved to")) continue;
    const target = rows.find(
      (t) =>
        t.student_id === r.student_id &&
        t.subject_id === r.subject_id &&
        t.status !== "cancelled" &&
        t.task_date > r.task_date,
    );
    if (!target) continue;
    const key = `${r.subject_id}|${r.task_date}|${target.task_date}`;
    out.set(key, { subjectId: r.subject_id as string, fromDate: r.task_date as string, toDate: target.task_date as string });
  }
  return [...out.values()];
}

/** Fetch all tasks for every student on a given date (admin only). */
export async function getTasksForDate(date: string): Promise<DayTaskGroup[]> {
  const service = createServiceClient();
  const { data: profiles } = await service
    .from("profiles")
    .select("id, student_key")
    .not("student_key", "is", null)
    .neq("student_key", "admin");

  const groups = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const { data: tasks } = await service
        .from("tasks")
        .select("id, status, cancelled_reason, subjects!inner(id, name)")
        .eq("student_id", profile.id)
        .eq("task_date", date)
        .order("created_at");
      return {
        studentKey: profile.student_key as string,
        studentId: profile.id as string,
        tasks: (tasks ?? []).map((t) => ({
          id: t.id as string,
          status: t.status as string,
          // biome-ignore lint/suspicious/noExplicitAny: supabase join
          subjectId: (t.subjects as any)?.id as string,
          // biome-ignore lint/suspicious/noExplicitAny: supabase join
          subjectName: (t.subjects as any)?.name as string,
          cancelledReason: (t as any).cancelled_reason as string | null,
        })),
      };
    }),
  );
  return groups;
}

/** Cancel all pending/missed tasks for a student on a date. Returns count cancelled. */
export async function cancelDayTasks(
  studentId: string,
  date: string,
  reason: string,
): Promise<{ success: boolean; cancelled: number; error?: string }> {
  const service = createServiceClient();
  const { data: tasks, error: fetchErr } = await service
    .from("tasks")
    .select("id")
    .eq("student_id", studentId)
    .eq("task_date", date)
    .in("status", ["pending", "missed"]);
  if (fetchErr) return { success: false, cancelled: 0, error: fetchErr.message };
  if (!tasks?.length) return { success: true, cancelled: 0 };

  const ids = tasks.map((t) => t.id);
  const { error } = await service
    .from("tasks")
    .update({ status: "cancelled", cancelled_reason: reason } as never)
    .in("id", ids);
  if (error) return { success: false, cancelled: 0, error: error.message };
  return { success: true, cancelled: ids.length };
}

/** Restore all cancelled tasks for a student on a date back to pending. */
export async function restoreDayTasks(
  studentId: string,
  date: string,
): Promise<{ success: boolean; restored: number; error?: string }> {
  const service = createServiceClient();
  const { data: tasks, error: fetchErr } = await service
    .from("tasks")
    .select("id")
    .eq("student_id", studentId)
    .eq("task_date", date)
    .eq("status", "cancelled");
  if (fetchErr) return { success: false, restored: 0, error: fetchErr.message };
  if (!tasks?.length) return { success: true, restored: 0 };

  const ids = tasks.map((t) => t.id);
  const { error } = await service
    .from("tasks")
    .update({ status: "pending", cancelled_reason: null } as never)
    .in("id", ids);
  if (error) return { success: false, restored: 0, error: error.message };
  return { success: true, restored: ids.length };
}

/**
 * Cancel a task with a human-readable reason (e.g. "Doctor appointment").
 * Sets status → 'cancelled' and saves the reason text.
 */
export async function cancelTask(taskId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "cancelled",
      cancelled_reason: reason,
    } as never)
    .eq("id", taskId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Restore a cancelled task back to pending.
 */
export async function restoreTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "pending",
      cancelled_reason: null,
    } as never)
    .eq("id", taskId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Mark a task as auto-approved (fulfilled by a calendar event).
 * Sets status → 'approved' with a note, and awards full submission + approval
 * points (+5 submit, +15 approve at 100%) just like the normal student → admin flow.
 */
export async function fulfillTask(taskId: string, eventLabel: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch student_id before updating so we can award submission points
  const service = createServiceClient();
  const { data: task } = await service.from("tasks").select("student_id").eq("id", taskId).single();

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "approved",
      admin_note: `Auto-approved: covered by "${eventLabel}"`,
      completed_at: new Date().toISOString(),
      final_score: 100,
    })
    .eq("id", taskId);
  if (error) return { success: false, error: error.message };

  // Award both submission (+5) and approval (+15 at 100%) points.
  // Uses after() so points are logged after the response is sent, same as approveTask.
  if (task?.student_id) {
    after(() =>
      awardSubmissionPoints(taskId, task.student_id).catch((err) =>
        console.error("[points] fulfill submit error:", err),
      ),
    );
    after(() => awardApprovalPoints(taskId, 100).catch((err) => console.error("[points] fulfill approve error:", err)));
  }

  return { success: true };
}

function mondayOfIso(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().split("T")[0];
}

/**
 * One-off move of tasks to a LATER day in the same Mon–Fri week (parent only).
 * The regular schedule is untouched: the original day's task is kept as a cancelled
 * "Moved to …" row (so the daily generator doesn't recreate it) and a matching task
 * is created on — or restored for — the new day.
 */
export async function moveTasksToDay(
  taskIds: string[],
  toDate: string,
): Promise<{ success: boolean; moved: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, moved: 0, error: "Not authenticated" };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { success: false, moved: 0, error: "Admins only" };

  const toDow = new Date(`${toDate}T12:00:00Z`).getUTCDay();
  if (toDow < 1 || toDow > 5) return { success: false, moved: 0, error: "Pick a weekday (Mon–Fri)" };

  const service = createServiceClient();
  const { data: tasks, error: fetchErr } = await service
    .from("tasks")
    .select(
      "id, student_id, subject_id, task_date, status, lesson_plan_id, lesson_detail, proof_type, proof_types, allowed_file_types, scoring_approach, requires_review, duration",
    )
    .in("id", taskIds);
  if (fetchErr) return { success: false, moved: 0, error: fetchErr.message };

  const label = new Date(`${toDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  let moved = 0;
  const problems: string[] = [];
  for (const t of tasks ?? []) {
    if (!["pending", "missed"].includes(t.status)) {
      problems.push("Only tasks that aren't submitted yet can be moved");
      continue;
    }
    if (toDate <= t.task_date || mondayOfIso(toDate) !== mondayOfIso(t.task_date)) {
      problems.push("Pick a later day in the same week");
      continue;
    }

    const { data: target } = await service
      .from("tasks")
      .select("id, status")
      .eq("student_id", t.student_id)
      .eq("subject_id", t.subject_id)
      .eq("task_date", toDate)
      .maybeSingle();

    if (target && target.status !== "cancelled") {
      problems.push(`Already has a task on ${label}`);
      continue;
    }
    if (target) {
      const { error } = await service
        .from("tasks")
        .update({
          status: "pending",
          cancelled_reason: null,
          cancelled_at: null,
          cancelled_by: null,
          lesson_detail: t.lesson_detail,
        } as never)
        .eq("id", target.id);
      if (error) {
        problems.push(error.message);
        continue;
      }
    } else {
      const { error } = await service.from("tasks").insert({
        student_id: t.student_id,
        subject_id: t.subject_id,
        task_date: toDate,
        lesson_plan_id: t.lesson_plan_id,
        lesson_detail: t.lesson_detail,
        proof_type: t.proof_type,
        proof_types: t.proof_types,
        allowed_file_types: t.allowed_file_types,
        scoring_approach: t.scoring_approach,
        requires_review: t.requires_review,
        duration: t.duration,
        status: "pending",
        source: "manual",
      } as never);
      if (error) {
        problems.push(error.message);
        continue;
      }
    }

    const { error: cancelErr } = await service
      .from("tasks")
      .update({
        status: "cancelled",
        cancelled_reason: `Moved to ${label}`,
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
      } as never)
      .eq("id", t.id);
    if (cancelErr) {
      problems.push(cancelErr.message);
      continue;
    }
    moved++;
  }

  if (problems.length > 0) return { success: moved > 0, moved, error: Array.from(new Set(problems)).join("; ") };
  return { success: true, moved };
}
