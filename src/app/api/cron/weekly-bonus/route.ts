import { type NextRequest, NextResponse } from "next/server";
import { awardWeeklyBonus } from "@/app/actions/points";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Cron endpoint — runs every Sunday at 6:00 AM UTC (Saturday ~11 PM MDT).
 * Awards weekly bonuses for the just-completed Mon–Fri week for all students.
 *
 * Secured by CRON_SECRET (Vercel sends Authorization: Bearer <secret> automatically).
 * Fully idempotent — safe to re-run; duplicate guard in points_log prevents double-awarding.
 */
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (or a trusted caller)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Compute the just-completed week (Mon–Fri).
  // Cron fires Sunday UTC, so previous Monday = today − 6 days, Friday = today − 2 days.
  const now = new Date();
  const prevFriday = new Date(now);
  prevFriday.setUTCDate(now.getUTCDate() - 2); // last Friday
  const prevMonday = new Date(prevFriday);
  prevMonday.setUTCDate(prevFriday.getUTCDate() - 4); // last Monday

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const weekStart = fmt(prevMonday);
  const weekEnd = fmt(prevFriday);

  // Fetch all students (service client bypasses RLS)
  const service = createServiceClient();
  const { data: students, error } = await service
    .from("profiles")
    .select("id, display_name")
    .eq("role", "student");

  if (error || !students) {
    console.error("[cron/weekly-bonus] Failed to fetch students:", error?.message);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }

  const results: { name: string; weekStart: string; weekEnd: string; status: string }[] = [];

  for (const student of students) {
    try {
      await awardWeeklyBonus(student.id, weekStart, weekEnd);
      results.push({ name: student.display_name, weekStart, weekEnd, status: "ok" });
      console.log(`[cron/weekly-bonus] Awarded bonuses for ${student.display_name} (${weekStart}–${weekEnd})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[cron/weekly-bonus] Error for ${student.display_name}:`, msg);
      results.push({ name: student.display_name, weekStart, weekEnd, status: `error: ${msg}` });
    }
  }

  return NextResponse.json({ processed: results.length, week: `${weekStart} → ${weekEnd}`, results });
}
