-- Migration 024: Grade Book Enhancement
-- Adds grading configuration to subjects and grade category to tasks.
-- All columns nullable or with safe defaults. No backfill needed.

-- ── subjects: add grading configuration ───────────────────────────────────────
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS grade_weights JSONB DEFAULT '{}';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS grading_scale JSONB DEFAULT '{"A":90,"B":80,"C":70,"D":60,"F":0}';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS transcript_group TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT true;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS credit_hours NUMERIC(3,2) DEFAULT 1.0;

-- ── tasks: add grade category assignment ──────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS grade_category TEXT;
