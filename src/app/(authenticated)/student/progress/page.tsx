import { redirect } from "next/navigation";
import { Icon, PageHeader, ProgBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, localDateStr } from "@/lib/streak";
import { rgba } from "@/lib/utils";

export default async function ProgressPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, color, student_key")
    .eq("id", user.id)
    .single();

  if (!profile || profile.student_key === "admin") redirect("/admin/dashboard");

  const thirtyDaysAgo = localDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const today = localDateStr(new Date());

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      `id, task_date, status, final_score, overall_score, timer_seconds, scoring_approach,
       subjects!inner (id, name, icon, color)`,
    )
    .eq("student_id", user.id)
    .gte("task_date", thirtyDaysAgo)
    .lte("task_date", today)
    .order("task_date", { ascending: false });

  const allTasks = tasks ?? [];
  const activeTasks = allTasks.filter((t) => t.status !== "cancelled");

  // ── Summary stats ─────────────────────────────────────────────────────────
  const completedStatuses = new Set(["done", "approved", "review"]);
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter((t) => completedStatuses.has(t.status)).length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const scoredTasks = activeTasks.filter((t) => t.overall_score != null);
  const avgScore =
    scoredTasks.length > 0
      ? Math.round(scoredTasks.reduce((sum, t) => sum + Number(t.overall_score), 0) / scoredTasks.length)
      : null;

  const streak = computeStreak(allTasks, today);

  // ── Per-subject breakdown ─────────────────────────────────────────────────
  const subjectMap: Record<
    string,
    {
      id: string;
      name: string;
      icon: string;
      color: string;
      total: number;
      completed: number;
      scoreSum: number;
      scoreCount: number;
    }
  > = {};

  for (const t of activeTasks) {
    // biome-ignore lint/suspicious/noExplicitAny: supabase join type
    const sub = t.subjects as any;
    if (!subjectMap[sub.id]) {
      subjectMap[sub.id] = {
        id: sub.id,
        name: sub.name,
        icon: sub.icon,
        color: sub.color,
        total: 0,
        completed: 0,
        scoreSum: 0,
        scoreCount: 0,
      };
    }
    subjectMap[sub.id].total++;
    if (completedStatuses.has(t.status)) subjectMap[sub.id].completed++;
    if (t.overall_score != null) {
      subjectMap[sub.id].scoreSum += Number(t.overall_score);
      subjectMap[sub.id].scoreCount++;
    }
  }

  const subjects = Object.values(subjectMap).map((s) => ({
    ...s,
    pct: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
    avgScore: s.scoreCount > 0 ? Math.round(s.scoreSum / s.scoreCount) : null,
  }));

  const studentColor = profile.color ?? "#4A90D0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="progress" title="Progress Report" sub="Last 30 days" color={studentColor} />

      {/* Summary panel */}
      <div className="glass-warm" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="cinzel brass" style={{ fontSize: 14 }}>
            Overall &mdash; Last 30 Days
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: studentColor }}>{completionPct}%</div>
        </div>
        <ProgBar value={completionPct} color={studentColor} style={{ height: 12 }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
          {(
            [
              ["Tasks Done", String(completedTasks), studentColor],
              ["Day Streak", streak > 0 ? `${streak} 🔥` : "—", "#E8A820"],
              ["Avg Score", avgScore != null ? `${avgScore}%` : "—", "#5BAA60"],
            ] as const
          ).map(([label, value, color]) => (
            <div
              key={label}
              style={{
                textAlign: "center",
                padding: 12,
                borderRadius: 8,
                background: "rgba(0,0,0,0.28)",
                border: `1px solid ${rgba(color, 0.28)}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 13, color: "#506070", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-subject breakdown */}
      {subjects.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#506070", fontSize: 14 }}>
          No task data yet for the last 30 days.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {subjects.map((sub) => (
            <div key={sub.id} className="glass" style={{ padding: 14, borderColor: rgba(sub.color, 0.28) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Icon name={sub.icon} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#EEE4CC", marginBottom: 5 }}>{sub.name}</div>
                  <ProgBar value={sub.pct} color={sub.color} />
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: sub.color }}>{sub.pct}%</div>
                  {sub.avgScore != null && (
                    <div style={{ fontSize: 13, color: "#506070", marginTop: 2 }}>avg {sub.avgScore}</div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#506070" }}>
                {sub.completed} of {sub.total} tasks completed
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
