import { notFound } from "next/navigation";
import {
  GradeArchiveView,
  type JournalEntryItem,
  type MissionEntry,
  type ReportCardData,
  type SubmissionEntry,
} from "@/components/report-card/report-card-view";
import { formatDateRange } from "@/lib/school-year";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function AdminArchiveDetailPage({ params }: { params: Promise<{ schoolYearId: string }> }) {
  const { schoolYearId } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: schoolYear } = await supabase
    .from("school_years")
    .select("id, student_id, grade, year_label, start_date, end_date")
    .eq("id", schoolYearId)
    .single();

  if (!schoolYear) notFound();

  const { data: student } = await supabase
    .from("profiles")
    .select("id, display_name, color")
    .eq("id", schoolYear.student_id)
    .single();

  if (!student) notFound();

  const { data: cardRow } = await supabase
    .from("report_cards")
    .select("*")
    .eq("school_year_id", schoolYearId)
    .maybeSingle();

  const reportCard: ReportCardData | null = cardRow
    ? {
        id: cardRow.id,
        generatedAt: cardRow.generated_at,
        totalTasks: cardRow.total_tasks,
        completedTasks: cardRow.completed_tasks,
        missedTasks: cardRow.missed_tasks,
        overallCompletionPct: cardRow.overall_completion_pct != null ? Number(cardRow.overall_completion_pct) : null,
        overallAvgScore: cardRow.overall_avg_score != null ? Number(cardRow.overall_avg_score) : null,
        submissionCount: cardRow.submission_count,
        journalEntryCount: cardRow.journal_entry_count,
        cogsBalanceSnapshot: cardRow.cogs_balance_snapshot,
        // biome-ignore lint/suspicious/noExplicitAny: jsonb column
        subjectBreakdown: (cardRow.subject_breakdown ?? []) as any,
        parentNotes: cardRow.parent_notes ?? "",
      }
    : null;

  // ── Mission Log for this grade's date range ──────────────────────────────
  const { data: taskRows } = await supabase
    .from("tasks")
    .select("id, task_date, status, final_score, overall_score, subjects!inner (id, name, icon, color)")
    .eq("student_id", student.id)
    .neq("status", "cancelled")
    .gte("task_date", schoolYear.start_date)
    .lte("task_date", schoolYear.end_date)
    .order("task_date", { ascending: false })
    .limit(1000);

  const missions: MissionEntry[] = (taskRows ?? []).map((t) => {
    // biome-ignore lint/suspicious/noExplicitAny: supabase join
    const sub = t.subjects as any;
    return {
      id: t.id,
      date: t.task_date,
      subjectName: sub.name,
      subjectIcon: sub.icon,
      subjectColor: sub.color,
      status: t.status,
      score: t.final_score ?? t.overall_score ?? null,
    };
  });

  // ── Submitted materials for this grade's date range ──────────────────────
  const { data: submissionRows } = await supabase
    .from("tasks")
    .select(
      `id, task_date, subjects!inner (name),
       submissions (id, submission_type, content, file_url, file_name)`,
    )
    .eq("student_id", student.id)
    .in("status", ["done", "approved", "review"])
    .gte("task_date", schoolYear.start_date)
    .lte("task_date", schoolYear.end_date)
    .order("task_date", { ascending: false })
    .limit(1000);

  const resolveFileUrl = async (fileUrl: string | null): Promise<string | null> => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    const { data } = await service.storage.from("submissions").createSignedUrl(fileUrl, 3600);
    return data?.signedUrl ?? null;
  };

  const submissions: SubmissionEntry[] = (
    await Promise.all(
      // biome-ignore lint/suspicious/noExplicitAny: supabase row
      (submissionRows ?? []).flatMap((t: any) =>
        // biome-ignore lint/suspicious/noExplicitAny: supabase row
        (t.submissions ?? []).map(async (s: any) => ({
          id: s.id,
          date: t.task_date,
          subjectName: t.subjects.name,
          type: s.submission_type,
          content: s.content ?? null,
          fileUrl: await resolveFileUrl(s.file_url),
          fileName: s.file_name ?? null,
        })),
      ),
    )
  ).sort((a, b) => (a.date < b.date ? 1 : -1));

  // ── Writing journal entries for this grade's date range ──────────────────
  const { data: journalRows } = await supabase
    .from("tasks")
    .select(`id, task_date, lesson_detail, submissions (submission_type, content)`)
    .eq("student_id", student.id)
    .eq("subject_id", "writing-journal")
    .neq("status", "cancelled")
    .gte("task_date", schoolYear.start_date)
    .lte("task_date", schoolYear.end_date)
    .order("task_date", { ascending: false });

  const journalEntries: JournalEntryItem[] = (journalRows ?? []).map((t) => {
    // biome-ignore lint/suspicious/noExplicitAny: supabase join
    const subs = (t.submissions ?? []) as any[];
    const textSub = subs.find((s) => s.submission_type === "text");
    return {
      id: t.id,
      date: t.task_date,
      prompt: t.lesson_detail ?? "",
      text: textSub?.content ?? null,
    };
  });

  return (
    <GradeArchiveView
      studentName={student.display_name}
      studentColor={student.color ?? "#4A90D0"}
      schoolYearId={schoolYear.id}
      grade={schoolYear.grade}
      yearLabel={schoolYear.year_label}
      dateRangeLabel={formatDateRange(schoolYear.start_date, schoolYear.end_date)}
      reportCard={reportCard}
      missions={missions}
      submissions={submissions}
      journalEntries={journalEntries}
      canEdit={true}
    />
  );
}
