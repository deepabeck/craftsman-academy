"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Called on page load — marks yesterday's missed tasks then generates today's. */
export async function ensureDailyTasks(date: string) {
  const service = createServiceClient();
  await service.rpc("mark_missed_tasks");
  await service.rpc("generate_daily_tasks", { p_date: date });
}

/** Toggle a checkbox task between pending ↔ done. */
export async function markTaskDone(taskId: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "pending",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Save a submission (text / timer) and mark the task as 'review' or 'done'.
 * File uploads are handled client-side via Supabase Storage and passed as
 * an array of already-uploaded storage paths.
 */
export async function submitTaskProof(
  taskId: string,
  data: {
    text?: string;
    timerSeconds?: number;
    filePaths?: string[]; // Supabase Storage paths, already uploaded
    requiresReview: boolean;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Determine submission type
  const submissionType = data.timerSeconds
    ? "timer"
    : (data.filePaths?.length ?? 0) > 0
      ? "file"
      : "text";

  // Insert submission record
  const { error: subError } = await supabase.from("submissions").insert({
    task_id: taskId,
    student_id: user.id,
    submission_type: submissionType,
    content: data.text || null,
    timer_seconds: data.timerSeconds || null,
    file_url: data.filePaths?.[0] ?? null, // primary file
  });
  if (subError) return { success: false, error: subError.message };

  // Update task status — goes to 'review' if parent review required, else 'done'
  const newStatus = data.requiresReview ? "review" : "done";
  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      status: newStatus,
      notes: data.text || "",
      timer_seconds: data.timerSeconds || 0,
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);
  if (taskError) return { success: false, error: taskError.message };

  return { success: true, status: newStatus };
}
