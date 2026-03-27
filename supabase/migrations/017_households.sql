-- Migration 017: Households
-- Creates the households table and links profiles to households.
-- Backfills all existing profiles into a single "founding" household.
-- Adds household-scoped RLS alongside existing policies (no drops).

-- ── households ────────────────────────────────────────────────────────────────
CREATE TABLE households (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'My Family',
  plan_tier   TEXT NOT NULL DEFAULT 'free'
                CHECK (plan_tier IN ('free', 'standard', 'family')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- ── profiles: add household_id ────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);

-- ── Backfill: create one household for existing data ──────────────────────────
INSERT INTO households (id, name, plan_tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'Our Family', 'family');

UPDATE profiles
SET household_id = '00000000-0000-0000-0000-000000000001'
WHERE household_id IS NULL;

-- After backfill, make it NOT NULL for future rows
ALTER TABLE profiles ALTER COLUMN household_id SET NOT NULL;

-- ── RLS: household members see each other's profiles ──────────────────────────
-- Added alongside existing policies (not replacing them).
CREATE POLICY "household_members_read_profiles" ON profiles
  FOR SELECT USING (
    household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
