"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Generate a unique, age-appropriate writing journal prompt for a 4th grader.
 * Fetches the last 12 used prompts from the DB and tells Claude to avoid them.
 */
export async function generateWritingJournalPrompt(): Promise<{ prompt: string | null; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { prompt: null, error: "ANTHROPIC_API_KEY not configured" };
  }

  // Fetch recently used prompts so Claude can avoid repeating them
  let recentPrompts: string[] = [];
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("lesson_plans")
      .select("assignment_detail")
      .eq("subject_id", "writing-journal")
      .neq("assignment_detail", "")
      .neq("assignment_detail", "Write your journal entry for today.")
      .order("created_at", { ascending: false })
      .limit(12);
    recentPrompts = (data ?? []).map((r) => r.assignment_detail as string).filter(Boolean);
  } catch {
    // Non-fatal — proceed without history
  }

  const avoidSection =
    recentPrompts.length > 0
      ? `\n\nPrompts already used recently (do NOT repeat or closely paraphrase any of these):\n${recentPrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : "";

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 120,
      system: `You write engaging writing journal prompts for 4th grade students (age 9).
Prompts rotate across these four categories:
- Opinion: share a point of view on something familiar (food, games, school subjects, animals, seasons, etc.)
- Discovery: describe an interesting fact or something the student learned recently
- Creative: invent a short scenario, character, or story beginning
- Personal: reflect on a recent experience, memory, or something they enjoy

Rules:
- One or two sentences maximum.
- Simple, clear vocabulary a 9-year-old understands.
- Ask a specific question or give a specific starting point — not vague.
- The student should be able to respond in 3–5 sentences.
- Return ONLY the prompt text. No labels, no quotes, no preamble.
- Choose a category that has NOT been used recently to keep variety high.${avoidSection}`,
      messages: [{ role: "user", content: "Generate one writing journal prompt." }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    if (!text) return { prompt: null, error: "Empty response from AI" };
    return { prompt: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { prompt: null, error: msg };
  }
}
