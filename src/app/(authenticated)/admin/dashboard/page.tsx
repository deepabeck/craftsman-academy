import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { AiTag, StudentDashData, SubjectTask } from "./dashboard-client";
import { DashboardClient } from "./dashboard-client";

/** YYYY-MM-DD from a Date using local components (avoids UTC day-shift). */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns the Monday (YYYY-MM-DD) of the week containing `today`. */
function getWeekStart(today: string): string {
  const d = new Date(`${today}T00:00:00`);
  const dow = d.getDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return localDateStr(d);
}

/** Joins a list of names with commas and "and". */
function listNames(items: { name: string }[]): string {
  if (items.length === 1) return items[0].name;
  if (items.length === 2) return `${items[0].name} and ${items[1].name}`;
  return `${items
    .slice(0, -1)
    .map((i) => i.name)
    .join(", ")}, and ${items[items.length - 1].name}`;
}

/** Derives a weekly AI summary and tags from real task completion data. */
function generateInsights(
  name: string,
  subjects: { name: string; pct: number; total: number }[],
): { summary: string; tags: AiTag[] } {
  const withData = subjects.filter((s) => s.total > 0);
  const strong = withData.filter((s) => s.pct >= 80);
  const monitor = withData.filter((s) => s.pct < 50);

  const tags: AiTag[] = [
    ...strong.map((s) => ({ l: `Strong: ${s.name}`, t: "auto" as const })),
    ...monitor.map((s) => ({ l: `Monitor: ${s.name}`, t: "alert" as const })),
  ];

  let summary: string;
  if (withData.length === 0) {
    summary = `No task data yet for this week. Check back after ${name} completes some assignments.`;
  } else if (strong.length > 0 && monitor.length > 0) {
    summary = `Excellent progress in ${listNames(strong)} this week. ${listNames(monitor)} may need a closer look — consider a quick check-in to understand any blockers.`;
  } else if (strong.length > 0) {
    summary = `Solid week! ${name} is showing strong momentum in ${listNames(strong)}. Keep encouraging that consistency.`;
  } else if (monitor.length > 0) {
    summary = `${listNames(monitor)} ${monitor.length === 1 ? "is" : "are"} below target this week. A focused session and some encouragement could make a real difference.`;
  } else {
    summary = `${name} is making steady progress across all subjects this week. Consistent effort is the foundation of great learning!`;
  }

  return { summary, tags };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const service = createServiceClient();

  const today = localDateStr(new Date());
  const weekStart = getWeekStart(today);

  // ── Step 1: Fetch all student profiles ──────────────────────────────────────
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_url, grade, tagline, student_key")
    .eq("role", "student")
    .order("display_name");

  const students = profiles ?? [];
  const studentIds = students.map((p) => p.id);

  if (studentIds.length === 0) {
    return <DashboardClient students={[]} />;
  }

  // ── Step 2: Today's tasks for all students ───────────────────────────────────
  const { data: todayTasksRaw } = await supabase
    .from("tasks")
    .select("id, student_id, status, subjects!inner(id, name, icon, color)")
    .eq("task_date", today)
    .neq("status", "cancelled")
    .in("student_id", studentIds);

  // ── Step 3: This week's tasks (Mon → today) ──────────────────────────────────
  const { data: weekTasksRaw } = await supabase
    .from("tasks")
    .select("id, student_id, status, subjects!inner(id, name, icon, color)")
    .gte("task_date", weekStart)
    .lte("task_date", today)
    .neq("status", "cancelled")
    .in("student_id", studentIds);

  // ── Step 4: AI notes for current week (parent notes) ────────────────────────
  const { data: aiNotesRaw } = await supabase
    .from("ai_notes")
    .select("student_id, parent_note")
    .in("student_id", studentIds)
    .eq("week_start", weekStart);

  const aiNotesMap: Record<string, string> = {};
  for (const n of aiNotesRaw ?? []) {
    aiNotesMap[n.student_id] = n.parent_note ?? "";
  }

  // ── Step 5: Resolve avatar URLs ──────────────────────────────────────────────
  const resolveAvatar = async (url: string | null, key: string): Promise<string | null> => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const { data } = await service.storage.from("avatars").createSignedUrl(url, 3600);
    return data?.signedUrl ?? null;
  };

  const completedStatuses = new Set(["done", "approved", "review"]);
  const todayTasks = todayTasksRaw ?? [];
  const weekTasks = weekTasksRaw ?? [];

  // ── Step 6: Compute per-student data ────────────────────────────────────────
  const studentData: StudentDashData[] = await Promise.all(
    students.map(async (profile) => {
      // Today completion %
      const todayMine = todayTasks.filter((t) => t.student_id === profile.id);
      const todayDone = todayMine.filter((t) => completedStatuses.has(t.status)).length;
      const todayPct = todayMine.length > 0 ? Math.round((todayDone / todayMine.length) * 100) : 0;

      // Today's subjects with real status
      const todaySubjects: SubjectTask[] = todayMine.map((t) => {
        // biome-ignore lint/suspicious/noExplicitAny: supabase join type
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

      // Week stats per subject for AI summary
      const weekMine = weekTasks.filter((t) => t.student_id === profile.id);
      const weekSubjectMap: Record<string, { name: string; total: number; done: number }> = {};
      for (const t of weekMine) {
        // biome-ignore lint/suspicious/noExplicitAny: supabase join type
        const sub = t.subjects as any;
        if (!weekSubjectMap[sub.id]) weekSubjectMap[sub.id] = { name: sub.name, total: 0, done: 0 };
        weekSubjectMap[sub.id].total++;
        if (completedStatuses.has(t.status)) weekSubjectMap[sub.id].done++;
      }
      const weekSubjects = Object.entries(weekSubjectMap).map(([id, s]) => ({
        id,
        name: s.name,
        pct: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
        total: s.total,
      }));

      // Derive AI summary from real data
      const { summary: aiSummary, tags: aiTags } = generateInsights(profile.display_name, weekSubjects);

      const avatarUrl = await resolveAvatar(profile.avatar_url, profile.student_key ?? "");

      return {
        id: profile.id,
        name: profile.display_name,
        color: profile.color ?? "#4A90D0",
        avatarUrl,
        grade: profile.grade ?? "",
        tagline: profile.tagline ?? "",
        studentKey: profile.student_key ?? "",
        todayPct,
        todaySubjects,
        aiSummary,
        aiTags,
        parentNote: aiNotesMap[profile.id] ?? "",
        weekStart,
      };
    }),
  );

  return <DashboardClient students={studentData} />;
}
