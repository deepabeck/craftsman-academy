import { getLessonPlansForWeek } from "@/app/actions/lesson-plans";
import { getAdminHouseholdId } from "@/lib/get-admin-household";
import { fetchCalendarEvents } from "@/lib/ical-parser";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { CalendarEvent } from "@/lib/types";
import { LessonPlannerClient } from "./lesson-planner-client";

/** Returns the ISO date string for the Monday that starts the current school week.
 *  On Sunday we advance to the *next* Monday (upcoming week). */
function getCurrentWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? 1 : 1 - day; // Sun→+1  Mon→0  Tue→-1 …
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/** Returns YYYY-MM-DD for a given day offset from weekStart (Monday-based). */
function weekDate(weekStart: string, dayOffset: number): string {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split("T")[0];
}

export default async function LessonsPage() {
  const supabase = await createClient();
  const service = createServiceClient();

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

  // ── Calendar events for this week ──────────────────────────────────────────
  const icalUrl = process.env.CALENDAR_ICAL_URL ?? "";
  const calendarEvents: CalendarEvent[] = icalUrl ? await fetchCalendarEvents(icalUrl, 14).catch(() => []) : [];

  // Filter to only events within this Mon–Fri (offsets 0–4 from Monday weekStart)
  const weekDates = [0, 1, 2, 3, 4].map((i) => weekDate(weekStart, i));
  const weekEvents = calendarEvents.filter((e) => weekDates.includes(e.isoDate));

  // ── Today's tasks for both students (for adjustment proposals) ─────────────
  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;

  // Fetch student profiles (scoped to this household)
  const householdId = await getAdminHouseholdId();
  const { data: profiles } = await service
    .from("profiles")
    .select("id, student_key")
    .eq("role", "student")
    .eq("household_id", householdId ?? "")
    .not("student_key", "is", null);

  // Fetch today's tasks for each student
  const studentTasksRaw = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const { data: tasks } = await service
        .from("tasks")
        .select(`id, status, cancelled_reason, subjects!inner(id, name, category)`)
        .eq("student_id", profile.id)
        .eq("task_date", today);
      return {
        studentKey: profile.student_key as string,
        studentId: profile.id as string,
        tasks: (tasks ?? []).map((t) => ({
          id: t.id as string,
          status: t.status as string,
          // biome-ignore lint/suspicious/noExplicitAny: supabase join
          subjectId: (t.subjects as any)?.id as string,
          // biome-ignore lint/suspicious/noExplicitAny: supabase join
          subjectName: (t.subjects as any)?.name as string,
          // biome-ignore lint/suspicious/noExplicitAny: supabase join
          subjectCategory: (t.subjects as any)?.category as string | undefined,
          // biome-ignore lint/suspicious/noExplicitAny: cancelled_reason not yet in schema types
          cancelledReason: (t as any).cancelled_reason as string | null,
        })),
      };
    }),
  );

  return (
    <LessonPlannerClient
      subjects={subjects}
      initialWeekStart={weekStart}
      initialPlans={initialPlans}
      weekCalendarEvents={weekEvents}
      todayDate={today}
      initialStudentTasks={studentTasksRaw}
    />
  );
}
