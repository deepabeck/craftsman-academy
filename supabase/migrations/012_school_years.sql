-- ── School Years: grade-level tracking for long-term homeschool records ────────
--
-- One row per student per academic year. Tasks are linked to a grade at query
-- time via the tasks_graded view (task_date falling within start_date/end_date).
-- No FK on tasks is needed — grade is always derivable from the date.
--
-- This structure supports Deven and Shaan from 4th grade through high school
-- graduation. New rows are added each August when the new school year begins.
--
-- Must be run in Supabase SQL Editor (DDL not available via REST API).

-- ── 1. Table ──────────────────────────────────────────────────────────────────

CREATE TABLE school_years (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade       smallint    NOT NULL CHECK (grade BETWEEN 1 AND 12),
  year_label  text        NOT NULL,   -- e.g. "2025–2026"
  start_date  date        NOT NULL,
  end_date    date        NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT school_years_dates_valid   CHECK (end_date > start_date),
  CONSTRAINT school_years_no_overlap    UNIQUE (student_id, start_date)
);

COMMENT ON TABLE school_years IS
  'One row per student per academic year. Grade is derived from task_date ranges.';

-- ── 2. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;

-- Admins can read / write all rows
CREATE POLICY "school_years_admin_all" ON school_years
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Students can read only their own grade records
CREATE POLICY "school_years_student_read" ON school_years
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- ── 3. View: tasks annotated with grade ──────────────────────────────────────
--
-- Use this view anywhere you need "show me all Grade 5 work" or
-- "group history by grade". The LEFT JOIN means tasks outside a defined
-- school year still appear (grade and year_label will be NULL).

CREATE OR REPLACE VIEW tasks_graded AS
SELECT
  t.*,
  sy.grade,
  sy.year_label,
  sy.id        AS school_year_id
FROM tasks t
LEFT JOIN school_years sy
  ON  sy.student_id = t.student_id
  AND t.task_date BETWEEN sy.start_date AND sy.end_date;

COMMENT ON VIEW tasks_graded IS
  'Tasks joined with their school year / grade via task_date. '
  'Use for history views grouped by grade level.';

-- ── 4. Seed: current and next school years ────────────────────────────────────
--
-- 4th Grade  → 2025-09-01 to 2026-07-31  (current year)
-- 5th Grade  → 2026-08-01 to 2027-07-31  (starting August 2026)
--
-- Add rows for both Deven and Shaan.

INSERT INTO school_years (student_id, grade, year_label, start_date, end_date) VALUES

  -- Deven
  ('51940f37-0277-4bf1-8ea6-1755f16b1113', 4, '2025–2026', '2025-09-01', '2026-07-31'),
  ('51940f37-0277-4bf1-8ea6-1755f16b1113', 5, '2026–2027', '2026-08-01', '2027-07-31'),

  -- Shaan
  ('e0187d6c-6371-455d-8855-ed070cf522c1', 4, '2025–2026', '2025-09-01', '2026-07-31'),
  ('e0187d6c-6371-455d-8855-ed070cf522c1', 5, '2026–2027', '2026-08-01', '2027-07-31')

ON CONFLICT DO NOTHING;

-- ── Future years: add a row each August (example for Grade 6) ────────────────
--
-- INSERT INTO school_years (student_id, grade, year_label, start_date, end_date) VALUES
--   ('51940f37-...', 6, '2027–2028', '2027-08-01', '2028-07-31'),
--   ('e0187d6c-...', 6, '2027–2028', '2027-08-01', '2028-07-31')
-- ON CONFLICT DO NOTHING;
