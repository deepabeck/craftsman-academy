-- Migration 032: Add ical_url to households
-- Stores the household's calendar feed URL, replacing the global env var.

ALTER TABLE households ADD COLUMN IF NOT EXISTS ical_url TEXT DEFAULT NULL;

-- Backfill the founding household with the existing env-var value if known.
-- Leave NULL — admin can set it via the profile page.
