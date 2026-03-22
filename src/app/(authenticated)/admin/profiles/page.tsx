import { createClient } from "@/lib/supabase/server";
import { ProfilesClient } from "./profiles-client";

export interface ProfileData {
  id: string;
  studentKey: string;
  displayName: string;
  tagline: string;
  currentGrade: number | null;
  yearLabel: string | null;
  color: string;
  avatarUrl: string | null;
  subjects: { id: string; name: string; icon: string; color: string; days: string[] }[];
}

export default async function ProfilesPage() {
  const supabase = await createClient();

  // ── Fetch student profiles (exclude admin) ────────────────────────────────
  const { data: profileRows, error } = await supabase
    .from("profiles")
    .select("id, display_name, tagline, color, avatar_url, student_key, role")
    .neq("role", "admin")
    .order("display_name");

  if (error) console.error("Profiles fetch error:", error.message);

  // ── Fetch all active subjects from DB ─────────────────────────────────────
  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("id, name, icon, color, days, only_student_key, active")
    .eq("active", true)
    .order("sort_order");

  // ── Fetch current school year for each student ────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const studentIds = (profileRows ?? []).map((p) => p.id);

  const gradeMap: Record<string, { grade: number; yearLabel: string }> = {};
  if (studentIds.length > 0) {
    const { data: schoolYears } = await supabase
      .from("school_years")
      .select("student_id, grade, year_label")
      .in("student_id", studentIds)
      .lte("start_date", today)
      .gte("end_date", today);

    for (const sy of schoolYears ?? []) {
      gradeMap[sy.student_id] = { grade: sy.grade, yearLabel: sy.year_label };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  const profiles: ProfileData[] = (profileRows ?? []).map((p: any) => ({
    id: p.id,
    studentKey: p.student_key ?? "",
    displayName: p.display_name,
    tagline: p.tagline ?? "",
    currentGrade: gradeMap[p.id]?.grade ?? null,
    yearLabel: gradeMap[p.id]?.yearLabel ?? null,
    color: p.color ?? "#4A90D0",
    avatarUrl: p.avatar_url ?? null,
    subjects: (subjectRows ?? [])
      // biome-ignore lint/suspicious/noExplicitAny: supabase row type
      .filter((s: any) => !s.only_student_key || s.only_student_key === p.student_key)
      // biome-ignore lint/suspicious/noExplicitAny: supabase row type
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
        days: s.days ?? [],
      })),
  }));

  return <ProfilesClient profiles={profiles} />;
}
