import { getAdminHouseholdId } from "@/lib/get-admin-household";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
  email: string;
  subjects: { id: string; name: string; icon: string; color: string; days: string[] }[];
}

export interface AdminProfileData {
  id: string;
  displayName: string;
  tagline: string;
  avatarUrl: string | null;
  bgColor: string;
  icalUrl: string;
}

export default async function ProfilesPage() {
  const supabase = await createClient();

  // ── Fetch admin profile ───────────────────────────────────────────────────
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const householdId = await getAdminHouseholdId();

  const [{ data: adminRow }, { data: adminSettings }, { data: householdRow }] = await Promise.all([
    authUser
      ? supabase.from("profiles").select("id, display_name, tagline, avatar_url").eq("id", authUser.id).maybeSingle()
      : Promise.resolve({ data: null }),
    authUser
      ? supabase.from("user_settings").select("bg_color").eq("user_id", authUser.id).maybeSingle()
      : Promise.resolve({ data: null }),
    householdId
      ? supabase.from("households").select("ical_url").eq("id", householdId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const adminProfile: AdminProfileData = {
    id: adminRow?.id ?? "",
    displayName: adminRow?.display_name ?? "Admin",
    tagline: adminRow?.tagline ?? "",
    avatarUrl: adminRow?.avatar_url ?? null,
    bgColor: adminSettings?.bg_color ?? "#08111E",
    icalUrl: householdRow?.ical_url ?? "",
  };

  // ── Fetch auth emails for students (service role) ─────────────────────────
  const serviceClient = createServiceClient();
  const { data: authUsers } = await serviceClient.auth.admin.listUsers({ perPage: 100 });
  const emailMap: Record<string, string> = {};
  for (const u of authUsers?.users ?? []) {
    emailMap[u.id] = u.email ?? "";
  }

  // ── Fetch student profiles (scoped to this household) ────────────────────
  const { data: profileRows, error } = await supabase
    .from("profiles")
    .select("id, display_name, tagline, color, avatar_url, student_key, role")
    .eq("role", "student")
    .eq("household_id", householdId ?? "")
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
    email: emailMap[p.id] ?? "",
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

  return <ProfilesClient profiles={profiles} adminProfile={adminProfile} />;
}
