"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { scoreTaskWithAI } from "./ai-score";
import { awardApprovalPoints, awardSubmissionPoints } from "./points";

/** Called on page load — marks yesterday's missed tasks then generates today's. */
export async function ensureDailyTasks(date: string) {
  const service = createServiceClient();
  const { error: missedErr } = await service.rpc("mark_missed_tasks");
  if (missedErr) console.error("mark_missed_tasks error:", missedErr.message);
  const { error: genErr } = await service.rpc("generate_daily_tasks", { p_date: date });
  if (genErr) console.error("generate_daily_tasks error:", genErr.message, "date:", date);
}

/**
 * Called on the week page — generates tasks for every day Mon–Fri of the given week.
 * Idempotent: ON CONFLICT DO NOTHING in the underlying function.
 */
export async function ensureWeekTasks(weekStart: string) {
  const service = createServiceClient();
  const { error: missedErr } = await service.rpc("mark_missed_tasks");
  if (missedErr) console.error("mark_missed_tasks error:", missedErr.message);
  for (let i = 0; i <= 4; i++) {
    // weekStart is Monday; Mon–Fri are offsets 0–4
    // Use T00:00:00 (no Z) so JS parses as LOCAL date, avoiding UTC day-shift
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const { error } = await service.rpc("generate_daily_tasks", { p_date: date });
    if (error) console.error(`generate_daily_tasks error for ${date}:`, error.message);
  }
}

/** Toggle a checkbox task between pending ↔ done. */
export async function markTaskDone(taskId: string, done: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "pending",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) return { success: false, error: error.message };
  // Award submission points (+5) and check daily bonus (+20) just like submitTaskProof
  if (done && user) {
    after(() => awardSubmissionPoints(taskId, user.id).catch((err) => console.error("[points] checkbox error:", err)));
  }
  return { success: true };
}

/**
 * Save a submission (text / timer / files) and mark the task as 'review' or 'done'.
 * Files are uploaded client-side first, then their storage paths are passed here.
 * One submissions row is inserted per file; timer and text each get their own row.
 */
export async function submitTaskProof(
  taskId: string,
  data: {
    text?: string;
    timerSeconds?: number;
    fileDetails?: { path: string; name: string; mimeType: string }[];
    requiresReview: boolean;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // biome-ignore lint/suspicious/noExplicitAny: dynamic submission rows
  const rows: any[] = [];

  // One row per uploaded file
  for (const f of data.fileDetails ?? []) {
    const isImage = f.mimeType.startsWith("image/");
    const isAudio = f.mimeType.startsWith("audio/");
    const isVideo = f.mimeType.startsWith("video/");
    const submissionType = isImage ? "photo" : isAudio ? "audio" : isVideo ? "video" : "file";
    rows.push({
      task_id: taskId,
      student_id: user.id,
      submission_type: submissionType,
      content: null,
      timer_seconds: null,
      file_url: f.path,
      file_name: f.name,
      file_mime_type: f.mimeType,
    });
  }

  // Timer row (includes any text note as content)
  if (data.timerSeconds) {
    rows.push({
      task_id: taskId,
      student_id: user.id,
      submission_type: "timer",
      content: data.text || null,
      timer_seconds: data.timerSeconds,
      file_url: null,
      file_name: null,
      file_mime_type: null,
    });
  }

  // Text-only row (when no files and no timer)
  if (!data.timerSeconds && !data.fileDetails?.length && data.text) {
    rows.push({
      task_id: taskId,
      student_id: user.id,
      submission_type: "text",
      content: data.text,
      timer_seconds: null,
      file_url: null,
      file_name: null,
      file_mime_type: null,
    });
  }

  // Reject empty submissions — no content means nothing to review or score
  if (rows.length === 0) {
    return { success: false, error: "Nothing to submit — please write a response or attach a file." };
  }

  const { error: subError } = await supabase.from("submissions").insert(rows);
  if (subError) return { success: false, error: subError.message };

  // Update task — goes to 'review' if parent approval required, else 'done'
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

  // Kick off AI scoring in the background after the response is sent
  if (newStatus === "review") {
    after(() => scoreTaskWithAI(taskId).catch((err) => console.error("[tasks] AI scoring error:", err)));
  }
  after(() => awardSubmissionPoints(taskId, user.id).catch((err) => console.error("[points] submission error:", err)));

  return { success: true, status: newStatus };
}

/**
 * Admin approves a task in the review queue.
 * Sets status → 'approved', saves parent score, computes overall score.
 */
export async function approveTask(taskId: string, score: number, reviewerNotes?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // overall_score = 60% completion (100 since submitted) + 40% quality (score)
  const overallScore = Math.round(0.6 * 100 + 0.4 * score);

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "approved",
      parent_score: score,
      final_score: score,
      overall_score: overallScore,
      admin_note: reviewerNotes ?? "",
    })
    .eq("id", taskId);
  if (error) return { success: false, error: error.message };

  after(() => awardApprovalPoints(taskId, score).catch((err) => console.error("[points] approval error:", err)));

  return { success: true };
}

