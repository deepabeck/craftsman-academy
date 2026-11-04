import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";
import { gradeLabel } from "@/lib/utils";

/**
 * Writing Journal prompt generation.
 *
 * Why this is more than one LLM call:
 *  - It reads EVERY prompt ever used (lesson plans + tasks), not just the last dozen.
 *  - It asks for several candidates and rejects any that overlap an old prompt
 *    (checked in code, not left to the model's memory).
 *  - It rotates through prompt "angles" so topics don't cluster, and limits baseball.
 */

export const JOURNAL_PLACEHOLDER = "Write your journal entry for today.";

const STOP = new Set(
  "a an the and or but if then so to of in on at for with from by as is are was were be been being it its this that these those you your yours i me my we our they them their he she his her what who which when where why how do does did can could would should will just about into over than too very more most some any each one two have has had not no yes like get got up down out off all also really still even there here make made think thought tell write describe explain imagine something someone anything".split(
    " ",
  ),
);

function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => w.replace(/(ing|ed|es|s)$/, "")),
  );
}

/** True if a candidate is too close to a previously used prompt. */
export function tooSimilar(candidate: string, history: string[]): boolean {
  const c = words(candidate);
  if (c.size === 0) return true;
  for (const h of history) {
    const hw = words(h);
    let shared = 0;
    for (const w of c) if (hw.has(w)) shared++;
    const jaccard = shared / (c.size + hw.size - shared || 1);
    if (jaccard > 0.25 || shared >= 3) return true;
  }
  return false;
}

const ANGLES = [
  "ZANY STORY STARTER: drop them into a wild, funny fantasy situation and ask what happens next (adventure-series energy: monsters, heroes, sidekicks, silly villains).",
  "INVENT SOMETHING: have them design a character, creature, power, card, gadget or game level, and explain how it works.",
  "BIOLOGY CURIOSITY: tie to 6th-grade biology (cells, DNA, ecosystems, adaptations, the human body) with a playful twist, no quiz-style recall.",
  "GRIT & GROWTH: a short reflection on effort, mistakes, courage or sticking with something hard (Growth Mindset / Uplift Kids themes: strength, courage, grit), using their own real experience.",
  "MUSIC & CREATIVITY: a song, a sound, a performance or making art/music (without quoting lyrics); what it makes them feel or imagine.",
  "WOULD-YOU-RATHER / WHAT-IF: a funny or surprising dilemma where they must pick a side and give a reason.",
  "ADVICE OR LETTER: write a short note, tip or message to someone (a younger kid, a teammate, their future self, a character).",
  "ONE SMALL TRUE STORY: a specific moment from their own life that is not about food, favorite things, or school subjects.",
];

const PROFILE = `About the two students (brothers, both in 5th grade, ~10 years old):
- Both: funny, sweet, smart, curious; love to read, create and play. Love card games, Nintendo Switch (especially Mario Maker), playing and practicing baseball (Little League), and inventing zany fantasy stories inspired by adventure book series (Last Kids on Earth, Captain Underpants, Gregor the Overlander). They like pop/rock music (OneRepublic, Imagine Dragons, Taylor Swift, Ed Sheeran).
- Deven: loves creating stories, characters and plots; growing in confidence as he practices baseball.
- Shaan: artistic (piano, drawing, singing).
Currently studying: 6th-grade biology, Growth Mindset for Kids (Khan Academy), Uplift Kids (strength, courage, grit, etc.).`;

async function loadHistory(): Promise<string[]> {
  const service = createServiceClient();
  const out: string[] = [];
  try {
    const { data: plans } = await service
      .from("lesson_plans")
      .select("assignment_detail, week_start")
      .eq("subject_id", "writing-journal")
      .order("week_start", { ascending: false })
      .limit(300);
    for (const p of plans ?? []) out.push(String(p.assignment_detail ?? ""));
    const { data: tasks } = await service
      .from("tasks")
      .select("lesson_detail, task_date")
      .eq("subject_id", "writing-journal")
      .order("task_date", { ascending: false })
      .limit(300);
    for (const t of tasks ?? []) out.push(String(t.lesson_detail ?? ""));
  } catch {
    // non-fatal: fall through with whatever we have
  }
  const seen = new Set<string>();
  return out
    .map((s) => s.trim())
    .filter((s) => s && s !== JOURNAL_PLACEHOLDER && !seen.has(s) && seen.add(s) !== undefined);
}

function weekIndex(): number {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Generate one new prompt. `alsoAvoid` lets a caller that is making several prompts
 * in a row (e.g. copying a whole week forward) keep them from repeating each other.
 */
export async function buildJournalPrompt(alsoAvoid: string[] = []): Promise<{ prompt: string | null; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { prompt: null, error: "ANTHROPIC_API_KEY not configured" };

  const service = createServiceClient();
  const today = new Date().toISOString().split("T")[0];
  let grade = 5;
  try {
    const { data: sy } = await service
      .from("school_years")
      .select("grade")
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(1)
      .maybeSingle();
    if (sy?.grade) grade = sy.grade as number;
  } catch {
    // keep default
  }

  const history = [...alsoAvoid, ...(await loadHistory())];
  const recent = history.slice(0, 5);
  const baseballRecently = recent.some((p) => /baseball|little league|softball|\bbat(ting)?\b|\bteam\b/i.test(p));
  // Pick this week's angle, shifted by how many prompts we already made this run.
  const angle = ANGLES[(weekIndex() + alsoAvoid.length) % ANGLES.length];

  const system = `You write ONE Writing Journal prompt for ${gradeLabel(grade)} students (age ~${grade + 5}).

${PROFILE}

Prompt rules:
- 1-2 sentences. Kid-friendly vocabulary. It must be answerable well in 3-5 sentences.
- Open enough that a storyteller and an artist could both run with it (they may describe a drawing or a scene).
- Fun, surprising, a little silly is welcome. Specific, never vague.
- NEVER ask about favorite food, favorite subject, favorite season/color/animal/movie, or other "favorites" lists. No generic "what did you do this weekend" prompts.
- Do not quote song lyrics.
- ${baseballRecently ? "Do NOT mention baseball, Little League or sports this time (a recent prompt already did)." : "Baseball is allowed only if it feels fresh, not as a default."}
- Angle for this prompt: ${angle}

Return a JSON array of exactly 5 different candidate prompts, strings only, no other text.`;

  const anthropic = new Anthropic({ apiKey });
  const avoidNote = history.length
    ? `\n\nPrompts already used (all new candidates must be clearly different in topic AND wording, not just rephrased):\n${history
        .slice(0, 80)
        .map((p, i) => `${i + 1}. ${p}`)
        .join("\n")}`
    : "";

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        temperature: 1,
        system: system + avoidNote,
        messages: [{ role: "user", content: "Give me 5 fresh candidates." }],
      });
      const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
      const m = raw.match(/\[[\s\S]*\]/);
      if (!m) continue;
      let list: unknown;
      try {
        list = JSON.parse(m[0]);
      } catch {
        continue;
      }
      if (!Array.isArray(list)) continue;
      const cands = list.map((c) => String(c).trim()).filter((c) => c.length > 15 && c.length < 400);
      const pick = cands.find((c) => !tooSimilar(c, history));
      if (pick) return { prompt: pick };
    }
    return { prompt: null, error: "Could not find a prompt that differs from past ones — try again." };
  } catch (err) {
    return { prompt: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
