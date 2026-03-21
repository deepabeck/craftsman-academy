import { redirect } from "next/navigation";
import { ensureWeekTasks } from "@/app/actions/tasks";
import { createClient } from "@/lib/supabase/server";
import type { Student, Task } from "@/lib/types";
import { WeekClient } from "./week-client";

/** Monday of the week containing `date`. */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
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
    .select("id, display_name, color, grade, avatar_url, student_key")
    .eq("id", user.id)
    .single();

  if (!profile || profile.student_key === "admin") redirect("/admin/dashboard");

  // Compute Mon–Fri of this week
  const monday = getMondayOf(new Date());
  const weekStart = monday.toISOString().split("T")[0];
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const weekEnd = friday.toISOString().split("T")[0];

  // Ensure tasks exist for every day this week (idempotent)
  try {
    await ensureWeekTasks(weekStart);
  } catch (e) {
    console.error("ensureWeekTasks threw:", e);
  }

  // Fetch all this week's tasks
  const { data: rawTasks, error } = await supabase
    .from("tasks")
    .select(
      `id, task_date, status, proof_type, proof_types, duration,
       lesson_detail, scoring_approach, requires_review,
       admin_note, notes, timer_seconds, completed_at,
       subjects!inner (id, name, icon, color, sort_order)`,
    )
    .eq("student_id", user.id)
    .gte("task_date", weekStart)
    .lte("task_date", weekEnd)
    .neq("status", "cancelled");

  if (error) console.error("Week tasks fetch error:", error.message);

  // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
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

  return <WeekClient tasks={tasks} student={student} weekStart={weekStart} />;
}
