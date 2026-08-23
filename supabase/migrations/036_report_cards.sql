-- Migration 036: Report Cards (grade-level archive record)
--
-- A permanent, frozen summary of a completed school year — the "report card."
-- Unlike the live dashboard/progress views (which recompute from tasks on
-- every page load), this table stores a snapshot: numbers are locked in at
-- generation time and only change if an admin explicitly regenerates them.
--
-- Detail views (mission log, submissions, journal entries) are NOT copied
-- here — they stay live, scoped by the linked school_years date range, so
-- no file/photo data is duplicated. Only the summary is frozen.
--
-- Fully additive: no existing table is altered or dropped. Cogs
-- (points_log) and subjects are untouched by this migration entirely.

-- ── 1. Table ──────────────────────────────────────────────────────────────────

CREATE TABLE report_cards (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_year_id          uuid        NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  grade                   smallint    NOT NULL,
  year_label              text        NOT NULL,

  generated_at            timestamptz NOT NULL DEFAULT now(),
  generated_by            uuid        REFERENCES profiles(id),

  total_tasks             integer     NOT NULL DEFAULT 0,
  completed_tasks         integer     NOT NULL DEFAULT 0,
  missed_tasks            integer     NOT NULL DEFAULT 0,
  overall_completion_pct  numeric,
  overall_avg_score       numeric,

  submission_count        integer     NOT NULL DEFAULT 0,
  journal_entry_count     integer     NOT NULL DEFAULT 0,

  -- Informational only — a snapshot of the Cogs balance at generation time.
  -- Never used to reset or recompute the live points_log balance.
  cogs_balance_snapshot   integer,

  -- Per-subject breakdown: [{id, name, icon, color, total, completed, completion_pct, avg_score}, ...]
  subject_breakdown       jsonb       NOT NULL DEFAULT '[]',

  -- Admin's freeform end-of-year remarks. Never overwritten by regeneration.
  parent_notes            text        NOT NULL DEFAULT '',

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT report_cards_one_per_student_year UNIQUE (student_id, school_year_id)
);

COMMENT ON TABLE report_cards IS
  'Frozen end-of-year summary per student per school year — the archived '
  '"report card" record. Regenerating refreshes the computed stats but '
  'never touches parent_notes, points_log, or subjects.';

CREATE INDEX idx_report_cards_student ON report_cards(student_id);

-- ── 2. Row Level Security (household-scoped, matches migration 031 pattern) ───

ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_cards_admin_household" ON report_cards
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      JOIN profiles student_p ON student_p.household_id = admin_p.household_id
      WHERE admin_p.id = auth.uid()
        AND admin_p.role = 'admin'
        AND student_p.id = report_cards.student_id
    )
  );

CREATE POLICY "report_cards_student_read" ON report_cards
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- ── 3. generate_report_card(): compute + upsert the frozen snapshot ───────────
--
-- SECURITY DEFINER so it can write regardless of caller's own RLS grants,
-- but it self-checks that the caller is an admin for the target student's
-- household before doing anything. Safe to call repeatedly — it upserts on
-- (student_id, school_year_id) and never touches parent_notes on update.

CREATE OR REPLACE FUNCTION generate_report_card(p_school_year_id uuid)
RETURNS report_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id   uuid;
  v_grade        smallint;
  v_year_label   text;
  v_start        date;
  v_end          date;
  v_total        integer;
  v_completed    integer;
  v_missed       integer;
  v_completion   numeric;
  v_avg_score    numeric;
  v_submissions  integer;
  v_journal      integer;
  v_cogs         integer;
  v_breakdown    jsonb;
  v_row          report_cards;
