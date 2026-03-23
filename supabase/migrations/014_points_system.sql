-- ── Points System ───────────────────────────────────────────────────────────────
-- Append-only ledger of every point event.
-- Balance = SUM(points) per student — never decremented, never expires.

CREATE TABLE IF NOT EXISTS points_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  earned_at    timestamptz NOT NULL DEFAULT now(),
  category     text        NOT NULL,   -- see points.ts for valid values
  source_id    uuid,                   -- task id for per-task events; NULL for bonuses
  source_date  date,                   -- task_date or week_start; used for dedup
  points       integer     NOT NULL CHECK (points > 0),
  note         text
);

CREATE INDEX IF NOT EXISTS idx_points_student
  ON points_log(student_id, earned_at DESC);

-- Prevent double-awarding the same per-task event (e.g. grading the same task twice)
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_task_dedup
  ON points_log(student_id, category, source_id)
  WHERE source_id IS NOT NULL;

-- Prevent double-awarding the same date or week bonus
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_bonus_dedup
  ON points_log(student_id, category, source_date)
  WHERE source_id IS NULL;

-- ── RLS ─────────────────────────────────────────────────────────────────────────
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_read_own_points"
  ON points_log FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "admins_read_all_points"
  ON points_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role inserts — point awarding uses the service client to bypass RLS
CREATE POLICY "service_insert_points"
  ON points_log FOR INSERT
  WITH CHECK (true);
