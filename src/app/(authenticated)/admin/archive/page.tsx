import Link from "next/link";
import { Icon, PageHeader, PortraitFrame } from "@/components/ui";
import { getAdminHouseholdId } from "@/lib/get-admin-household";
import { getCompletedSchoolYears } from "@/lib/school-year";
import { createClient } from "@/lib/supabase/server";
import { gradeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminArchivePage() {
  const supabase = await createClient();
  const today = localDateStr(new Date());

  const householdId = await getAdminHouseholdId();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_url")
    .eq("role", "student")
    .eq("household_id", householdId ?? "")
    .order("display_name");

  const students = profiles ?? [];

  const studentYears = await Promise.all(
    students.map(async (s) => ({
      student: s,
      years: await getCompletedSchoolYears(supabase, s.id, today),
    })),
  );

  // Which years already have a generated report card?
  const allYearIds = studentYears.flatMap((sy) => sy.years.map((y) => y.id));
  const generatedSet = new Set<string>();
  if (allYearIds.length > 0) {
    const { data: cards } = await supabase
      .from("report_cards")
      .select("school_year_id")
      .in("school_year_id", allYearIds);
    for (const c of cards ?? []) generatedSet.add(c.school_year_id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="completed" title="Past Grade Levels" sub="Archived records for completed school years" />

      {studentYears.every((sy) => sy.years.length === 0) && (
        <div className="glass" style={{ padding: 30, textAlign: "center", color: "#506070" }}>
          No completed school years yet — this section fills in once a grade's date range has ended.
        </div>
      )}

      {studentYears.map(
        ({ student, years }) =>
          years.length > 0 && (
            <div key={student.id} className="glass" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40 }}>
                  <PortraitFrame src={student.avatar_url ?? "/assets/icon-profile.png"} name={student.display_name} />
                </div>
                <div className="cinzel brass" style={{ fontSize: 15 }}>
                  {student.display_name}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {years.map((y) => (
                  <Link
                    key={y.id}
                    href={`/admin/archive/${y.id}`}
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 12,
                      borderRadius: 9,
                      background: "rgba(0,0,0,0.26)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Icon name="completed" size={32} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#EEE4CC" }}>{gradeLabel(y.grade)}</div>
                      <div style={{ fontSize: 12, color: "#506070" }}>
                        {y.year_label} · {generatedSet.has(y.id) ? "Generated" : "Not yet generated"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ),
      )}
    </div>
  );
}
