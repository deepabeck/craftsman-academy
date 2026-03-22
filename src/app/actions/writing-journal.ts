"use server";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Generate a unique, age-appropriate writing journal prompt for a 4th grader.
 * Stores the result as the lesson plan's assignment_detail — no extra DB column needed.
 */
export async function generateWritingJournalPrompt(): Promise<{ prompt: string | null; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { prompt: null, error: "ANTHROPIC_API_KEY not configured" };
  }

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
- Return ONLY the prompt text. No labels, no quotes, no preamble.`,
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
