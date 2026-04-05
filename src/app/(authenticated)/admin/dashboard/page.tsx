import { getAdminHouseholdId } from "@/lib/get-admin-household";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { StudentDashData, SubjectMonth } from "./dashboard-client";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekStart(today: string): string {
  const d = new Date(`${today}T00:00:00`);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return localDateStr(d);
}

function subjectNote(pct: number, done: number, total: number): string {
  if (total === 0) return "No tasks this month";
  const missed = total - done;
  if (pct >= 90) return `${done}/${total} complete · excellent consistency`;
  if (pct >= 75) return `${done}/${total} complete · strong momentum`;
  if (pct >= 50) return `${missed} missed this month · room to improve`;
  return `${missed} missed this month · needs attention`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const service = createServiceClient();

  const today = localDateStr(new Date());
  const weekStart = getWeekStart(today);

  const thirtyDaysAgoDate = new Date(`${today}T00:00:00`);
  thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
  const thirtyDaysAgoStr = localDateStr(thirtyDaysAgoDate);

  // ── Step 1: Student profiles (scoped to this household) ─────────────────
  const householdId = await getAdminHouseholdId();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_url, tagline, student_key")
    .eq("role", "student")
    .eq("household_id", householdId ?? "")
    .order("display_name");

  const students = profiles ?? [];
  const studentIds = students.map((p) => p.id);
  if (studentIds.length === 0) return <DashboardClient students={[]} />;

  // ── Step 2: Current grade ────────────────────────────────────────────────
  const gradeMap: Record<string, number | null> = {};
  const { data: schoolYears } = await supabase
    .from("school_years")
    .select("student_id, grade")
    .in("student_id", studentIds)
    .lte("start_date", today)
    .gte("end_date", today);
  for (const sy of schoolYears ?? []) gradeMap[sy.student_id] = sy.grade;

  // ── Step 3: Today's tasks ────────────────────────────────────────────────
  const { data: todayTasksRaw } = await supabase
    .from("tasks")
    .select("id, student_id, status, subjects!inner(id, name, icon, color)")
    .eq("task_date", today)
    .neq("status", "cancelled")
    .in("student_id", studentIds);

  // ── Step 4: This week's tasks ────────────────────────────────────────────
  const { data: weekTasksRaw } = await supabase
    .from("tasks")
    .select("id, student_id, status, subjects!inner(id, name, icon, color)")
    .gte("task_date", weekStart)
    .lte("task_date", today)
    .neq("status", "cancelled")
    .in("student_id", studentIds);

  // ── Step 5: 30-day tasks ─────────────────────────────────────────────────
  const { data: monthTasksRaw } = await supabase
    .from("tasks")
    .select("id, student_id, status, subjects!inner(id, name, icon, color)")
    .gte("task_date", thirtyDaysAgoStr)
    .lte("task_date", today)
    .neq("status", "cancelled")
    .in("student_id", studentIds);

  // ── Step 6: Cogs balance per student ─────────────────────────────────────
  const { data: pointsLogs } = await service
    .from("points_log")
    .select("student_id, points")
    .in("student_id", studentIds);

  const cogsMap: Record<string, number> = {};
  for (const log of pointsLogs ?? []) {
    cogsMap[log.student_id] = (cogsMap[log.student_id] ?? 0) + log.points;
  }

  // ── Step 7: Parent notes for current week ────────────────────────────────
  const { data: aiNotesRaw } = await supabase
    .from("ai_notes")
    .select("student_id, parent_note")
    .in("student_id", studentIds)
    .eq("week_start", weekStart);

  const aiNotesMap: Record<string, string> = {};
  for (const n of aiNotesRaw ?? []) aiNotesMap[n.student_id] = n.parent_note ?? "";

  // ── Step 8: Resolve avatar URLs ──────────────────────────────────────────
  const resolveAvatar = async (url: string | null): Promise<string | null> => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const { data } = await service.storage.from("avatars").createSignedUrl(url, 3600);
    return data?.signedUrl ?? null;
  };

  const completedStatuses = new Set(["done", "approved", "review"]);
  const todayTasks = todayTasksRaw ?? [];
  const weekTasks = weekTasksRaw ?? [];
  const monthTasks = monthTasksRaw ?? [];

  // ── Step 9: Per-student computation ─────────────────────────────────────
  const studentData: StudentDashData[] = await Promise.all(
    students.map(async (profile) => {
      // Today
      const todayMine = todayTasks.filter((t) => t.student_id === profile.id);
      const todayDone = todayMine.filter((t) => completedStatuses.has(t.status)).length;
      const todayPct = todayMine.length > 0 ? Math.round((todayDone / todayMine.length) * 100) : 0;

      // biome-ignore lint/suspicious/noExplicitAny: supabase join
      const todaySubjects = todayMine.map((t) => {
        const sub = t.subjects as any;
        return {
          id: `${sub.id}-${t.id}`,
          name: sub.name,
          icon: sub.icon,
          color: sub.color,
          status: t.status,
          pct: completedStatuses.has(t.status) ? 100 : 0,
        };
      });

      // This week
      const weekMine = weekTasks.filter((t) => t.student_id === profile.id);
      const weekTotal = weekMine.length;
      const weekDone = weekMine.filter((t) => completedStatuses.has(t.status)).length;
      const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

      // 30-day per subject
      const monthMine = monthTasks.filter((t) => t.student_id === profile.id);
      const monthMap: Record<string, { name: string; icon: string; color: string; total: number; done: number }> = {};
      for (const t of monthMine) {
        // biome-ignore lint/suspicious/noExplicitAny: supabase join
        const sub = t.subjects as any;
        if (!monthMap[sub.id])
          monthMap[sub.id] = { name: sub.name, icon: sub.icon, color: sub.color, total: 0, done: 0 };
        monthMap[sub.id].total++;
        if (completedStatuses.has(t.status)) monthMap[sub.id].done++;
      }
      const monthSubjects: SubjectMonth[] = Object.entries(monthMap).map(([id, s]) => {
        const pct30 = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
        return {
          id,
          name: s.name,
          icon: s.icon,
          color: s.color,
          pct30,
          total30: s.total,
          done30: s.done,
          aiNote: subjectNote(pct30, s.done, s.total),
        };
      });

      const avatarUrl = await resolveAvatar(profile.avatar_url);

      return {
        id: profile.id,
        name: profile.display_name,
        color: profile.color ?? "#4A90D0",
        avatarUrl,
        currentGrade: gradeMap[profile.id] ?? null,
        tagline: profile.tagline ?? "",
        studentKey: profile.student_key ?? "",
        todayPct,
        todaySubjects,
        weekPct,
        monthSubjects,
        cogsBalance: cogsMap[profile.id] ?? 0,
        parentNote: aiNotesMap[profile.id] ?? "",
        weekStart,
      };
    }),
  );

  return <DashboardClient students={studentData} />;
}
