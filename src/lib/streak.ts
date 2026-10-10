/** YYYY-MM-DD from a Date using local components. */
export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Compute day streak: consecutive school days ending today where ALL tasks are done/review/approved.
 *  Weekends (Sat/Sun) and days with no non-cancelled tasks are skipped (not counted, not breaking). */
// biome-ignore lint/suspicious/noExplicitAny: supabase row type
export function computeStreak(tasks: any[], today: string): number {
  // Build map: date → true (all done) | false (some not done) | undefined (no tasks / cancelled day)
  const byDate: Record<string, boolean> = {};
  for (const t of tasks) {
    if (t.status === "cancelled") continue; // ignore cancelled tasks entirely
    const done = t.status === "done" || t.status === "approved" || t.status === "review";
    if (byDate[t.task_date] === undefined) byDate[t.task_date] = done;
    else byDate[t.task_date] = byDate[t.task_date] && done;
  }

  let streak = 0;
  const cursor = new Date(`${today}T00:00:00`);
  for (let i = 0; i < 60; i++) {
    const dow = cursor.getDay(); // 0=Sun, 6=Sat
    const ds = localDateStr(cursor);

    if (dow === 0 || dow === 6) {
      // Weekend — skip, don't break
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (byDate[ds] === undefined) {
      // No non-cancelled tasks this day — treat as a school holiday / cancelled day, skip
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (byDate[ds] === true) {
      streak++;
    } else if (ds === today) {
      // Today is incomplete — skip it, don't break. Streak reflects last fully completed day.
    } else {
      break; // incomplete past school day — streak ends
    }

    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
