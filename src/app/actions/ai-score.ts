"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Score a task submission with AI (Claude).
 *
 * Scoring strategies:
 *   completion    → always 100 if submitted (no AI needed)
 *   time_based    → math: actual_seconds / (duration * 60), capped 100
 *   review_based  → Claude reads text + images and scores 0–100
 *   mixed         → Claude reviews all proof types together
 *   platform_sync → not scorable by AI; returns null
 *
 * Writes ai_score, ai_feedback, final_score to the tasks table.
 * Safe to call with a missing ANTHROPIC_API_KEY — returns an error string.
 */
export async function scoreTaskWithAI(
  taskId: string,
): Promise<{ score: number | null; feedback: string | null; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[ai-score] ANTHROPIC_API_KEY not set — skipping AI scoring");
    return { score: null, feedback: null, error: "ANTHROPIC_API_KEY not configured" };
  }

  const service = createServiceClient();

  // ── Fetch task with submission details ──────────────────────────────────────
  const { data: task, error: taskError } = await service
    .from("tasks")
    .select(
      `id, lesson_detail, scoring_approach, duration, timer_seconds,
       subjects (name),
       submissions (id, submission_type, content, timer_seconds, file_url, file_name, file_mime_type)`,
    )
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return { score: null, feedback: null, error: taskError?.message ?? "Task not found" };
  }

  const scoring = (task.scoring_approach ?? "completion") as string;
  // biome-ignore lint/suspicious/noExplicitAny: supabase join type
  const subjectName = (task.subjects as any)?.name ?? "Unknown subject";
  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  const submissions = (task.submissions ?? []) as any[];

  // ── Completion scoring: always 100 ─────────────────────────────────────────
  if (scoring === "completion") {
    const score = 100;
    const feedback = "Task completed — great job!";
    await service.from("tasks").update({ ai_score: score, ai_feedback: feedback, final_score: score }).eq("id", taskId);
    return { score, feedback };
  }

  // ── Time-based scoring: math only ──────────────────────────────────────────
  if (scoring === "time_based") {
    const targetSec = (task.duration ?? 0) * 60;
    const actualSec = task.timer_seconds ?? 0;
    const score = targetSec > 0 ? Math.min(100, Math.round((actualSec / targetSec) * 100)) : 100;
    const pct = targetSec > 0 ? Math.round((actualSec / targetSec) * 100) : 100;
    const mins = Math.floor(actualSec / 60);
    const feedback =
      pct >= 90
        ? "Excellent time on task — you hit your target!"
        : pct >= 60
          ? `Good effort — you completed ${pct}% of your ${task.duration}-minute goal.`
          : `You worked ${mins}m out of a ${task.duration}-minute goal. Keep building that stamina!`;
    await service.from("tasks").update({ ai_score: score, ai_feedback: feedback, final_score: score }).eq("id", taskId);
    return { score, feedback };
  }

  // ── Platform sync: not AI-scorable ─────────────────────────────────────────
  if (scoring === "platform_sync") {
    return { score: null, feedback: null, error: "platform_sync tasks are scored by the external platform" };
  }

  // ── AI review (review_based / mixed) ───────────────────────────────────────
  const lessonDetail = task.lesson_detail ?? "";
  const textSubs = submissions.filter((s) => s.submission_type === "text" && s.content);
  const timerSubs = submissions.filter((s) => s.submission_type === "timer");
  const imageSubs = submissions.filter(
    (s) => s.file_url && (s.submission_type === "photo" || (s.file_mime_type ?? "").startsWith("image/")),
  );
  const otherFileSubs = submissions.filter(
    (s) => s.file_url && !imageSubs.includes(s), // audio, video, pdf, other
  );

  // Build context text
  let context = `Subject: ${subjectName}\n`;
  if (lessonDetail) context += `Assignment: ${lessonDetail}\n`;
  if (timerSubs.length > 0) {
    const totalSec = timerSubs.reduce((sum: number, s) => sum + (s.timer_seconds ?? 0), 0);
    if (task.duration) context += `Target duration: ${task.duration} minutes. `;
    context += `Student worked for ${Math.floor(totalSec / 60)}m ${totalSec % 60}s.\n`;
  }
  if (textSubs.length > 0) {
    context += `Student's note: "${textSubs.map((s) => s.content).join(" ")}"\n`;
  }
  if (imageSubs.length > 0) {
    context += `Student submitted ${imageSubs.length} image(s) of their work (included below).\n`;
  }
  if (otherFileSubs.length > 0) {
    const names = otherFileSubs.map((s) => s.file_name ?? s.submission_type).join(", ");
    context += `Student also submitted: ${names}\n`;
  }
  if (submissions.length === 0) {
    context += "No submission content was found.\n";
  }

  // Build message content array
  const userContent: Anthropic.MessageParam["content"] = [{ type: "text", text: context }];

  // Attach up to 3 images (fetch → base64)
  for (const imgSub of imageSubs.slice(0, 3)) {
    try {
      let imageUrl = imgSub.file_url as string;
      if (!imageUrl.startsWith("http")) {
        const { data } = await service.storage.from("submissions").createSignedUrl(imageUrl, 300);
        imageUrl = data?.signedUrl ?? "";
      }
      if (!imageUrl) continue;
      const res = await fetch(imageUrl);
      if (!res.ok) continue;
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const rawMime = imgSub.file_mime_type ?? "image/jpeg";
      const mediaType = (
        ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(rawMime) ? rawMime : "image/jpeg"
      ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      userContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
    } catch {
      // Skip this image — continue scoring without it
    }
  }

  userContent.push({
    type: "text",
    text: 'Evaluate this student submission and respond with JSON only — no other text:\n{"score": <0-100>, "feedback": "<1-2 short encouraging sentences for the student>"}',
  });

  // ── Call Claude ─────────────────────────────────────────────────────────────
  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 150,
      system:
        "You are a supportive homeschool tutor reviewing a student's submitted work. " +
        "Score 0–100 based on effort, quality, and how well it matches the assignment. " +
        "Keep feedback brief, positive, and constructive — the student will read it. " +
        "Respond ONLY with valid JSON.",
      messages: [{ role: "user", content: userContent }],
    });

    const rawText = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`Unexpected response: ${rawText.slice(0, 80)}`);

    const parsed = JSON.parse(jsonMatch[0]) as { score: unknown; feedback: unknown };
    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.score))));
    const feedback = String(parsed.feedback ?? "");

    await service.from("tasks").update({ ai_score: score, ai_feedback: feedback, final_score: score }).eq("id", taskId);

    return { score, feedback };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI scoring failed";
    console.error("[ai-score] Error scoring task", taskId, ":", msg);
    return { score: null, feedback: null, error: msg };
  }
}
