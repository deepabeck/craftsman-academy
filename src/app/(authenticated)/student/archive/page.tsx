import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, PageHeader } from "@/components/ui";
import { getCompletedSchoolYears } from "@/lib/school-year";
import { createClient } from "@/lib/supabase/server";
import { gradeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function StudentArchivePage() {
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

  const today = localDateStr(new Date());
  const years = await getCompletedSchoolYears(supabase, user.id, today);
  const studentColor = profile.color ?? "#4A90D0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="completed" title="Past Grade Levels" sub="Your archived records from earlier school years" />

      {years.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>
          <Icon name="completed" size={48} style={{ margin: "0 auto 12px" }} />
          <div className="cinzel" style={{ fontSize: 14 }}>
            Nothing archived yet — your current grade will show up here once it's finished.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {years.map((y) => (
            <Link
              key={y.id}
              href={`/student/archive/${y.id}`}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 14,
                borderRadius: 9,
                background: "rgba(0,0,0,0.26)",
                border: `1px solid ${studentColor}30`,
              }}
            >
              <Icon name="completed" size={36} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#EEE4CC" }}>{gradeLabel(y.grade)}</div>
                <div style={{ fontSize: 12, color: "#506070" }}>{y.year_label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
