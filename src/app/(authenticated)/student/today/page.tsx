import { redirect } from "next/navigation";
import { ensureDailyTasks } from "@/app/actions/tasks";
import { fetchCalendarEvents } from "@/lib/ical-parser";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, Student, Task } from "@/lib/types";
import { fetchWeather } from "@/lib/weather";
import { TodayClient } from "./today-client";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, color, grade, avatar_url, student_key")
    .eq("id", user.id)
    .single();

  if (!profile || profile.student_key === "admin") redirect("/admin/dashboard");

  // Use the server machine's LOCAL date so weekend/weekday is correct.
  // toISOString() is UTC and causes off-by-one errors in evening hours.
  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;

  // Mark yesterday's missed tasks, generate today's tasks, and fetch
  // weather + calendar data — all in parallel.
  const icalUrl = process.env.CALENDAR_ICAL_URL ?? "";
  const [, weatherData, calendarEvents] = await Promise.all([
    ensureDailyTasks(today).catch((e) => {
      console.error("ensureDailyTasks threw:", e);
      return null;
    }),
    fetchWeather(),
    icalUrl ? fetchCalendarEvents(icalUrl) : Promise.resolve([] as CalendarEvent[]),
  ]);

  // Fetch today's tasks joined with subjects
  const { data: rawTasks, error } = await supabase
    .from("tasks")
    .select(
      `id, status, proof_type, proof_types, duration,
       lesson_detail, scoring_approach, requires_review,
       admin_note, notes, timer_seconds, completed_at,
       subjects!inner (id, name, icon, color, sort_order)`,
    )
    .eq("student_id", user.id)
    .eq("task_date", today)
    .neq("status", "cancelled");

  if (error) console.error("Today tasks fetch error:", error.message, "student:", user.id, "date:", today);
  console.log(`Today tasks for ${profile.student_key} on ${today}: ${rawTasks?.length ?? 0} rows`);

  // Map DB rows → Task shape (compatible with existing UI components)
  const tasks: Task[] = (rawTasks ?? [])
    .sort(
      (a, b) =>
        // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
        ((a.subjects as any).sort_order ?? 0) - ((b.subjects as any).sort_order ?? 0),
    )
    .map((t) => {
      // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
      const sub = t.subjects as any;
      const proofTypes: string[] = t.proof_types ?? [t.proof_type ?? "checkbox"];
      return {
        id: t.id,
        subjectId: sub.id,
        subjectName: sub.name,
        subjectIcon: sub.icon,
        subjectColor: sub.color,
        detail: t.lesson_detail || "",
        proofType: (proofTypes[0] ?? "checkbox") as "photo" | "timer" | "checkbox",
        proofTypes,
        duration: t.duration ?? 45,
        scoringApproach: t.scoring_approach ?? "completion",
        requiresReview: t.requires_review ?? false,
        adminNote: t.admin_note ?? "",
        status: t.status as Task["status"],
        notes: t.notes ?? "",
        files: [],
        timerSeconds: t.timer_seconds ?? 0,
        completedAt: t.completed_at ?? null,
      };
    });

  const student: Student = {
    id: profile.student_key ?? "deven",
    name: profile.display_name,
    color: profile.color ?? "#4A90D0",
    grade: profile.grade ?? "",
    avatar: profile.avatar_url ?? `/assets/avatar-${profile.student_key ?? "deven"}.png`,
    tagline: "",
    subjects: [],
  };

  return <TodayClient initialTasks={tasks} student={student} weather={weatherData} calendarEvents={calendarEvents} />;
}
