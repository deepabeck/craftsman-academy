-- Migration 019: Household-Scoped Marketplace
-- Adds household_id to marketplace_items and backfills to the founding household.
-- Adds household-scoped RLS alongside existing policies (no drops).

ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);

UPDATE marketplace_items
SET household_id = '00000000-0000-0000-0000-000000000001'
WHERE household_id IS NULL;

ALTER TABLE marketplace_items ALTER COLUMN household_id SET NOT NULL;

CREATE POLICY "household_reads_items" ON marketplace_items
  FOR SELECT USING (
    household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
