import { createClient } from "@/lib/supabase/server";
import { ProfilesClient } from "./profiles-client";

export interface ProfileData {
  id: string;
  studentKey: string;
  displayName: string;
  tagline: string;
  grade: string;
  color: string;
  avatarUrl: string | null;
  subjects: { id: string; name: string; icon: string; color: string; days: string[] }[];
}

export default async function ProfilesPage() {
  const supabase = await createClient();

  // Fetch student profiles (exclude admin)
  const { data: profileRows, error } = await supabase
    .from("profiles")
    .select("id, display_name, tagline, grade, color, avatar_url, student_key, role")
    .neq("role", "admin")
    .order("display_name");

  if (error) console.error("Profiles fetch error:", error.message);

  // Fetch all active subjects from DB
  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("id, name, icon, color, days, only_student_key, active")
    .eq("active", true)
    .order("sort_order");

  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  const profiles: ProfileData[] = (profileRows ?? []).map((p: any) => ({
    id: p.id,
    studentKey: p.student_key ?? "",
    displayName: p.display_name,
    tagline: p.tagline ?? "",
    grade: p.grade ?? "",
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
