// biome-ignore lint/suspicious/noExplicitAny: accepts both the cookie-based server client and the service client
type AnySupabase = any;

export interface SchoolYearRow {
  id: string;
  student_id: string;
  grade: number;
  year_label: string;
  start_date: string;
  end_date: string;
}

/** The school year row covering `today` for a student, or null if none is defined for that date. */
export async function getCurrentSchoolYear(
  supabase: AnySupabase,
  studentId: string,
  today: string,
): Promise<SchoolYearRow | null> {
  const { data } = await supabase
    .from("school_years")
    .select("id, student_id, grade, year_label, start_date, end_date")
    .eq("student_id", studentId)
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();
  return data ?? null;
}

/** All school years for a student that have already ended, most recent first — the archive list. */
export async function getCompletedSchoolYears(
  supabase: AnySupabase,
  studentId: string,
  today: string,
): Promise<SchoolYearRow[]> {
  const { data } = await supabase
    .from("school_years")
    .select("id, student_id, grade, year_label, start_date, end_date")
    .eq("student_id", studentId)
    .lt("end_date", today)
    .order("start_date", { ascending: false });
  return data ?? [];
}

/** Format a start/end date pair as "Aug 11, 2025 – Aug 9, 2026". */
export function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}
