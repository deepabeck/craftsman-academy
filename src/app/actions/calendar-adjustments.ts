"use server";

import { createClient } from "@/lib/supabase/server";

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
 * Sets status → 'approved' with a note.
 */
export async function fulfillTask(taskId: string, eventLabel: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
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
  return { success: true };
}
