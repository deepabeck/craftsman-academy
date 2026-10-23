-- Migration 038: unlockable background art
--
-- Additive only. Students earn a random background each time they close out a
-- full Mon-Fri week (awarded alongside the weekly bonus). Ownership lives in
-- background_unlocks; the one currently displayed is user_settings.background.
--
--  * background_unlocks.background_id is a catalog id from src/lib/backgrounds.ts
--  * UNIQUE (student_id, background_id): a background can only be owned once
--  * UNIQUE (student_id, week_start): at most one weekly unlock per week
--  * Students can only READ their own rows. All writes go through server
--    actions using the service role, so a student can't grant themselves one.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS background text;

CREATE TABLE IF NOT EXISTS background_unlocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  background_id text NOT NULL,
  source        text NOT NULL DEFAULT 'weekly',   -- 'starter' | 'weekly'
  week_start    date,                              -- Monday of the week that earned it (weekly only)
  unlocked_at   timestamptz NOT NULL DEFAULT now(),
  revealed_at   timestamptz,                       -- null until the student has seen the reveal
  UNIQUE (student_id, background_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS background_unlocks_one_per_week
  ON background_unlocks (student_id, week_start)
  WHERE week_start IS NOT NULL;

ALTER TABLE background_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own background unlocks" ON background_unlocks;
CREATE POLICY "Students read own background unlocks"
  ON background_unlocks FOR SELECT
  USING (student_id = auth.uid());
