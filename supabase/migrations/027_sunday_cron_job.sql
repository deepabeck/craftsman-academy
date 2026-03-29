-- Migration 027: Sunday Cron Job
-- Runs every Sunday at 5:00 AM Mountain Time (12:00 UTC) to:
--   1. Mark any Mon-Sat pending tasks as missed
--   2. Award weekly bonuses (completion, grade, perfect week)
--   3. Generate next week's tasks (Mon-Fri) from the lesson plan
--
-- All three steps are idempotent — safe to re-run.

-- ── Enable pg_cron ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── Close-week function ───────────────────────────────────────────────────────
-- Marks all pending tasks from the past week (Mon-Sat) as missed.
-- Saturday is the grace period, so this runs Sunday morning after that window.
CREATE OR REPLACE FUNCTION close_week()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
  v_week_end   DATE;
  v_missed     INTEGER;
BEGIN
  -- The week that just ended: Monday through Saturday
  -- On Sunday, "last Monday" is 6 days ago, Saturday is yesterday
  v_week_start := CURRENT_DATE - 6;  -- Monday
  v_week_end   := CURRENT_DATE - 1;  -- Saturday

  -- Mark any remaining pending tasks as missed
  UPDATE tasks
  SET    status = 'missed'
  WHERE  task_date BETWEEN v_week_start AND v_week_end
    AND  status = 'pending';

  GET DIAGNOSTICS v_missed = ROW_COUNT;
  RAISE NOTICE 'close_week: marked % tasks as missed (% to %)', v_missed, v_week_start, v_week_end;
END;
$$;

-- ── Award weekly bonuses function ─────────────────────────────────────────────
-- Calculates and awards weekly bonuses for all students.
-- Bonuses (from points.ts):
--   +50  weekly_complete   — all tasks done (no pending/missed)
--   +25  weekly_grade_b    — avg score >= 80%
--   +50  weekly_grade_a    — avg score >= 90% (replaces B)
--   +100 weekly_perfect    — all done + all approved + avg >= 90%
--
-- Idempotent: uses ON CONFLICT to skip if already awarded.
CREATE OR REPLACE FUNCTION award_weekly_bonuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start  DATE;
  v_week_end    DATE;
  rec           RECORD;
BEGIN
  v_week_start := CURRENT_DATE - 6;  -- Monday
  v_week_end   := CURRENT_DATE - 1;  -- Saturday (grace period)

  FOR rec IN
    SELECT
      t.student_id,
      COUNT(*)                                                     AS total,
      COUNT(*) FILTER (WHERE t.status IN ('done', 'approved'))     AS completed,
      COUNT(*) FILTER (WHERE t.status = 'missed')                  AS missed,
      COUNT(*) FILTER (WHERE t.status = 'approved')                AS approved_count,
      COALESCE(
        AVG(t.final_score) FILTER (WHERE t.status = 'approved' AND t.final_score IS NOT NULL),
        0
      )                                                            AS avg_score
    FROM tasks t
    WHERE t.task_date BETWEEN v_week_start AND v_week_end
      AND t.status != 'cancelled'
    GROUP BY t.student_id
  LOOP
    -- All tasks completed bonus (+50)
    IF rec.completed = rec.total AND rec.total > 0 THEN
      INSERT INTO points_log (student_id, category, source_date, points, note)
      VALUES (rec.student_id, 'weekly_complete', v_week_start, 50,
              'All tasks completed this week')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Grade bonuses (A replaces B, not additive)
    IF rec.approved_count > 0 THEN
      IF rec.avg_score >= 90 THEN
        INSERT INTO points_log (student_id, category, source_date, points, note)
        VALUES (rec.student_id, 'weekly_grade_a', v_week_start, 50,
                format('Weekly average %s%% — A', round(rec.avg_score)))
        ON CONFLICT DO NOTHING;
      ELSIF rec.avg_score >= 80 THEN
        INSERT INTO points_log (student_id, category, source_date, points, note)
        VALUES (rec.student_id, 'weekly_grade_b', v_week_start, 25,
                format('Weekly average %s%% — B', round(rec.avg_score)))
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- Perfect week bonus (+100): all tasks completed + no misses +
    -- graded tasks (if any) average A. Checkbox/done tasks count as
    -- completed — students shouldn't be penalized for task type.
    IF rec.completed = rec.total AND rec.total > 0
       AND rec.missed = 0
       AND (rec.approved_count = 0 OR rec.avg_score >= 90)
    THEN
      INSERT INTO points_log (student_id, category, source_date, points, note)
      VALUES (rec.student_id, 'weekly_perfect', v_week_start, 100,
              'Perfect week — all done, no misses!')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'award_weekly_bonuses: processed week % to %', v_week_start, v_week_end;
END;
$$;

-- ── Generate next week's tasks function ───────────────────────────────────────
-- Calls the existing generate_daily_tasks() for Mon-Fri of the upcoming week.
CREATE OR REPLACE FUNCTION generate_next_week_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next_monday DATE;
  v_date        DATE;
  v_count       INTEGER;
  v_total       INTEGER := 0;
BEGIN
  -- Next Monday = today (Sunday) + 1
  v_next_monday := CURRENT_DATE + 1;

  FOR i IN 0..4 LOOP
    v_date := v_next_monday + i;
    SELECT generate_daily_tasks(v_date) INTO v_count;
    v_total := v_total + v_count;
  END LOOP;

  RAISE NOTICE 'generate_next_week_tasks: created % tasks for week of %', v_total, v_next_monday;
END;
$$;

-- ── Master Sunday job function ────────────────────────────────────────────────
-- Single function that runs all three steps in order.
CREATE OR REPLACE FUNCTION sunday_weekly_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE NOTICE 'sunday_weekly_job: starting at %', now();

  -- Step 1: Close out the week (pending → missed)
  PERFORM close_week();

  -- Step 2: Award weekly bonuses
  PERFORM award_weekly_bonuses();

  -- Step 3: Generate next week's tasks
  PERFORM generate_next_week_tasks();

  RAISE NOTICE 'sunday_weekly_job: complete at %', now();
END;
$$;

-- ── Schedule the cron job ─────────────────────────────────────────────────────
-- 5:00 AM Mountain Time = 12:00 UTC (MST is UTC-7)
-- Note: MDT (summer) is UTC-6, so this will run at 6:00 AM MDT.
-- pg_cron uses UTC internally.
SELECT cron.schedule(
  'sunday-weekly-job',           -- job name
  '0 12 * * 0',                  -- every Sunday at 12:00 UTC = 5am MST
  $$SELECT sunday_weekly_job()$$
);
