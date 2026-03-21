import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ReviewClient, type ReviewItem } from "./review-client";

export default async function ReviewPage() {
  const supabase = await createClient();

  // ── Step 1: fetch tasks (no profiles join — avoids FK ambiguity) ──────────
  const { data: reviewTasks, error: reviewError } = await supabase
    .from("tasks")
    .select(
      `id, task_date, status, lesson_detail, notes, timer_seconds, admin_note, student_id,
       subjects!inner (id, name, icon, color),
       submissions (id, submission_type, content, timer_seconds, file_url, file_name, file_mime_type)`,
    )
    .eq("status", "review")
    .order("task_date", { ascending: false });

  if (reviewError) console.error("Review tasks fetch error:", reviewError.message);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: completedTasks } = await supabase
    .from("tasks")
    .select(
      `id, task_date, status, lesson_detail, notes, timer_seconds, admin_note, student_id,
       subjects!inner (id, name, icon, color),
       submissions (id, submission_type, content, timer_seconds, file_url, file_name, file_mime_type)`,
    )
    .in("status", ["approved"])
    .gte("task_date", sevenDaysAgo)
    .order("task_date", { ascending: false })
    .limit(20);

  // ── Step 2: fetch profiles for all unique student_ids ─────────────────────
  const allTasks = [...(reviewTasks ?? []), ...(completedTasks ?? [])];
  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  const studentIds = [...new Set(allTasks.map((t: any) => t.student_id).filter(Boolean))];

  const profileMap: Record<
    string,
    { id: string; display_name: string; color: string; avatar_url: string | null; student_key: string }
  > = {};

  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, color, avatar_url, student_key")
      .in("id", studentIds);

    for (const p of profiles ?? []) {
      profileMap[p.id] = p;
    }
  }

  // ── Step 3: generate signed URLs for file submissions (admin bypasses RLS) ─
  const service = createServiceClient();

  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  const resolveFileUrl = async (fileUrl: string | null): Promise<string | null> => {
    if (!fileUrl) return null;
    // Already a full signed URL (starts with http)
    if (fileUrl.startsWith("http")) return fileUrl;
    const { data } = await service.storage.from("submissions").createSignedUrl(fileUrl, 3600);
    return data?.signedUrl ?? null;
  };

  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  const resolveSubmissions = async (subs: any[]) =>
    Promise.all(
      // biome-ignore lint/suspicious/noExplicitAny: supabase row type
      (subs ?? []).map(async (s: any) => ({
        ...s,
        file_url: await resolveFileUrl(s.file_url),
      })),
    );

  // Resolve for all tasks in parallel
  const [resolvedReview, resolvedCompleted] = await Promise.all([
    // biome-ignore lint/suspicious/noExplicitAny: supabase row type
    Promise.all((reviewTasks ?? []).map(async (t: any) => ({ ...t, submissions: await resolveSubmissions(t.submissions) }))),
    // biome-ignore lint/suspicious/noExplicitAny: supabase row type
    Promise.all((completedTasks ?? []).map(async (t: any) => ({ ...t, submissions: await resolveSubmissions(t.submissions) }))),
  ]);

  // ── Map rows → ReviewItem ─────────────────────────────────────────────────
  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  const mapItem = (t: any): ReviewItem => {
    const profile = profileMap[t.student_id] ?? {
      id: t.student_id,
      display_name: "Unknown",
      color: "#4A90D0",
      avatar_url: null,
      student_key: "",
    };
    const subject = t.subjects;
    return {
      taskId: t.id,
      taskDate: t.task_date,
      lessonDetail: t.lesson_detail ?? "",
      notes: t.notes ?? "",
      timerSeconds: t.timer_seconds ?? 0,
      adminNote: t.admin_note ?? "",
      status: t.status,
      student: {
        id: profile.id,
        name: profile.display_name,
        color: profile.color ?? "#4A90D0",
        avatarUrl: profile.avatar_url ?? null,
        studentKey: profile.student_key ?? "",
      },
      subject: {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        color: subject.color,
      },
      // biome-ignore lint/suspicious/noExplicitAny: supabase row type
      submissions: (t.submissions ?? []).map((s: any) => ({
        id: s.id,
        type: s.submission_type,
        content: s.content ?? null,
        timerSeconds: s.timer_seconds ?? null,
        fileUrl: s.file_url ?? null,
        fileName: s.file_name ?? null,
        fileMimeType: s.file_mime_type ?? null,
      })),
    };
  };

  const pendingItems: ReviewItem[] = resolvedReview.map(mapItem);
  const completedItems: ReviewItem[] = resolvedCompleted.map(mapItem);

  return <ReviewClient initialItems={pendingItems} completedItems={completedItems} />;
}
