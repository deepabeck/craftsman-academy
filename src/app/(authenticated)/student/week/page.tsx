import { redirect } from "next/navigation";
import { awardWeeklyBonus } from "@/app/actions/points";

export const dynamic = "force-dynamic";
import { ensureWeekTasks } from "@/app/actions/tasks";
import { createClient } from "@/lib/supabase/server";
import type { Student, Task } from "@/lib/types";
import { WeekClient } from "./week-client";

/** YYYY-MM-DD from a Date using local (not UTC) components. */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday of the week containing `date` (uses local date). */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun, 1=Mon …
  // On Sunday, show the upcoming week (next Monday); otherwise show current week's Monday
  const diff = dow === 0 ? 1 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

export default async function WeekPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_url, student_key")
    .eq("id", user.id)
    .single();

  if (!profile || profile.student_key === "admin") redirect("/admin/dashboard");

  // Compute Mon–Fri anchored to the user's local timezone (Mountain Time).
  // Vercel servers run UTC — using new Date() directly would compute the wrong
  // weekStart when the server clock has crossed midnight but the user hasn't yet
  // (e.g., 8 PM MDT Monday = 2 AM UTC Tuesday → weekStart would jump a day).
  const APP_TZ = process.env.APP_TIMEZONE ?? "America/Denver";
  const todayLocal = new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ });
  const monday = getMondayOf(new Date(`${todayLocal}T12:00:00`));
  const weekStart = localDateStr(monday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const weekEnd = localDateStr(friday);

  // Ensure tasks exist for every day this week (idempotent)
  try {
    await ensureWeekTasks(weekStart);
  } catch (e) {
    console.error("ensureWeekTasks threw:", e);
  }

  // Award weekly bonuses for the prior week (idempotent — dedup index prevents double-awarding)
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  const prevFriday = new Date(prevMonday);
  prevFriday.setDate(prevMonday.getDate() + 4);
  awardWeeklyBonus(user.id, localDateStr(prevMonday), localDateStr(prevFriday)).catch((e) =>
    console.error("awardWeeklyBonus error:", e),
  );

  // Fetch all this week's tasks
  const { data: rawTasks, error } = await supabase
    .from("tasks")
    .select(
      `id, task_date, status, proof_type, proof_types, duration,
       lesson_detail, scoring_approach, requires_review,
       admin_note, notes, timer_seconds, completed_at,
       subjects!inner (id, name, icon, color, sort_order, detail)`,
    )
    .eq("student_id", user.id)
    .gte("task_date", weekStart)
    .lte("task_date", weekEnd)
    .neq("status", "cancelled");

  if (error) console.error("Week tasks fetch error:", error.message);

  // Fetch current grade from school_years
  const { data: schoolYear } = await supabase
    .from("school_years")
    .select("grade")
    .eq("student_id", user.id)
    .lte("start_date", weekStart)
    .gte("end_date", weekStart)
    .maybeSingle();
  const currentGrade: number | null = schoolYear?.grade ?? null;

  const tasks: (Task & { taskDate: string })[] = (rawTasks ?? [])
    .sort((a, b) => {
      if (a.task_date !== b.task_date) return a.task_date.localeCompare(b.task_date);
      // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
      return ((a.subjects as any).sort_order ?? 0) - ((b.subjects as any).sort_order ?? 0);
    })
    .map((t) => {
      // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
      const sub = t.subjects as any;
      const proofTypes: string[] = t.proof_types ?? [t.proof_type ?? "checkbox"];
      return {
        id: t.id,
        taskDate: t.task_date,
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
    currentGrade,
    avatar: profile.avatar_url ?? `/assets/avatar-${profile.student_key ?? "deven"}.png`,
    tagline: "",
    subjects: [],
  };

  return <WeekClient tasks={tasks} student={student} weekStart={weekStart} />;
}
