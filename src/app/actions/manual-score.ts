"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Manually re-score a task with AI — called when admin clicks "AI Score".
 * Always does real AI review regardless of the task's scoring_approach setting.
 * Designed for photo submissions of handwritten academic work.
 */
export async function manualScoreTask(
  taskId: string,
): Promise<{ score: number | null; feedback: string | null; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { score: null, feedback: null, error: "ANTHROPIC_API_KEY not configured" };
  }

  const service = createServiceClient();

  // Fetch task + all submissions
  const { data: task, error: taskErr } = await service
    .from("tasks")
    .select(
      `id, lesson_detail, subjects(name),
       submissions(id, submission_type, content, file_url, file_name, file_mime_type, timer_seconds)`,
    )
    .eq("id", taskId)
    .single();

  if (taskErr || !task) {
    return { score: null, feedback: null, error: taskErr?.message ?? "Task not found" };
  }

  // biome-ignore lint/suspicious/noExplicitAny: supabase join
  const subjectName = (task.subjects as any)?.name ?? "Unknown subject";
  // biome-ignore lint/suspicious/noExplicitAny: supabase join
  const submissions = (task.submissions ?? []) as any[];
  const lessonDetail = (task as any).lesson_detail ?? "";

  const textSubs = submissions.filter((s) => s.submission_type === "text" && s.content);
  const imageSubs = submissions.filter(
    (s) => s.file_url && (s.submission_type === "photo" || (s.file_mime_type ?? "").startsWith("image/")),
  );

  if (submissions.length === 0) {
    return { score: null, feedback: null, error: "No submissions found for this task" };
  }

  // Build context
  let context = `Subject: ${subjectName}\n`;
  if (lessonDetail) context += `Assignment: ${lessonDetail}\n`;
  if (textSubs.length > 0) {
    context += `Student's written response: "${textSubs.map((s: any) => s.content).join(" ")}"\n`;
  }
  if (imageSubs.length > 0) {
    context += `Student submitted ${imageSubs.length} image(s) of handwritten work (attached below).\n`;
  }

  const userContent: Anthropic.MessageParam["content"] = [{ type: "text", text: context }];

  // Attach images
  for (const imgSub of imageSubs.slice(0, 3)) {
    try {
      let imageUrl = imgSub.file_url as string;
      if (!imageUrl.startsWith("http")) {
        const { data, error: urlErr } = await service.storage.from("submissions").createSignedUrl(imageUrl, 300);
        if (urlErr || !data?.signedUrl) {
          console.error("[manual-score] Failed to sign URL:", urlErr?.message, "for path:", imageUrl);
          continue;
        }
        imageUrl = data.signedUrl;
      }
      const res = await fetch(imageUrl);
      if (!res.ok) {
        console.error("[manual-score] Failed to fetch image:", res.status, imageUrl.slice(0, 80));
        continue;
      }
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const rawMime = imgSub.file_mime_type ?? "image/jpeg";
      const mediaType = (
        ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(rawMime) ? rawMime : "image/jpeg"
      ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      userContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
      console.log("[manual-score] Attached image:", imageUrl.slice(0, 60));
    } catch (e) {
      console.error("[manual-score] Image attach error:", e);
    }
  }

  // Prompt
  const hasImages = userContent.some((c) => c.type === "image");

  if (hasImages) {
    userContent.push({
      type: "text",
      text: `Review this student's handwritten work carefully.

1. Count ALL visible questions or problems (total_questions).
2. Solve each one yourself, then compare to the student's answer.
3. List every wrong answer in wrong_items (e.g. "368×14: student wrote 5,052, correct is 5,152").
4. score = round((correct / total) × 100). Do NOT inflate — wrong answers must reduce the score.
5. For word problems: determine the expected answer and check if the student's matches.

Respond ONLY with valid JSON:
{"score": <0-100>, "total_questions": <n>, "correct": <n>, "wrong_items": ["<desc>", ...], "feedback": "<1-2 sentences for the student>"}`,
    });
  } else {
    userContent.push({
      type: "text",
      text: 'Evaluate this submission. Respond ONLY with valid JSON:\n{"score": <0-100>, "total_questions": null, "correct": null, "wrong_items": [], "feedback": "<1-2 sentences>"}',
    });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      system: hasImages
        ? "You are a precise academic grader. Count every problem, check every answer, and score strictly based on correctness. Wrong answers must lower the score proportionally. Respond ONLY with valid JSON."
        : "You are a supportive homeschool tutor. Score 0-100 based on quality and effort. Respond ONLY with valid JSON.",
      messages: [{ role: "user", content: userContent }],
    });

    const rawText = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    console.log("[manual-score] Claude raw response:", rawText.slice(0, 200));

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON in response: ${rawText.slice(0, 100)}`);

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

    let feedback = String(parsed.feedback ?? "");
    if (wrongItems.length > 0) feedback += ` Review: ${wrongItems.join("; ")}.`;
    if (totalQ !== null && correctQ !== null) feedback = `${correctQ}/${totalQ} correct. ${feedback}`;

    await service.from("tasks").update({ ai_score: score, ai_feedback: feedback, final_score: score }).eq("id", taskId);

    console.log("[manual-score] Scored task", taskId, "→", score, "hasImages:", hasImages);
    return { score, feedback };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Scoring failed";
    console.error("[manual-score] Error:", msg);
    return { score: null, feedback: null, error: msg };
  }
}
