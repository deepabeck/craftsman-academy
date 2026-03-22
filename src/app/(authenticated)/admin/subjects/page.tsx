import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";
import { SubjectsClient } from "./subjects-client";

export default async function SubjectsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("subjects").select("*").order("sort_order", { ascending: true });

  if (error) console.error("Subjects fetch error:", error.message);

  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  const subjects: Subject[] = (data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    color: s.color,
    days: s.days ?? [],
    only: s.only_student_key ?? null,
    detail: s.detail ?? "",
    active: s.active ?? true,
    category: s.category ?? "Core Academic",
    proofTypes: s.proof_types ?? ["checkbox"],
    requiresReview: s.requires_review ?? false,
    duration: s.duration_minutes ?? 45,
    externalPlatform: s.external_platform ?? null,
    sortOrder: s.sort_order ?? 0,
  }));

  return <SubjectsClient initialSubjects={subjects} />;
}
