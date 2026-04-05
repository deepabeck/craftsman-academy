import { redirect } from "next/navigation";
import { ensureDailyTasks } from "@/app/actions/tasks";
import { fetchCalendarEvents } from "@/lib/ical-parser";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, Student, Task } from "@/lib/types";
import { fetchWeather } from "@/lib/weather";
import type { LateTask, WeekSummary } from "./today-client";
import { TodayClient } from "./today-client";

/** Family's local timezone — Vercel servers run in UTC so we must be explicit. */
const APP_TZ = process.env.APP_TIMEZONE ?? "America/Denver";

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns the Mon–Fri of the immediately preceding school week (for Saturday rest day). */
function currentWeekMonFri(saturday: Date): { start: string; end: string } {
  const monday = new Date(saturday);
  monday.setDate(saturday.getDate() - 5); // Saturday − 5 = Monday
  const friday = new Date(saturday);
  friday.setDate(saturday.getDate() - 1); // Saturday − 1 = Friday
  return { start: fmt(monday), end: fmt(friday) };
}

/** Returns the Mon–Fri of the most recently completed school week (for generic rest days). */
function getPrecedingWeek(today: Date): { start: string; end: string; label: string } {
  const dow = today.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - daysSinceMonday - 1);
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);
  const label = `${lastMonday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${lastSunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return { start: fmt(lastMonday), end: fmt(lastSunday), label };
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_url, student_key, household_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.student_key === "admin") redirect("/admin/dashboard");

  // Use the family's local timezone — Vercel runs in UTC which causes off-by-one
  // errors (Sunday evening shows Monday, etc.)
  const today = new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ }); // YYYY-MM-DD
  const _d = new Date(`${today}T12:00:00`); // noon local, safe for day arithmetic
  const dayOfWeek = _d.getDay(); // 0=Sun 1=Mon … 6=Sat

  // Fetch current grade from school_years
  const { data: schoolYear } = await supabase
    .from("school_years")
    .select("grade")
    .eq("student_id", user.id)
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();
  const currentGrade: number | null = schoolYear?.grade ?? null;

  // Fetch household iCal URL
  const householdId = profile?.household_id ?? null;
  const { data: hhRow } = householdId
    ? await supabase.from("households").select("ical_url").eq("id", householdId).maybeSingle()
    : { data: null };
  const icalUrl = hhRow?.ical_url ?? process.env.CALENDAR_ICAL_URL ?? "";

  // Mark yesterday's missed tasks, generate today's tasks, and fetch
  // weather + calendar data — all in parallel.
  const [, weatherData, calendarEvents] = await Promise.all([
    ensureDailyTasks(today).catch((e) => {
      console.error("ensureDailyTasks threw:", e);
      return null;
    }),
    fetchWeather(),
    icalUrl ? fetchCalendarEvents(icalUrl) : Promise.resolve([] as CalendarEvent[]),
  ]);

  // Fetch today's tasks joined with subjects (include cancelled — shown greyed out)
  const { data: rawTasks, error } = await supabase
    .from("tasks")
    .select(
      `id, status, proof_type, proof_types, duration,
       lesson_detail, scoring_approach, requires_review,
       admin_note, notes, timer_seconds, completed_at,
       subjects!inner (id, name, icon, color, sort_order, detail)`,
    )
    .eq("student_id", user.id)
    .eq("task_date", today);

  if (error) console.error("Today tasks fetch error:", error.message, "student:", user.id, "date:", today);
  console.log(`Today tasks for ${profile.student_key} on ${today} (${dayOfWeek}): ${rawTasks?.length ?? 0} rows`);

  const sortedRaw = (rawTasks ?? []).sort(
    (a, b) =>
      // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
      ((a.subjects as any).sort_order ?? 0) - ((b.subjects as any).sort_order ?? 0),
  );

  // For pending tasks, check if they have prior submissions (= were sent back for revision).
  // Fetch the most recent text content per task so we can pre-populate the submit modal.
  const pendingIds = sortedRaw.filter((t) => t.status === "pending").map((t) => t.id);
  const priorSubMap = new Map<string, string>(); // task_id → last text content
  const revisedTaskIds = new Set<string>();
  if (pendingIds.length > 0) {
    const { data: priorSubs } = await supabase
      .from("submissions")
      .select("task_id, content, submission_type")
      .in("task_id", pendingIds)
      .order("created_at", { ascending: false });
    for (const s of priorSubs ?? []) {
      revisedTaskIds.add(s.task_id); // any prior submission means it was revised
      if (!priorSubMap.has(s.task_id) && s.content && s.submission_type !== "revision_request") {
        priorSubMap.set(s.task_id, s.content);
      }
    }
  }

  const tasks: Task[] = sortedRaw.map((t) => {
    // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
    const sub = t.subjects as any;
    const proofTypes: string[] = t.proof_types ?? [t.proof_type ?? "checkbox"];
    return {
      id: t.id,
      subjectId: sub.id,
      subjectName: sub.name,
      subjectIcon: sub.icon,
      subjectColor: sub.color,
      detail: t.lesson_detail || sub.detail || "",
      proofType: (proofTypes[0] ?? "checkbox") as "photo" | "timer" | "checkbox",
      proofTypes,
      duration: t.duration ?? 45,
      scoringApproach: t.scoring_approach ?? "completion",
      requiresReview: t.requires_review ?? false,
      adminNote: t.admin_note ?? "",
      wasRevised: revisedTaskIds.has(t.id),
      previousSubmission: priorSubMap.get(t.id),
      status: t.status as Task["status"],
      // biome-ignore lint/suspicious/noExplicitAny: cancelled_reason column added via migration
      cancelledReason: (t as any).cancelled_reason ?? null,
      notes: t.notes ?? "",
      files: [],
      timerSeconds: t.timer_seconds ?? 0,
      completedAt: t.completed_at ?? null,
    };
  });

  // ── Saturday: fetch incomplete tasks from this week (Mon–Fri) ───────────────
  let lateTasks: LateTask[] = [];
  if (dayOfWeek === 6 || tasks.length === 0) {
    const range = dayOfWeek === 6 ? currentWeekMonFri(_d) : getPrecedingWeek(_d);

    const { data: lateData } = await supabase
      .from("tasks")
      .select("id, status, subjects!inner(name, icon, color)")
      .eq("student_id", user.id)
      .gte("task_date", range.start)
      .lte("task_date", range.end)
      .in("status", ["pending", "missed"]);

    lateTasks = (lateData ?? []).map((t) => {
      // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
      const sub = t.subjects as any;
      return {
        id: t.id,
        subjectName: sub.name,
        subjectIcon: sub.icon,
        subjectColor: sub.color,
        status: t.status as "pending" | "missed",
      };
    });
  }

  // ── Generic rest-day week summary (for non-Saturday no-task days) ───────────
  let weekSummary: WeekSummary | null = null;
  if (tasks.length === 0 && dayOfWeek !== 6 && dayOfWeek !== 0) {
    const { start, end, label } = getPrecedingWeek(_d);
    const { data: prevTasks } = await supabase
      .from("tasks")
      .select("id, status")
      .eq("student_id", user.id)
      .gte("task_date", start)
      .lte("task_date", end)
      .neq("status", "cancelled");

    if (prevTasks && prevTasks.length > 0) {
      const completedSet = new Set(["done", "approved", "review"]);
      const completed = prevTasks.filter((t) => completedSet.has(t.status)).length;
      weekSummary = { total: prevTasks.length, completed, weekLabel: label };
    }
  }

  const student: Student = {
    id: profile.student_key ?? "deven",
    name: profile.display_name,
    color: profile.color ?? "#4A90D0",
    currentGrade,
    avatar: profile.avatar_url ?? `/assets/profile-${profile.student_key ?? "deven"}.png`,
    tagline: "",
    subjects: [],
  };

  return (
    <TodayClient
      initialTasks={tasks}
      student={student}
      weather={weatherData}
      calendarEvents={calendarEvents}
      weekSummary={weekSummary}
      dayOfWeek={dayOfWeek}
      lateTasks={lateTasks}
    />
  );
}
