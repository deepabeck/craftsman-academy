"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Upserts the parent note for a student's weekly ai_notes row.
 * Creates the row if it doesn't exist yet for this week.
 */
export async function saveParentNote(
  studentId: string,
  weekStart: string,
  parentNote: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_notes")
    .upsert(
      { student_id: studentId, week_start: weekStart, parent_note: parentNote },
      { onConflict: "student_id,week_start" },
    );
  if (error) return { success: false, error: error.message };
  return { success: true };
}
