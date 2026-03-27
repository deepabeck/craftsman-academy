-- Migration 018: Household-Scoped Subjects
-- Adds household_id to subjects and backfills to the founding household.
-- Adds household-scoped RLS alongside existing policies (no drops).

-- ── subjects: add household_id ────────────────────────────────────────────────
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);

-- Backfill existing subjects to the founding household
UPDATE subjects
SET household_id = '00000000-0000-0000-0000-000000000001'
WHERE household_id IS NULL;

ALTER TABLE subjects ALTER COLUMN household_id SET NOT NULL;

-- ── RLS: scoped to household ──────────────────────────────────────────────────
-- Added alongside existing policies (not replacing them).
CREATE POLICY "household_reads_subjects" ON subjects
  FOR SELECT USING (
    household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
