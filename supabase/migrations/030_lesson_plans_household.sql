-- Migration 030: Add household_id to lesson_plans
-- Backfills all existing rows to the founding household.
-- Adds household-scoped RLS policy alongside existing policies.

ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);

-- Backfill all existing lesson plans to the founding household
UPDATE lesson_plans
SET household_id = '00000000-0000-0000-0000-000000000001'
WHERE household_id IS NULL;

ALTER TABLE lesson_plans ALTER COLUMN household_id SET NOT NULL;

-- Index for efficient household-scoped queries
CREATE INDEX IF NOT EXISTS lesson_plans_household_id_idx ON lesson_plans(household_id);

-- Tighten admin RLS: admins can only manage their own household's lesson plans
DROP POLICY IF EXISTS "Admin manages lesson_plans" ON lesson_plans;

CREATE POLICY "Admin manages lesson_plans" ON lesson_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND household_id = lesson_plans.household_id
    )
  );
