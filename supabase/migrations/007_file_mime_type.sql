-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Add file_mime_type to submissions + expand submission_type enum
-- ─────────────────────────────────────────────────────────────────────────────

-- Add mime type column (needed for image preview vs download-link decision)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS file_mime_type TEXT;

-- Drop old check constraint and replace with one that includes 'file'
ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_submission_type_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_submission_type_check
  CHECK (submission_type IN ('photo', 'audio', 'video', 'text', 'timer', 'file'));
