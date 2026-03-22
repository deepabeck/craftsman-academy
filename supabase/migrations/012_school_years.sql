-- ── School Years: grade-level tracking for long-term homeschool records ────────
--
-- One row per student per academic year.  Each year runs from the 2nd Monday
-- of August through the day before the following year's 2nd Monday of August.
--
-- 2nd Mondays of August:
--   2025-08-11 · 2026-08-10 · 2027-08-09 · 2028-08-14 · 2029-08-13
--   2030-08-12 · 2031-08-11 · 2032-08-09 · 2033-08-08 · 2034-08-14
--
-- Tasks are linked to a grade at query time via the tasks_graded view
-- (task_date BETWEEN start_date AND end_date).  No FK on tasks is needed —
-- grade is always derivable from the date.
--
-- Must be run in Supabase SQL Editor (DDL not available via REST API).

-- ── 1. Drop old profiles.grade column (was a free-text editable field) ────────
--    Grade is now exclusively derived from school_years; no manual field needed.

ALTER TABLE profiles DROP COLUMN IF EXISTS grade;

-- ── 2. Table ──────────────────────────────────────────────────────────────────

CREATE TABLE school_years (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade       smallint    NOT NULL CHECK (grade BETWEEN 1 AND 12),
  year_label  text        NOT NULL,   -- e.g. "2025–2026"
  start_date  date        NOT NULL,
  end_date    date        NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT school_years_dates_valid CHECK (end_date > start_date),
  CONSTRAINT school_years_no_overlap  UNIQUE (student_id, start_date)
);

COMMENT ON TABLE school_years IS
  'One row per student per academic year. '
  'Each year starts on the 2nd Monday of August. '
  'Grade is derived from task_date falling within start_date/end_date.';

-- ── 3. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_years_admin_all" ON school_years
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "school_years_student_read" ON school_years
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- ── 4. View: tasks annotated with grade ──────────────────────────────────────

CREATE OR REPLACE VIEW tasks_graded AS
SELECT
  t.*,
  sy.grade,
  sy.year_label,
  sy.id AS school_year_id
FROM tasks t
LEFT JOIN school_years sy
  ON  sy.student_id = t.student_id
  AND t.task_date BETWEEN sy.start_date AND sy.end_date;

COMMENT ON VIEW tasks_graded IS
  'Tasks joined with their school year / grade via task_date. '
  'Use for history views grouped by grade level.';

-- ── 5. Seed: all grades 4–12 for Deven and Shaan ─────────────────────────────
--
-- Add a new row here each August when a new school year begins.
-- The 2nd Monday of August for each upcoming year is noted in comments above.

INSERT INTO school_years (student_id, grade, year_label, start_date, end_date) VALUES

  -- ── Deven (51940f37-0277-4bf1-8ea6-1755f16b1113) ──
  ('51940f37-0277-4bf1-8ea6-1755f16b1113',  4, '2025–2026', '2025-08-11', '2026-08-09'),
  ('51940f37-0277-4bf1-8ea6-1755f16b1113',  5, '2026–2027', '2026-08-10', '2027-08-08'),
  ('51940f37-0277-4bf1-8ea6-1755f16b1113',  6, '2027–2028', '2027-08-09', '2028-08-13'),
  ('51940f37-0277-4bf1-8ea6-1755f16b1113',  7, '2028–2029', '2028-08-14', '2029-08-12'),
  ('51940f37-0277-4bf1-8ea6-1755f16b1113',  8, '2029–2030', '2029-08-13', '2030-08-11'),
  ('51940f37-0277-4bf1-8ea6-1755f16b1113',  9, '2030–2031', '2030-08-12', '2031-08-10'),
  ('51940f37-0277-4bf1-8ea6-1755f16b1113', 10, '2031–2032', '2031-08-11', '2032-08-08'),
  ('51940f37-0277-4bf1-8ea6-1755f16b1113', 11, '2032–2033', '2032-08-09', '2033-08-07'),
  ('51940f37-0277-4bf1-8ea6-1755f16b1113', 12, '2033–2034', '2033-08-08', '2034-08-13'),

  -- ── Shaan (e0187d6c-6371-455d-8855-ed070cf522c1) ──
  ('e0187d6c-6371-455d-8855-ed070cf522c1',  4, '2025–2026', '2025-08-11', '2026-08-09'),
  ('e0187d6c-6371-455d-8855-ed070cf522c1',  5, '2026–2027', '2026-08-10', '2027-08-08'),
  ('e0187d6c-6371-455d-8855-ed070cf522c1',  6, '2027–2028', '2027-08-09', '2028-08-13'),
  ('e0187d6c-6371-455d-8855-ed070cf522c1',  7, '2028–2029', '2028-08-14', '2029-08-12'),
  ('e0187d6c-6371-455d-8855-ed070cf522c1',  8, '2029–2030', '2029-08-13', '2030-08-11'),
  ('e0187d6c-6371-455d-8855-ed070cf522c1',  9, '2030–2031', '2030-08-12', '2031-08-10'),
  ('e0187d6c-6371-455d-8855-ed070cf522c1', 10, '2031–2032', '2031-08-11', '2032-08-08'),
  ('e0187d6c-6371-455d-8855-ed070cf522c1', 11, '2032–2033', '2032-08-09', '2033-08-07'),
  ('e0187d6c-6371-455d-8855-ed070cf522c1', 12, '2033–2034', '2033-08-08', '2034-08-13')

ON CONFLICT DO NOTHING;
