-- Migration 021: AI Progress Notes Enhancement
-- Adds AI draft workflow columns to ai_notes. All nullable with safe defaults.
-- Existing parent_note values are untouched.

ALTER TABLE ai_notes ADD COLUMN IF NOT EXISTS ai_draft TEXT;
ALTER TABLE ai_notes ADD COLUMN IF NOT EXISTS ai_draft_generated_at TIMESTAMPTZ;
ALTER TABLE ai_notes ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE ai_notes ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