BEGIN
  SELECT student_id, grade, year_label, start_date, end_date
    INTO v_student_id, v_grade, v_year_label, v_start, v_end
  FROM school_years
  WHERE id = p_school_year_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'school_year % not found', p_school_year_id;
  END IF;

  -- Caller must be an admin in the same household as the target student.
  IF NOT EXISTS (
    SELECT 1 FROM profiles admin_p
    JOIN profiles student_p ON student_p.household_id = admin_p.household_id
    WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'admin'
      AND student_p.id = v_student_id
  ) THEN
    RAISE EXCEPTION 'not authorized to generate a report card for this student';
  END IF;

  SELECT
    count(*) FILTER (WHERE status <> 'cancelled'),
    count(*) FILTER (WHERE status IN ('done', 'approved', 'review')),
    count(*) FILTER (WHERE status = 'missed')
  INTO v_total, v_completed, v_missed
  FROM tasks
  WHERE student_id = v_student_id AND task_date BETWEEN v_start AND v_end;

  v_completion := CASE WHEN v_total > 0 THEN round((v_completed::numeric / v_total) * 100, 1) ELSE NULL END;

  SELECT round(avg(COALESCE(final_score, overall_score)), 1)
    INTO v_avg_score
  FROM tasks
  WHERE student_id = v_student_id AND task_date BETWEEN v_start AND v_end
    AND COALESCE(final_score, overall_score) IS NOT NULL;

  SELECT count(*)
    INTO v_submissions
  FROM submissions sub
  JOIN tasks t ON t.id = sub.task_id
  WHERE t.student_id = v_student_id AND t.task_date BETWEEN v_start AND v_end;

  SELECT count(*)
    INTO v_journal
  FROM tasks
  WHERE student_id = v_student_id AND subject_id = 'writing-journal'
    AND task_date BETWEEN v_start AND v_end AND status <> 'cancelled';

  SELECT COALESCE(sum(points), 0)
    INTO v_cogs
  FROM points_log
  WHERE student_id = v_student_id;

  SELECT COALESCE(jsonb_agg(x ORDER BY x.name), '[]'::jsonb)
    INTO v_breakdown
  FROM (
    SELECT
      s.id, s.name, s.icon, s.color,
      count(*) FILTER (WHERE t.status <> 'cancelled') AS total,
      count(*) FILTER (WHERE t.status IN ('done', 'approved', 'review')) AS completed,
      CASE WHEN count(*) FILTER (WHERE t.status <> 'cancelled') > 0
        THEN round((count(*) FILTER (WHERE t.status IN ('done', 'approved', 'review'))::numeric
             / count(*) FILTER (WHERE t.status <> 'cancelled')) * 100, 1)
        ELSE NULL END AS completion_pct,
      round(avg(COALESCE(t.final_score, t.overall_score))
        FILTER (WHERE COALESCE(t.final_score, t.overall_score) IS NOT NULL), 1) AS avg_score
    FROM tasks t
    JOIN subjects s ON s.id = t.subject_id
    WHERE t.student_id = v_student_id AND t.task_date BETWEEN v_start AND v_end
    GROUP BY s.id, s.name, s.icon, s.color
  ) x;

  INSERT INTO report_cards (
    student_id, school_year_id, grade, year_label, generated_at, generated_by,
    total_tasks, completed_tasks, missed_tasks, overall_completion_pct, overall_avg_score,
    submission_count, journal_entry_count, cogs_balance_snapshot, subject_breakdown, updated_at
  ) VALUES (
    v_student_id, p_school_year_id, v_grade, v_year_label, now(), auth.uid(),
    v_total, v_completed, v_missed, v_completion, v_avg_score,
    v_submissions, v_journal, v_cogs, v_breakdown, now()
  )
  ON CONFLICT (student_id, school_year_id) DO UPDATE SET
    grade                  = EXCLUDED.grade,
    year_label             = EXCLUDED.year_label,
    generated_at           = EXCLUDED.generated_at,
    generated_by           = EXCLUDED.generated_by,
    total_tasks            = EXCLUDED.total_tasks,
    completed_tasks        = EXCLUDED.completed_tasks,
    missed_tasks            = EXCLUDED.missed_tasks,
    overall_completion_pct = EXCLUDED.overall_completion_pct,
    overall_avg_score      = EXCLUDED.overall_avg_score,
    submission_count       = EXCLUDED.submission_count,
    journal_entry_count    = EXCLUDED.journal_entry_count,
    cogs_balance_snapshot  = EXCLUDED.cogs_balance_snapshot,
    subject_breakdown      = EXCLUDED.subject_breakdown,
    updated_at              = now()
    -- parent_notes intentionally omitted — regeneration never touches it.
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_report_card(uuid) TO authenticated;

-- ── 4. update_report_card_notes(): admin-only notes edit ──────────────────────

CREATE OR REPLACE FUNCTION update_report_card_notes(p_report_card_id uuid, p_notes text)
RETURNS report_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_row        report_cards;
BEGIN
  SELECT student_id INTO v_student_id FROM report_cards WHERE id = p_report_card_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'report_card % not found', p_report_card_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles admin_p
    JOIN profiles student_p ON student_p.household_id = admin_p.household_id
    WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'admin'
      AND student_p.id = v_student_id
  ) THEN
    RAISE EXCEPTION 'not authorized to edit notes on this report card';
  END IF;

  UPDATE report_cards
    SET parent_notes = p_notes, updated_at = now()
    WHERE id = p_report_card_id
    RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION update_report_card_notes(uuid, text) TO authenticated;
