import { createClient } from "@/lib/supabase/server";
import { ReviewClient, type ReviewItem } from "./review-client";

export default async function ReviewPage() {
  const supabase = await createClient();

  // Fetch all tasks in 'review' status with full joins
  const { data: reviewTasks, error: reviewError } = await supabase
    .from("tasks")
    .select(
      `id, task_date, status, lesson_detail, notes, timer_seconds, admin_note,
       profiles!inner (id, display_name, color, avatar_url, student_key),
       subjects!inner (id, name, icon, color),
       submissions (id, submission_type, content, timer_seconds, file_url, file_name, file_mime_type)`,
    )
    .eq("status", "review")
    .order("task_date", { ascending: false });

  if (reviewError) console.error("Review queue fetch error:", reviewError.message);

  // Fetch recently approved/rejected tasks (last 7 days) for the completed section
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: completedTasks } = await supabase
    .from("tasks")
    .select(
      `id, task_date, status, lesson_detail, notes, timer_seconds, admin_note,
       profiles!inner (id, display_name, color, avatar_url, student_key),
       subjects!inner (id, name, icon, color),
       submissions (id, submission_type, content, timer_seconds, file_url, file_name, file_mime_type)`,
    )
    .in("status", ["approved"])
    .gte("task_date", sevenDaysAgo)
    .order("task_date", { ascending: false })
    .limit(20);

  // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
  const mapItem = (t: any): ReviewItem => {
    const profile = t.profiles;
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
      // biome-ignore lint/suspicious/noExplicitAny: supabase join typing
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

  const pendingItems: ReviewItem[] = (reviewTasks ?? []).map(mapItem);
  const completedItems: ReviewItem[] = (completedTasks ?? []).map(mapItem);

  return <ReviewClient initialItems={pendingItems} completedItems={completedItems} />;
}
