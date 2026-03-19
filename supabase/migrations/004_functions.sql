-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: Server-side functions for daily task lifecycle
-- ─────────────────────────────────────────────────────────────────────────────
-- All functions use SECURITY DEFINER so they run with elevated privileges
-- and bypass RLS. They are called from trusted server code only
-- (Next.js Server Actions / API routes using the service role key).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── generate_daily_tasks ─────────────────────────────────────────────────────
-- Generates task rows for every active student × active subject combination
-- that is scheduled on p_date's day of week.
--
-- Safe to call multiple times for the same date (ON CONFLICT DO NOTHING).
-- Call once per morning from a Server Action when the student opens the app,
-- or from a Supabase Edge Function cron job.
--
-- Returns: number of NEW tasks inserted (0 if already generated today).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_daily_tasks(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dow    TEXT;
  v_count  INTEGER;
BEGIN
  -- 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  v_dow := to_char(p_date, 'Dy');

  INSERT INTO tasks (
    student_id,
    subject_id,
    task_date,
    proof_type,
    requires_review,
    duration,
    status
  )
  SELECT
    p.id                              AS student_id,
    s.id                              AS subject_id,
    p_date                            AS task_date,
    s.proof_types[1]                  AS proof_type,   -- primary proof type
    s.requires_review                 AS requires_review,
    s.duration_minutes                AS duration,
    'pending'                         AS status
  FROM
    profiles p
    CROSS JOIN subjects s
  WHERE
    p.role = 'student'
    AND s.active = true
    -- subject is for this student (NULL = all students, or key matches)
    AND (s.only_student_key IS NULL OR s.only_student_key = p.student_key)
    -- subject is scheduled on today's day of week
    AND v_dow = ANY(s.days)
  ON CONFLICT (student_id, subject_id, task_date) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ── mark_missed_tasks ────────────────────────────────────────────────────────
-- Marks any tasks from a previous date that are still 'pending' as 'missed'.
-- Should run at the end of each school day or at the start of the next morning
-- before generate_daily_tasks is called.
--
-- p_date: the date to sweep (defaults to yesterday).
-- Returns: number of tasks marked missed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_missed_tasks(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE tasks
  SET    status = 'missed'
  WHERE  task_date = p_date
    AND  status    = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ── cancel_task ──────────────────────────────────────────────────────────────
-- Admin-only: cancels a specific task and records who cancelled it.
-- Cancelled tasks are hidden from the student dashboard but preserved in
-- history so progress analytics remain accurate.
--
-- Returns: true if the task was found and cancelled, false otherwise.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cancel_task(
  p_task_id  UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE tasks
  SET
    status       = 'cancelled',
    cancelled_by = p_admin_id,
    cancelled_at = now()
  WHERE
    id     = p_task_id
    AND status NOT IN ('cancelled', 'approved');  -- can't cancel already-approved work

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;


-- ── get_student_progress ─────────────────────────────────────────────────────
-- Phase 2 prep: returns completion stats per subject for a student
-- over a date range. Used for the Progress page and analytics dashboard.
--
-- Returns one row per subject with counts and completion rate.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_student_progress(
  p_student_id UUID,
  p_from       DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  p_to         DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  subject_id       TEXT,
  subject_name     TEXT,
  category         TEXT,
  total_tasks      INTEGER,
  completed        INTEGER,
  missed           INTEGER,
  cancelled        INTEGER,
  pending_review   INTEGER,
  completion_rate  NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id                                                      AS subject_id,
    s.name                                                    AS subject_name,
    s.category                                                AS category,
    COUNT(t.id)::INTEGER                                      AS total_tasks,
    COUNT(t.id) FILTER (WHERE t.status IN ('done','approved'))::INTEGER AS completed,
    COUNT(t.id) FILTER (WHERE t.status = 'missed')::INTEGER  AS missed,
    COUNT(t.id) FILTER (WHERE t.status = 'cancelled')::INTEGER AS cancelled,
    COUNT(t.id) FILTER (WHERE t.status = 'review')::INTEGER  AS pending_review,
    CASE
      WHEN COUNT(t.id) FILTER (WHERE t.status != 'cancelled') = 0 THEN 0
      ELSE ROUND(
        100.0 * COUNT(t.id) FILTER (WHERE t.status IN ('done','approved'))
              / NULLIF(COUNT(t.id) FILTER (WHERE t.status != 'cancelled'), 0),
        2
      )
    END                                                       AS completion_rate
  FROM
    subjects s
    LEFT JOIN tasks t
      ON  t.subject_id  = s.id
      AND t.student_id  = p_student_id
      AND t.task_date  >= p_from
      AND t.task_date  <= p_to
  WHERE
    s.active = true
    AND (s.only_student_key IS NULL
      OR s.only_student_key = (
        SELECT student_key FROM profiles WHERE id = p_student_id
      ))
  GROUP BY s.id, s.name, s.category, s.sort_order
  ORDER BY s.sort_order;
END;
$$;


-- ── Revoke public execute on all functions ───────────────────────────────────
-- These are server-only utilities. Client code must never call them directly.
REVOKE EXECUTE ON FUNCTION generate_daily_tasks(DATE)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION mark_missed_tasks(DATE)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION cancel_task(UUID, UUID)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_student_progress(UUID, DATE, DATE) FROM PUBLIC, anon, authenticated;

-- Grant only to service_role (used by Next.js server actions via the service key)
GRANT EXECUTE ON FUNCTION generate_daily_tasks(DATE)  TO service_role;
GRANT EXECUTE ON FUNCTION mark_missed_tasks(DATE)     TO service_role;
GRANT EXECUTE ON FUNCTION cancel_task(UUID, UUID)     TO service_role;
GRANT EXECUTE ON FUNCTION get_student_progress(UUID, DATE, DATE) TO service_role;
