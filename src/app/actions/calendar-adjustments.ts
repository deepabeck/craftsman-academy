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
