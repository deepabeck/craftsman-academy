import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";
import { JournalClient } from "./journal-client";

export interface JournalEntry {
  taskId: string;
  date: string;
  prompt: string;
  submittedText: string | null;
  status: "pending" | "done" | "review" | "approved" | "missed";
  requiresReview: boolean;
}

export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_url, student_key")
    .eq("id", user.id)
    .single();

  if (!profile || profile.student_key === "admin") redirect("/admin/dashboard");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: process.env.APP_TIMEZONE ?? "America/Denver" });

  // Fetch current grade from school_years
  const { data: schoolYear } = await supabase
    .from("school_years")
    .select("grade")
    .eq("student_id", user.id)
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();
  const currentGrade: number | null = schoolYear?.grade ?? null;

  // Fetch all writing-journal tasks for this student, newest first
  const { data: rawTasks } = await supabase
    .from("tasks")
    .select(
      `id, task_date, lesson_detail, status, requires_review,
       submissions (submission_type, content)`,
    )
    .eq("student_id", user.id)
    .eq("subject_id", "writing-journal")
    .neq("status", "cancelled")
    .order("task_date", { ascending: false })
    .limit(30);

  const entries: JournalEntry[] = (rawTasks ?? []).map((t) => {
    // biome-ignore lint/suspicious/noExplicitAny: supabase join
    const subs = (t.submissions ?? []) as any[];
    const textSub = subs.find((s) => s.submission_type === "text");
    return {
      taskId: t.id,
      date: t.task_date,
      prompt: t.lesson_detail ?? "",
      submittedText: textSub?.content ?? null,
      status: t.status as JournalEntry["status"],
      requiresReview: t.requires_review ?? true,
    };
  });

  const todayEntry = entries.find((e) => e.date === today) ?? null;
  const pastEntries = entries.filter((e) => e.date < today);

  const student: Student = {
    id: profile.student_key ?? "",
    name: profile.display_name,
    color: profile.color ?? "#9BA4F0",
    currentGrade,
    avatar: profile.avatar_url ?? "",
    tagline: "",
    subjects: [],
  };

  return <JournalClient student={student} todayEntry={todayEntry} pastEntries={pastEntries} today={today} />;
}