/**
 * Admin re-grades an already-approved task.
 * Updates the score on the task and adjusts the points_log so Cogs reflect the new score.
 */
export async function regradeTask(
  taskId: string,
  newScore: number,
  note?: string,
): Promise<{ success: boolean; error?: string }> {
  const service = createServiceClient();

  // Fetch current task to get student_id
  const { data: task, error: fetchErr } = await service
    .from("tasks")
    .select("id, student_id, final_score")
    .eq("id", taskId)
    .single();
  if (fetchErr || !task) return { success: false, error: fetchErr?.message ?? "Task not found" };

  const overallScore = Math.round(0.6 * 100 + 0.4 * newScore);

  // Update task scores
  const { error: updateErr } = await service
    .from("tasks")
    .update({
      parent_score: newScore,
      final_score: newScore,
      ai_score: newScore,
      overall_score: overallScore,
      admin_note: note ?? "",
    })
    .eq("id", taskId);
  if (updateErr) return { success: false, error: updateErr.message };

  // Adjust points_log: delete old task_approve entry, insert corrected one
  await service
    .from("points_log")
    .delete()
    .eq("student_id", task.student_id)
    .eq("category", "task_approve")
    .eq("source_id", taskId);

  const newPoints = (() => {
    if (newScore >= 90) return 15;
    if (newScore >= 80) return 12;
    if (newScore >= 70) return 8;
    if (newScore >= 60) return 5;
    return 0;
  })();

  if (newPoints > 0) {
    await service.from("points_log").insert({
      student_id: task.student_id,
      category: "task_approve",
      points: newPoints,
      source_id: taskId,
      note: `Approved (re-graded to ${newScore}%)`,
    });
  }

  return { success: true };
}

/**
 * Admin override: update timer_seconds on any task (for manual corrections).
 */
export async function updateTaskTimer(taskId: string, minutes: number) {
  const service = createServiceClient();
  const { error } = await service
    .from("tasks")
    .update({ timer_seconds: Math.round(minutes * 60) })
    .eq("id", taskId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Admin sends a task back for revision.
 * Sets status → 'pending', stores the reason in admin_note, and inserts a
 * permanent revision_request row in submissions so there's a history record.
 */
export async function requestRevision(taskId: string, reviewerNotes?: string, studentId?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "pending",
      admin_note: reviewerNotes ?? "",
    })
    .eq("id", taskId);
  if (error) return { success: false, error: error.message };

  // Log a permanent revision_request record so the history is preserved
  // even after the task is later approved and admin_note is overwritten.
  if (studentId) {
    const service = createServiceClient();
    await service.from("submissions").insert({
      task_id: taskId,
      student_id: studentId,
      submission_type: "revision_request",
      content: reviewerNotes || null,
      timer_seconds: null,
      file_url: null,
      file_name: null,
      file_mime_type: null,
    });
  }

  return { success: true };
}
