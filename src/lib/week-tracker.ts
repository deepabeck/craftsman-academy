import { BACKGROUND_UNLOCK_START } from "@/lib/backgrounds";

export type DayState = "closed" | "open" | "off" | "upcoming";

export interface TrackerDay {
  label: string; // M T W T F
  date: string; // YYYY-MM-DD
  state: DayState;
  isToday: boolean;
}

export interface WeekTracker {
  /** False before the first eligible week (Monday Oct 26): the bar shows a "starting Monday" message instead of day markers. */
  active: boolean;
  days: TrackerDay[];
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Per-day progress for the Mon–Fri week containing `today` (on Sat/Sun, the week that just ended).
 * A day is "closed" when every non-cancelled task has been submitted (done, in review, or approved)
 * — the same rule the weekly unlock uses, so a parent who hasn't reviewed yet never holds it back.
 */
export function buildWeekTracker(
  // biome-ignore lint/suspicious/noExplicitAny: supabase row type
  tasks: any[],
  today: string,
): WeekTracker {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=Sun … 6=Sat
  const monday = addDays(today, dow === 0 ? -6 : 1 - dow);

  const byDate = new Map<string, string[]>();
  for (const t of tasks) {
    if (t.status === "cancelled") continue;
    const list = byDate.get(t.task_date) ?? [];
    list.push(t.status);
    byDate.set(t.task_date, list);
  }

  const labels = ["M", "T", "W", "T", "F"];
  const days: TrackerDay[] = labels.map((label, i) => {
    const date = addDays(monday, i);
    const statuses = byDate.get(date);
    let state: DayState;
    if (!statuses || statuses.length === 0) {
      state = date < today ? "off" : date === today ? "off" : "upcoming";
    } else if (statuses.every((s) => s === "done" || s === "approved" || s === "review")) {
      state = "closed";
    } else {
      state = date > today ? "upcoming" : "open";
    }
    return { label, date, state, isToday: date === today };
  });

  return { active: monday >= BACKGROUND_UNLOCK_START, days };
}
