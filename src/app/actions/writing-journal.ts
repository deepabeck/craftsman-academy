"use server";

import { buildJournalPrompt } from "@/lib/journal-prompts";

/**
 * Generate a unique Writing Journal prompt that doesn't repeat anything used before.
 * See src/lib/journal-prompts.ts for how repeats are prevented.
 */
export async function generateWritingJournalPrompt(): Promise<{ prompt: string | null; error?: string }> {
  return buildJournalPrompt();
}
