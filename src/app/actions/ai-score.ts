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
  forceReview = false,
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

  const scoringRaw = (task.scoring_approach ?? "completion") as string;
  // biome-ignore lint/suspicious/noExplicitAny: supabase join type
  const subjectName = (task.subjects as any)?.name ?? "Unknown subject";
  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  const submissions = (task.submissions ?? []) as any[];

  const hasPhotoSubmissions = submissions.some(
    (s) => s.file_url && (s.submission_type === "photo" || (s.file_mime_type ?? "").startsWith("image/")),
  );

  // forceReview=true (admin clicking "AI Score") or photo submission → always do real AI review
  const scoring =
    forceReview || (scoringRaw === "completion" && hasPhotoSubmissions)
      ? hasPhotoSubmissions
        ? "review_based"
        : "review_based"
      : scoringRaw;

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

  // Guard: if there's genuinely no content to evaluate, score 0 — don't call Claude
  const hasContent = textSubs.length > 0 || imageSubs.length > 0 || timerSubs.length > 0 || otherFileSubs.length > 0;

  if (!hasContent) {
    const score = 0;
    const feedback = "No submission content was found — please write your response before submitting.";
    await service.from("tasks").update({ ai_score: score, ai_feedback: feedback, final_score: score }).eq("id", taskId);
    return { score, feedback };
  }

  // ── Determine grading mode ──────────────────────────────────────────────────
  // Photo submissions of academic work (workbooks, quizzes, tests) use strict
  // answer-checking mode. Text-only submissions (essays, journals) use the
  // encouraging qualitative mode.
  const isPhotoGradedWork = imageSubs.length > 0 && textSubs.length === 0;

  // Build context text
  let context = `Subject: ${subjectName}\n`;
  if (lessonDetail) context += `Assignment: ${lessonDetail}\n`;
  if (timerSubs.length > 0) {
    const totalSec = timerSubs.reduce((sum: number, s) => sum + (s.timer_seconds ?? 0), 0);
    if (task.duration) context += `Target duration: ${task.duration} minutes. `;
    context += `Student worked for ${Math.floor(totalSec / 60)}m ${totalSec % 60}s.\n`;
  }
  if (textSubs.length > 0) {
    context += `Student's written response: "${textSubs.map((s) => s.content).join(" ")}"\n`;
  }
  if (imageSubs.length > 0) {
    context += `Student submitted ${imageSubs.length} image(s) of their handwritten work (attached below).\n`;
  }
  if (otherFileSubs.length > 0) {
    const names = otherFileSubs.map((s) => s.file_name ?? s.submission_type).join(", ");
    context += `Student also submitted: ${names}\n`;
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

  // ── Build prompt based on grading mode ────────────────────────────────────
  if (isPhotoGradedWork) {
    userContent.push({
      type: "text",
      text: `Review this student's handwritten work image carefully.

Your job:
1. Count ALL visible questions or problems on the page (total_questions).
2. Check EACH answer for correctness. For math: solve it yourself and compare. For word problems: determine the expected answer and check the student's answer.
3. List every problem that has a wrong answer (wrong_items) — be specific, e.g. "7 × 8: student wrote 54, correct is 56".
4. If you cannot read the handwriting clearly for a problem, skip it and note it.
5. Score = (correct answers / total questions) × 100, rounded to nearest integer.
   - If all correct: 100. If half wrong: ~50. Proportional — do NOT inflate.
6. For word problems: if the problem is ambiguous or requires outside context you don't have, note it but do your best.

Respond ONLY with valid JSON, no other text:
{"score": <0-100>, "total_questions": <n>, "correct": <n>, "wrong_items": ["<description>", ...], "feedback": "<1-2 sentences for the student noting what to review>"}`,
    });
  } else {
    userContent.push({
      type: "text",
      text: 'Evaluate this student submission and respond with JSON only — no other text:\n{"score": <0-100>, "total_questions": null, "correct": null, "wrong_items": [], "feedback": "<1-2 short encouraging sentences for the student>"}',
    });
  }

  // ── Call Claude ─────────────────────────────────────────────────────────────
  const systemPrompt = isPhotoGradedWork
    ? "You are a precise academic grader reviewing a homeschool student's handwritten work. " +
      "Accuracy is the primary metric — count questions, check every answer, and score proportionally based on correctness. " +
      "Do not inflate scores. Wrong answers must reduce the score. " +
      "Feedback should be direct but kind — tell the student specifically what to review. " +
      "Respond ONLY with valid JSON."
    : "You are a supportive homeschool tutor reviewing a student's submitted work. " +
      "Score 0–100 based on effort, quality, and how well it matches the assignment. " +
      "Keep feedback brief, positive, and constructive — the student will read it. " +
      "Respond ONLY with valid JSON.";

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const rawText = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`Unexpected response: ${rawText.slice(0, 80)}`);

    const parsed = JSON.parse(jsonMatch[0]) as {
      score: unknown;
      feedback: unknown;
      total_questions?: unknown;
      correct?: unknown;
      wrong_items?: unknown[];
    };

    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.score))));
    const totalQ = parsed.total_questions != null ? Number(parsed.total_questions) : null;
    const correctQ = parsed.correct != null ? Number(parsed.correct) : null;
    const wrongItems = Array.isArray(parsed.wrong_items) ? (parsed.wrong_items as string[]) : [];

    // Build rich feedback: base feedback + wrong items list if any
    let feedback = String(parsed.feedback ?? "");
    if (wrongItems.length > 0) {
      feedback += ` Review: ${wrongItems.join("; ")}.`;
    }
    if (totalQ !== null && correctQ !== null) {
      feedback = `${correctQ}/${totalQ} correct. ${feedback}`;
    }

    await service.from("tasks").update({ ai_score: score, ai_feedback: feedback, final_score: score }).eq("id", taskId);

    return { score, feedback };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI scoring failed";
    console.error("[ai-score] Error scoring task", taskId, ":", msg);
    return { score: null, feedback: null, error: msg };
  }
}
