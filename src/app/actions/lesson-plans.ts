"use server";

import { getAdminHouseholdId } from "@/lib/get-admin-household";
import { createClient } from "@/lib/supabase/server";

export interface LessonPlanRow {
  id: string;
  subjectId: string;
  weekStart: string;
  dayOfWeek: number;
  studentId: string | null;
  assignmentDetail: string;
  adminNotes: string;
  proofTypes: string[];
  durationMinutes: number | null;
  requiresReview: boolean;
  scoringApproach: string;
}

/** Fetch all lesson plans for a given Monday week-start date, scoped to the caller's household. */
export async function getLessonPlansForWeek(weekStart: string): Promise<LessonPlanRow[]> {
  const supabase = await createClient();
  const householdId = await getAdminHouseholdId();
  const { data, error } = await supabase
    .from("lesson_plans")
    .select("*")
    .eq("week_start", weekStart)
    .eq("household_id", householdId ?? "");
  if (error) {
    console.error("getLessonPlansForWeek:", error.message);
    return [];
  }
  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  return (data ?? []).map((row: any) => ({
    id: row.id,
    subjectId: row.subject_id,
    weekStart: row.week_start,
    dayOfWeek: row.day_of_week,
    studentId: row.student_id,
    assignmentDetail: row.assignment_detail ?? "",
    adminNotes: row.admin_notes ?? "",
    proofTypes: row.proof_types ?? ["checkbox"],
    durationMinutes: row.duration_minutes ?? null,
    requiresReview: row.requires_review ?? false,
    scoringApproach: row.scoring_approach ?? "completion",
  }));
}

export interface UpsertLessonPlanInput {
  subjectId: string;
  weekStart: string;
  dayOfWeek: number;
  studentId: string | null;
  assignmentDetail: string;
  adminNotes: string;
  proofTypes: string[];
  durationMinutes: number | null;
  requiresReview: boolean;
  scoringApproach: string;
}

/** Create or update a lesson plan for a specific subject + week + day slot. */
export async function upsertLessonPlan(plan: UpsertLessonPlanInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };
  const householdId = await getAdminHouseholdId();
  if (!householdId) return { success: false, error: "No household found" };

  // Check for existing plan in this slot (handles NULL student_id correctly)
  let query = supabase
    .from("lesson_plans")
    .select("id")
    .eq("subject_id", plan.subjectId)
    .eq("week_start", plan.weekStart)
    .eq("day_of_week", plan.dayOfWeek);

  if (plan.studentId) {
    query = query.eq("student_id", plan.studentId);
  } else {
    query = query.is("student_id", null);
  }

  const { data: existing } = await query.maybeSingle();

  const payload = {
    assignment_detail: plan.assignmentDetail,
    admin_notes: plan.adminNotes,
    proof_types: plan.proofTypes,
    duration_minutes: plan.durationMinutes,
    requires_review: plan.requiresReview,
    scoring_approach: plan.scoringApproach,
    created_by: user.id,
  };

  let planId: string;
  if (existing) {
    const { error } = await supabase.from("lesson_plans").update(payload).eq("id", existing.id);
    if (error) return { success: false, error: error.message };
    planId = existing.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("lesson_plans")
      .insert({
        subject_id: plan.subjectId,
        week_start: plan.weekStart,
        day_of_week: plan.dayOfWeek,
        student_id: plan.studentId,
        household_id: householdId,
        ...payload,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    planId = inserted.id;
  }

  // Back-fill any already-generated tasks for this subject+day with the new
  // lesson detail (task generation snapshots the plan at creation time, so
  // tasks created before the plan is saved need patching here).
  //
  // lesson_detail is updated on ALL tasks regardless of status — students need
  // to see the current note even mid-week and even after submitting for review.
  // Settings that affect submission (proof_types, scoring, duration) are only
  // patched on tasks still in "pending" since changing them after a submission
  // would be confusing and incorrect.
  const service = (await import("@/lib/supabase/service")).createServiceClient();
  const taskDate = (() => {
    const d = new Date(`${plan.weekStart}T12:00:00`);
    d.setDate(d.getDate() + plan.dayOfWeek); // weekStart=Monday; dow 0=Mon … 4=Fri
    return d.toISOString().split("T")[0];
  })();

  // 1) Update lesson_detail + lesson_plan_id on every task for this slot
  if (plan.assignmentDetail) {
    await service
      .from("tasks")
      .update({
        lesson_plan_id: planId,
        lesson_detail: plan.assignmentDetail,
      })
      .eq("subject_id", plan.subjectId)
      .eq("task_date", taskDate);
  }

  // 2) Update submission settings only on tasks not yet submitted
  await service
    .from("tasks")
    .update({
      lesson_plan_id: planId,
      requires_review: plan.requiresReview,
      proof_types: plan.proofTypes,
      scoring_approach: plan.scoringApproach,
      ...(plan.durationMinutes != null ? { duration: plan.durationMinutes } : {}),
    })
    .eq("subject_id", plan.subjectId)
    .eq("task_date", taskDate)
    .eq("status", "pending");

  return { success: true };
}

/** Delete a lesson plan by ID. */
export async function deleteLessonPlan(planId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_plans").delete().eq("id", planId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Copy all lesson plans from one week to another (bulk copy forward). */
export async function copyWeekPlans(fromWeek: string, toWeek: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };
  const householdId = await getAdminHouseholdId();
  if (!householdId) return { success: false, error: "No household found" };

  const plans = await getLessonPlansForWeek(fromWeek);
  if (plans.length === 0) return { success: true, copied: 0 };

  // Insert all, ignoring conflicts (already planned slots stay as-is)
  const rows = plans.map((p) => ({
    subject_id: p.subjectId,
    week_start: toWeek,
    day_of_week: p.dayOfWeek,
    student_id: p.studentId,
    household_id: householdId,
    assignment_detail: p.assignmentDetail,
    admin_notes: p.adminNotes,
    proof_types: p.proofTypes,
    duration_minutes: p.durationMinutes,
    requires_review: p.requiresReview,
    scoring_approach: p.scoringApproach,
    created_by: user.id,
  }));

  // Insert in chunks, skipping conflicts via the partial unique indexes
  const { error } = await supabase.from("lesson_plans").upsert(rows, { ignoreDuplicates: true });
  if (error) return { success: false, error: error.message };
  return { success: true, copied: rows.length };
}
