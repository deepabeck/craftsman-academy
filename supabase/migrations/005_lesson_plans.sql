-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: Lesson plans + enhanced tasks/submissions scoring
-- ─────────────────────────────────────────────────────────────────────────────

-- ── lesson_plans ─────────────────────────────────────────────────────────────
-- One row per subject × week × day of week × student (NULL = shared).
-- Admin edits these in the weekly planner UI ahead of time.
-- When generate_daily_tasks() runs, it snapshots all fields into the task row
-- so the assignment history is preserved even if the plan is later edited.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_plans (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What subject and when
  subject_id       TEXT    NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  week_start       DATE    NOT NULL CHECK (EXTRACT(DOW FROM week_start) = 1), -- must be Monday
  day_of_week      SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),     -- 0=Mon … 4=Fri

  -- NULL = applies to all students (shared plan)
  -- Set to a specific profile UUID for student-specific overrides
  student_id       UUID    REFERENCES profiles(id) ON DELETE CASCADE,

  -- The actual assignment content
  assignment_detail TEXT   NOT NULL DEFAULT '',
  admin_notes       TEXT   NOT NULL DEFAULT '',

  -- Proof requirements for this specific assignment
  -- Array supports multi-proof (e.g. ['photo','timer'])
  proof_types      TEXT[]  NOT NULL DEFAULT ARRAY['checkbox']::TEXT[],

  -- Accepted file types for upload submissions.
  -- NULL = accept any file. Use MIME types or extensions:
  -- e.g. ARRAY['image/*', 'video/*', '.pdf', '.mp3', '.docx']
  allowed_file_types TEXT[] DEFAULT NULL,

  -- Target duration in minutes (applies when proof_types includes 'timer')
  duration_minutes INTEGER,

  -- Whether a parent must review before task counts as complete
  requires_review  BOOLEAN NOT NULL DEFAULT false,

  -- How quality is scored for this assignment type:
  --   completion    → 100% if submitted, 0% if not (checkbox, no quality metric)
  --   review_based  → parent/AI score 0-100 (photo, video, doc, text uploads)
  --   time_based    → actual_seconds / (duration_minutes * 60), capped 100%
  --   platform_sync → score comes from external platform API (Pickcode, etc.)
  --   mixed         → multiple proof types, each scored by its approach, averaged
  scoring_approach TEXT    NOT NULL DEFAULT 'completion'
    CHECK (scoring_approach IN ('completion', 'review_based', 'time_based', 'platform_sync', 'mixed')),

  -- Phase 2: iCal source tracking
  -- 'manual' = created by admin in lesson planner
  -- 'ical'   = auto-generated from calendar event
  source           TEXT    NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'ical')),

  -- Audit
  created_by       UUID    REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Unique: one shared plan per subject + week + day (student_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS lesson_plans_shared_unique
  ON lesson_plans(subject_id, week_start, day_of_week)
  WHERE student_id IS NULL;

-- Unique: one student-specific plan per subject + week + day + student
CREATE UNIQUE INDEX IF NOT EXISTS lesson_plans_student_unique
  ON lesson_plans(subject_id, week_start, day_of_week, student_id)
  WHERE student_id IS NOT NULL;

-- Fast week-range queries for the planner UI
CREATE INDEX IF NOT EXISTS idx_lesson_plans_week
  ON lesson_plans(week_start, subject_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lesson_plans_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_lesson_plans_updated_at
  BEFORE UPDATE ON lesson_plans
  FOR EACH ROW EXECUTE FUNCTION update_lesson_plans_updated_at();

-- RLS
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

-- Admin can read and manage all lesson plans
CREATE POLICY "Admin manages lesson_plans" ON lesson_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students can read lesson plans for their own tasks (shared + their own)
CREATE POLICY "Students read own lesson_plans" ON lesson_plans
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      student_id IS NULL
      OR student_id = auth.uid()
    )
  );


-- ── tasks: add lesson-plan snapshot columns + scoring columns ─────────────────
-- Keep existing proof_type column (backward compat). New proof_types[] column
-- is the authoritative multi-proof list; proof_type = proof_types[1].

-- Reference back to the lesson plan that generated this task
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lesson_plan_id UUID REFERENCES lesson_plans(id);

-- Snapshot of assignment_detail at generation time (preserved even if plan changes)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lesson_detail TEXT NOT NULL DEFAULT '';

-- Full proof types array (snapshot)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_types TEXT[] NOT NULL DEFAULT ARRAY['checkbox']::TEXT[];

-- Accepted file types (snapshot, NULL = any)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS allowed_file_types TEXT[];

-- Scoring approach (snapshot)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scoring_approach TEXT NOT NULL DEFAULT 'completion'
  CHECK (scoring_approach IN ('completion', 'review_based', 'time_based', 'platform_sync', 'mixed'));

-- Admin can add/edit a note on any individual task after it generates
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS admin_note TEXT DEFAULT '';

