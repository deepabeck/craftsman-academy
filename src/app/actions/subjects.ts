"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

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

  const id = subject.id.startsWith("new-") ? slugify(subject.name) || `subj-${Date.now()}` : subject.id;

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

  revalidatePath("/admin/subjects");
  revalidatePath("/admin/lessons");
  return {};
}

export async function deleteSubject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/subjects");
  revalidatePath("/admin/lessons");
  return {};
}

export async function toggleSubjectActive(id: string, active: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/subjects");
  return {};
}
