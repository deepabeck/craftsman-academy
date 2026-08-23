"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Generate (or regenerate) the frozen report card summary for a school year.
 * Calls the generate_report_card() DB function, which self-checks that the
 * caller is an admin for the target student's household. Regeneration
 * refreshes the computed stats but never touches parent_notes.
 */
export async function generateReportCard(schoolYearId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("generate_report_card", { p_school_year_id: schoolYearId });
  if (error) return { error: error.message };
  revalidatePath("/admin/archive");
  revalidatePath("/student/archive");
  return {};
}

/** Admin-only: save freeform end-of-year notes on an already-generated report card. */
export async function updateReportCardNotes(reportCardId: string, notes: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_report_card_notes", {
    p_report_card_id: reportCardId,
    p_notes: notes,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/archive");
  revalidatePath("/student/archive");
  return {};
}
