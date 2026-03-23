"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Subject } from "@/lib/types";

/** Today as YYYY-MM-DD in local time */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday of the current week as YYYY-MM-DD */
function currentWeekMonday(): string {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Slugify a subject name into a stable ID for new subjects. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function saveSubject(subject: Subject): Promise<{ error?: string }> {
  const supabase = await createClient();
  const service = createServiceClient();

  const id = subject.id.startsWith("new-") ? slugify(subject.name) || `subj-${Date.now()}` : subject.id;

  // Fetch old days before updating so we can detect changes
  const { data: existing } = await supabase.from("subjects").select("days").eq("id", id).maybeSingle();
  // biome-ignore lint/suspicious/noExplicitAny: days can be string[] or number[] depending on DB type
  const oldDays: any[] = existing?.days ?? [];
  // biome-ignore lint/suspicious/noExplicitAny: days can be string[] or number[] depending on Subject type
  const newDays: any[] = subject.days ?? [];
  const daysChanged =
    oldDays.length !== newDays.length ||
    oldDays.some((d) => !newDays.includes(d)) ||
    newDays.some((d) => !oldDays.includes(d));

  const { error } = await supabase.from("subjects").upsert(
    {
      id,
      name: subject.name,
      icon: subject.icon,
      color: subject.color,
      days: subject.days,
      only_student_key: subject.only ?? null,
      active: subject.active ?? true,
      category: subject.category ?? "Core Academic",
      proof_types: subject.proofTypes ?? ["checkbox"],
      requires_review: subject.requiresReview ?? false,
      duration_minutes: subject.duration ?? 45,
      external_platform: subject.externalPlatform ?? null,
      detail: subject.detail ?? "",
      sort_order: subject.sortOrder ?? 999,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { error: error.message };

  // Always resync pending tasks for the rest of this week when subject is saved
  if (daysChanged || !daysChanged) {
    const today = todayLocal();
    const monday = currentWeekMonday();

    // Delete all pending tasks for this subject from today through Friday
    await service
      .from("tasks")
      .delete()
      .eq("subject_id", id)
      .eq("status", "pending")
      .gte("task_date", today)
      .lte(
        "task_date",
        (() => {
          const fri = new Date(`${monday}T00:00:00`);
          fri.setDate(fri.getDate() + 4);
          return `${fri.getFullYear()}-${String(fri.getMonth() + 1).padStart(2, "0")}-${String(fri.getDate()).padStart(2, "0")}`;
        })(),
      );

    // Re-run generate_daily_tasks for each remaining day — recreates on correct new days
    for (let i = 0; i <= 4; i++) {
      const d = new Date(`${monday}T00:00:00`);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dateStr >= today) {
        await service.rpc("generate_daily_tasks", { p_date: dateStr });
      }
    }
  }

  revalidatePath("/admin/subjects");
  revalidatePath("/admin/lessons");
  revalidatePath("/student/week");
  revalidatePath("/student/today");
  return {};
}

export async function deleteSubject(id: string): Promise<{ error?: string }> {
  const service = createServiceClient();

  // Guard: block deletion if any completed/reviewed tasks exist for this subject.
  // Deactivate instead — historical records must be preserved.
  const { count } = await service
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", id)
    .in("status", ["done", "approved", "review", "missed"]);

  if ((count ?? 0) > 0) {
    return {
      error: `Cannot delete: ${count} historical task record(s) exist for this subject. Deactivate it instead to hide it from the schedule while preserving all data.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/subjects");
  revalidatePath("/admin/lessons");
  return {};
}

export async function toggleSubjectActive(id: string, active: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const service = createServiceClient();

  // 1. Flip the active flag on the subject
  const { error } = await supabase
    .from("subjects")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  const today = todayLocal();

  if (!active) {
    // 2. Deactivating — delete ALL pending tasks for this subject
    //    (any date: last week's unfinished tasks + current/future week)
    //    Already-completed tasks (done/review/approved/missed) are untouched.
    const { error: delErr } = await service.from("tasks").delete().eq("subject_id", id).eq("status", "pending");
    if (delErr) console.error("Failed to clean up tasks for deactivated subject:", delErr.message);
  } else {
    // 3. Reactivating — regenerate any missing tasks for the rest of this week
    const monday = currentWeekMonday();
    for (let i = 0; i <= 4; i++) {
      const d = new Date(`${monday}T00:00:00`);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dateStr >= today) {
        const { error: genErr } = await service.rpc("generate_daily_tasks", { p_date: dateStr });
        if (genErr) console.error(`Failed to regenerate tasks for ${dateStr}:`, genErr.message);
      }
    }
  }

  revalidatePath("/admin/subjects");
  revalidatePath("/student/week");
  revalidatePath("/student/today");
  return {};
}
