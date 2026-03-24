-- Shared-contribution support for marketplace
ALTER TABLE marketplace_items
  ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;

ALTER TABLE marketplace_purchases
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS contribution_amount integer;
