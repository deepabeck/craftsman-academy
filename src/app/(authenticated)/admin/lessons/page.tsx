import { getLessonPlansForWeek } from "@/app/actions/lesson-plans";
import { createClient } from "@/lib/supabase/server";
import { LessonPlannerClient } from "./lesson-planner-client";

/** Returns the ISO date string for the Monday of the current week. */
function getCurrentWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function LessonsPage() {
  const supabase = await createClient();

  // Load all active subjects ordered by sort_order
  const { data: subjectsRaw } = await supabase
    .from("subjects")
    .select(
      "id, name, icon, color, days, only_student_key, active, sort_order, detail, proof_types, duration_minutes, requires_review",
    )
    .eq("active", true)
    .order("sort_order");

  const subjects = (subjectsRaw ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    icon: s.icon as string,
    color: s.color as string,
    days: (s.days as string[]) ?? [],
    onlyStudentKey: (s.only_student_key as string | null) ?? null,
    defaultDetail: (s.detail as string) ?? "",
    defaultProofTypes: (s.proof_types as string[]) ?? ["checkbox"],
    defaultDuration: (s.duration_minutes as number) ?? 45,
    defaultRequiresReview: (s.requires_review as boolean) ?? false,
  }));

  const weekStart = getCurrentWeekStart();
  const initialPlans = await getLessonPlansForWeek(weekStart);

  return <LessonPlannerClient subjects={subjects} initialWeekStart={weekStart} initialPlans={initialPlans} />;
}
