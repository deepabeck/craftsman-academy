-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Expand schema for full database-driven curriculum
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles: add student_key ────────────────────────────────────────────────
-- Stores the stable short key ('deven', 'shaan', 'admin') alongside the UUID.
-- The app uses this key for subject filtering and external platform lookups.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_key TEXT UNIQUE;

-- ── subjects: replace UUID FK with text key, add curriculum fields ───────────

-- Drop the UUID-based FK (we use student_key TEXT instead for flexibility)
ALTER TABLE subjects DROP COLUMN IF EXISTS only_student;

-- Which student this subject belongs to. NULL = both students.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS only_student_key TEXT;

-- Whether this subject is active in the current semester
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Curriculum category (drives dashboard grouping + analytics)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Core Academic'
  CHECK (category IN ('Core Academic', 'Elective', 'Enrichment', 'Physical', 'Life Skills'));

-- How the subject is typically completed (drives default proof type selection)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS activity_type TEXT NOT NULL DEFAULT 'worksheet'
  CHECK (activity_type IN (
    'worksheet', 'video_lesson', 'online_platform', 'read_aloud',
    'independent_reading', 'writing_activity', 'project', 'field_trip',
    'in_person_class', 'flashcard_drill', 'audio_video_recording',
    'life_skills', 'custom'
  ));

-- What the student must submit to complete this subject.
-- Array because some subjects accept multiple proof types (e.g. photo + text).
-- The first element is the primary proof type shown in the UI.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS proof_types TEXT[] NOT NULL DEFAULT ARRAY['checkbox']::TEXT[];

-- Whether a parent must review + approve before the task counts as done
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS requires_review BOOLEAN NOT NULL DEFAULT false;

-- Estimated session length in minutes (used for schedule planning + timer default)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 45;

-- Name of the external platform, if any (e.g. 'Skoove', 'Pickcode', 'Beast Academy')
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS external_platform TEXT;

-- ── tasks: expand proof_type values + add cancellation ───────────────────────

-- Drop old 3-value constraint and replace with full set
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_proof_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_proof_type_check
  CHECK (proof_type IN ('checkbox', 'timer', 'photo', 'audio', 'video', 'text', 'platform_sync'));

-- Add 'cancelled' to task statuses
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'done', 'review', 'missed', 'approved', 'cancelled'));

-- Admin cancellation tracking
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Snapshot of requires_review at the time the task was generated
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requires_review BOOLEAN NOT NULL DEFAULT false;

-- ── submissions: dedicated file/media storage (replaces tasks.files TEXT[]) ──
-- One task can have multiple submissions (e.g., multi-page photo upload,
-- or photo + audio for an oral narration assignment).
CREATE TABLE IF NOT EXISTS submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES profiles(id),

  -- What kind of submission this is
  submission_type TEXT NOT NULL
    CHECK (submission_type IN ('photo', 'audio', 'video', 'text', 'timer')),

  -- Supabase Storage object path (e.g. 'submissions/deven/2025-09-01/math_p1.jpg')
  -- NULL for text and timer submissions
  file_url        TEXT,
  file_name       TEXT,
  file_size_bytes INTEGER,

  -- Text submission content (NULL for file-based types)
  content         TEXT,

  -- Timer-based submissions: elapsed seconds recorded
  timer_seconds   INTEGER,

  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Students can insert and read their own submissions
CREATE POLICY "Students manage own submissions" ON submissions
  FOR ALL USING (student_id = auth.uid());

-- Admin can read all submissions (for review queue)
CREATE POLICY "Admin reads all submissions" ON submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── tasks: admin needs full INSERT/UPDATE/DELETE for task management ──────────
-- (Migration 001 only gave admin SELECT; we need ALL for cancellation + generation)
DROP POLICY IF EXISTS "Admin reads all tasks" ON tasks;
CREATE POLICY "Admin manages all tasks" ON tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students can INSERT tasks only via the generate function (SECURITY DEFINER),
-- but they cannot directly insert arbitrary tasks
CREATE POLICY "Students insert own tasks" ON tasks
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- ── reviews: Phase 2 grading prep ────────────────────────────────────────────
-- AI-generated feedback text (populated in Phase 2 by Vision AI grading)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ai_feedback TEXT;

-- AI-suggested numeric score (0–100); parent can override with reviews.score
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ai_score INTEGER
  CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100));

-- Optional letter grade assigned by parent after review
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS grade_letter TEXT
  CHECK (grade_letter IN ('A', 'B', 'C', 'D', 'F'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Index: fast lookups for daily task generation and student dashboards
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_student_date     ON tasks(student_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_date_status      ON tasks(task_date, status);
CREATE INDEX IF NOT EXISTS idx_submissions_task       ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_subjects_active        ON subjects(active) WHERE active = true;
