import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SubmissionsClient, type SubmissionItem } from "./submissions-client";

export default async function SubmissionsPage() {
  const supabase = await createClient();
  const service = createServiceClient();

  // ── Fetch all submitted tasks (done, approved, review) for all students ───
  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      `id, task_date, status, lesson_detail, notes, timer_seconds, admin_note,
       final_score, overall_score, student_id,
       subjects!inner (id, name, icon, color),
       submissions (id, submission_type, content, timer_seconds, file_url, file_name, file_mime_type)`,
    )
    .in("status", ["done", "approved", "review"])
    .order("task_date", { ascending: false })
    .limit(1000);

  // ── Fetch student profiles ─────────────────────────────────────────────────
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_url, student_key")
    .neq("role", "admin");

  const profileMap: Record<string, { name: string; color: string; avatarUrl: string | null; studentKey: string }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = {
      name: p.display_name,
      color: p.color ?? "#4A90D0",
      avatarUrl: p.avatar_url ?? null,
      studentKey: p.student_key ?? "",
    };
  }

  // ── Fetch points_log to know which tasks already have approval points ──────
  const taskIds = (tasks ?? []).map((t) => t.id);
  const approvedTaskIds = new Set<string>();
  if (taskIds.length > 0) {
    const { data: pointsRows } = await service
      .from("points_log")
      .select("source_id")
      .eq("category", "task_approve")
      .in("source_id", taskIds);
    for (const row of pointsRows ?? []) {
      if (row.source_id) approvedTaskIds.add(row.source_id);
    }
  }

  // ── Generate signed URLs for file submissions ──────────────────────────────
  const resolveFileUrl = async (fileUrl: string | null): Promise<string | null> => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    const { data, error } = await service.storage.from("submissions").createSignedUrl(fileUrl, 3600);
    if (error) console.error(`[submissions] signed URL failed for "${fileUrl}":`, error.message);
    return data?.signedUrl ?? null;
  };

  // ── Map to SubmissionItem ──────────────────────────────────────────────────
  // biome-ignore lint/suspicious/noExplicitAny: supabase row
  const items: SubmissionItem[] = await Promise.all(
    // biome-ignore lint/suspicious/noExplicitAny: supabase row
    (tasks ?? []).map(async (t: any) => {
      const profile = profileMap[t.student_id] ?? {
        name: "Unknown",
        color: "#4A90D0",
        avatarUrl: null,
        studentKey: "",
      };
      const subject = t.subjects;

      // biome-ignore lint/suspicious/noExplicitAny: supabase row
      const resolvedSubs = await Promise.all(
        // biome-ignore lint/suspicious/noExplicitAny: supabase row
        (t.submissions ?? []).map(async (s: any) => ({
          id: s.id,
          type: s.submission_type as string,
          content: s.content ?? null,
          timerSeconds: s.timer_seconds ?? null,
          fileUrl: await resolveFileUrl(s.file_url),
          fileName: s.file_name ?? null,
          fileMimeType: s.file_mime_type ?? null,
        })),
      );

      return {
        taskId: t.id,
        taskDate: t.task_date as string,
        status: t.status as string,
        lessonDetail: t.lesson_detail ?? "",
        notes: t.notes ?? "",
        timerSeconds: t.timer_seconds ?? null,
        adminNote: t.admin_note ?? "",
        finalScore: t.final_score ?? t.overall_score ?? null,
        hasApprovalPoints: approvedTaskIds.has(t.id),
        student: {
          id: t.student_id,
          name: profile.name,
          color: profile.color,
          avatarUrl: profile.avatarUrl,
          studentKey: profile.studentKey,
        },
        subject: {
          id: subject.id,
          name: subject.name,
          icon: subject.icon,
          color: subject.color,
        },
        submissions: resolvedSubs,
      };
    }),
  );

  const studentList = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.display_name,
    color: p.color ?? "#4A90D0",
    avatarUrl: p.avatar_url ?? null,
    studentKey: p.student_key ?? "",
  }));

  return <SubmissionsClient items={items} students={studentList} />;
}
