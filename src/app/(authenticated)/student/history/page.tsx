import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, PageHeader, StatusBadge } from "@/components/ui";
import { getCurrentSchoolYear } from "@/lib/school-year";
import { createClient } from "@/lib/supabase/server";
import { gradeLabel, rgba } from "@/lib/utils";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_COLOR: Record<string, string> = {
  done: "#70E090",
  approved: "#70E090",
  review: "#B0A0F0",
  missed: "#F08080",
};

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function HistoryPage() {
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

  // Scope to the current grade's date range — older entries live in the archive
  // (Past Grades) instead, so this view doesn't mix school years together.
  const today = localDateStr(new Date());
  const currentYear = await getCurrentSchoolYear(supabase, user.id, today);

  let query = supabase
    .from("tasks")
    .select(
      `id, task_date, status, lesson_detail, final_score, overall_score,
       timer_seconds, admin_note,
       subjects!inner (id, name, icon, color)`,
    )
    .eq("student_id", user.id)
    .neq("status", "cancelled")
    .neq("status", "pending")
    .order("task_date", { ascending: false })
    .limit(500);

  if (currentYear) {
    query = query.gte("task_date", currentYear.start_date).lte("task_date", currentYear.end_date);
  }

  const { data: tasks } = await query;

  const entries = tasks ?? [];
  const studentColor = profile.color ?? "#4A90D0";

  // Group by date for a cleaner timeline
  const byDate: Record<string, typeof entries> = {};
  for (const t of entries) {
    if (!byDate[t.task_date]) byDate[t.task_date] = [];
    byDate[t.task_date].push(t);
  }
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <PageHeader
          icon="history"
          title="Mission Log"
          sub={`${entries.length} completed missions${currentYear ? ` · ${gradeLabel(currentYear.grade)}` : ""}`}
          color={studentColor}
        />
        <Link
          href="/student/archive"
          style={{
            flexShrink: 0,
            marginTop: 6,
            fontSize: 13,
            color: "#7A8B9C",
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 7,
            padding: "6px 12px",
          }}
        >
          View Past Grades →
        </Link>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>
          <Icon name="history" size={48} style={{ margin: "0 auto 12px" }} />
          <div className="cinzel" style={{ fontSize: 14 }}>
            No completed missions yet. Get to work, cadet!
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {sortedDates.map((date) => (
            <div key={date}>
              {/* Date header */}
              <div
                className="cinzel"
                style={{
                  fontSize: 13,
                  color: "#7A8B9C",
                  letterSpacing: "0.12em",
                  marginBottom: 8,
                  paddingLeft: 4,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  paddingBottom: 4,
                }}
              >
                {formatDate(date)}
              </div>

              {/* Tasks for this date */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 300px)", gap: 8 }}>
                {byDate[date].map((t) => {
                  // biome-ignore lint/suspicious/noExplicitAny: supabase join type
                  const sub = t.subjects as any;
                  const score = t.final_score ?? t.overall_score;

                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "11px 13px",
                        borderRadius: 9,
                        background: "rgba(0,0,0,0.26)",
                        border: `1px solid ${rgba(sub.color, 0.18)}`,
                        opacity: t.status === "missed" ? 0.52 : 1,
                      }}
                    >
                      <Icon name={sub.icon} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#EEE4CC",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {sub.name}
                        </div>
                        {t.lesson_detail && (
                          <div
                            style={{
                              fontSize: 13,
                              color: "#506070",
                              marginTop: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t.lesson_detail}
                          </div>
                        )}
                        {t.admin_note && (
                          <div style={{ fontSize: 13, color: "#B0A0F0", marginTop: 2 }}>💬 {t.admin_note}</div>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        {score != null && (
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: STATUS_COLOR[t.status] ?? studentColor,
                            }}
                          >
                            {Math.round(Number(score))}%
                          </span>
                        )}
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