-- AI scores this first (0-100); populated when student submits + AI reviews
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,2)
  CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_feedback TEXT;

-- Parent can override AI score (NULL = accept AI score)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_score NUMERIC(5,2)
  CHECK (parent_score IS NULL OR (parent_score >= 0 AND parent_score <= 100));

-- final_score = parent_score if set, otherwise ai_score
-- overall_score = (0.6 * completion) + (0.4 * final_score)
-- Both are populated by server-side logic when scoring events occur
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2)
  CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 100));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS overall_score NUMERIC(5,2)
  CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100));

-- Task source for Phase 2 iCal integration
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'ical'));


-- ── submissions: add MIME type + platform data ────────────────────────────────
-- Accept any file type — store the actual MIME type for client rendering
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS file_mime_type TEXT;

-- External platform API payload (JSON blob from Pickcode, Khan Academy, etc.)
-- Stores raw response: completed lessons, projects, AI assessment, scores, etc.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS platform_data JSONB;

-- Update the submission_type check to include 'file' and 'platform_sync'
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_submission_type_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_submission_type_check
  CHECK (submission_type IN ('photo', 'audio', 'video', 'text', 'timer', 'file', 'platform_sync'));


-- ── update generate_daily_tasks to pull from lesson_plans ────────────────────
CREATE OR REPLACE FUNCTION generate_daily_tasks(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dow     TEXT;
  v_dow_int SMALLINT;
  v_week    DATE;
  v_count   INTEGER;
BEGIN
  -- Day-of-week strings for subjects.days[] matching
  v_dow := to_char(p_date, 'Dy');

  -- Day-of-week integer for lesson_plans.day_of_week (0=Mon … 4=Fri)
  -- Postgres DOW: 0=Sun, 1=Mon … 6=Sat → convert to 0=Mon … 4=Fri
  v_dow_int := ((EXTRACT(DOW FROM p_date)::INTEGER + 6) % 7)::SMALLINT;

  -- Monday of the target week (for lesson plan lookup)
  v_week := date_trunc('week', p_date)::DATE;

  INSERT INTO tasks (
    student_id,
    subject_id,
    task_date,
    lesson_plan_id,
    lesson_detail,
    proof_type,          -- primary proof type (backward compat)
    proof_types,         -- full array
    allowed_file_types,
    scoring_approach,
    requires_review,
    duration,
    status,
    source
  )
  SELECT
    p.id                                                      AS student_id,
    s.id                                                      AS subject_id,
    p_date                                                    AS task_date,

    -- Prefer student-specific plan, fall back to shared plan, fall back to NULL
    COALESCE(lp_student.id, lp_shared.id)                    AS lesson_plan_id,

    -- Assignment detail: lesson plan overrides subject default
    COALESCE(
      NULLIF(COALESCE(lp_student.assignment_detail, lp_shared.assignment_detail), ''),
      s.detail
    )                                                         AS lesson_detail,

    -- proof_type (primary, backward compat)
    COALESCE(
      (lp_student.proof_types)[1],
      (lp_shared.proof_types)[1],
      (s.proof_types)[1]
    )                                                         AS proof_type,

    -- Full proof types array
    COALESCE(lp_student.proof_types, lp_shared.proof_types, s.proof_types)
                                                              AS proof_types,

    -- Allowed file types (NULL = any)
    COALESCE(lp_student.allowed_file_types, lp_shared.allowed_file_types)
                                                              AS allowed_file_types,

    -- Scoring approach
    COALESCE(lp_student.scoring_approach, lp_shared.scoring_approach, 'completion')
                                                              AS scoring_approach,

    -- Requires review
    COALESCE(lp_student.requires_review, lp_shared.requires_review, s.requires_review)
                                                              AS requires_review,

    -- Duration
    COALESCE(lp_student.duration_minutes, lp_shared.duration_minutes, s.duration_minutes)
                                                              AS duration,

    'pending'                                                 AS status,
    'manual'                                                  AS source

  FROM
    profiles p
    CROSS JOIN subjects s

    -- Student-specific lesson plan for this week + day
    LEFT JOIN lesson_plans lp_student
      ON  lp_student.subject_id  = s.id
      AND lp_student.week_start  = v_week
      AND lp_student.day_of_week = v_dow_int
      AND lp_student.student_id  = p.id

    -- Shared lesson plan for this week + day
    LEFT JOIN lesson_plans lp_shared
      ON  lp_shared.subject_id   = s.id
      AND lp_shared.week_start   = v_week
      AND lp_shared.day_of_week  = v_dow_int
      AND lp_shared.student_id   IS NULL

  WHERE
    p.role = 'student'
    AND s.active = true
    AND (s.only_student_key IS NULL OR s.only_student_key = p.student_key)
    AND v_dow = ANY(s.days)

  ON CONFLICT (student_id, subject_id, task_date) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Re-apply permission grants (function was replaced)
REVOKE EXECUTE ON FUNCTION generate_daily_tasks(DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION generate_daily_tasks(DATE) TO service_role;
