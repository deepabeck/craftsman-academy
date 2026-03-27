-- Migration 023: Onboarding Tracking
-- Adds onboarding and philosophy columns to households.
-- Backfills founding household as fully onboarded.

ALTER TABLE households ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE households ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE households ADD COLUMN IF NOT EXISTS philosophy TEXT DEFAULT 'structured'
  CHECK (philosophy IN ('structured', 'charlotte_mason', 'classical', 'unit_studies', 'unschool', 'eclectic'));
ALTER TABLE households ADD COLUMN IF NOT EXISTS state_code TEXT;

-- Backfill: founding household is fully onboarded
UPDATE households
SET onboarding_complete = true, onboarding_step = 99
WHERE id = '00000000-0000-0000-0000-000000000001';
