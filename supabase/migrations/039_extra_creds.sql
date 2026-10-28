-- Migration 039: Extra Creds — optional bonus jobs kids can claim with before/after photos.
-- Writes go through server actions (service role); RLS here only governs reads.

CREATE TABLE IF NOT EXISTS extra_creds_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'tidy',
  reward integer NOT NULL CHECK (reward >= 0),
  shareable boolean NOT NULL DEFAULT true,
  repeat_rule text NOT NULL DEFAULT 'once' CHECK (repeat_rule IN ('once','daily','weekly','unlimited')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extra_creds_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES extra_creds_tasks(id) ON DELETE CASCADE,
  household_id uuid NOT NULL,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  before_path text NOT NULL,
  after_path text NOT NULL,
  claim_date date NOT NULL,
  week_start date NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  admin_note text
);

CREATE TABLE IF NOT EXISTS extra_creds_participants (
  claim_id uuid NOT NULL REFERENCES extra_creds_claims(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer,            -- set when approved
  PRIMARY KEY (claim_id, student_id)
);

CREATE INDEX IF NOT EXISTS extra_creds_claims_task_idx ON extra_creds_claims (task_id, status);
CREATE INDEX IF NOT EXISTS extra_creds_claims_household_idx ON extra_creds_claims (household_id, status);
CREATE INDEX IF NOT EXISTS extra_creds_participants_student_idx ON extra_creds_participants (student_id);

ALTER TABLE extra_creds_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_creds_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_creds_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household reads extra creds tasks" ON extra_creds_tasks FOR SELECT
  USING (household_id = (SELECT p.household_id FROM profiles p WHERE p.id = auth.uid()));

CREATE POLICY "admin reads household extra creds claims" ON extra_creds_claims FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.household_id = extra_creds_claims.household_id));

CREATE POLICY "participants read own extra creds claims" ON extra_creds_claims FOR SELECT
  USING (submitted_by = auth.uid()
         OR EXISTS (SELECT 1 FROM extra_creds_participants x WHERE x.claim_id = extra_creds_claims.id AND x.student_id = auth.uid()));

CREATE POLICY "participants read own rows" ON extra_creds_participants FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "admin reads household extra creds participants" ON extra_creds_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles a JOIN profiles s ON s.household_id = a.household_id
                 WHERE a.id = auth.uid() AND a.role = 'admin' AND s.id = extra_creds_participants.student_id));
