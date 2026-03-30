-- Migration 028: Add 'revision_request' to submission_type constraint
-- Allows admins to log a revision_request row in submissions as a permanent record
-- when a task is sent back to the student for revision.

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_submission_type_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_submission_type_check
  CHECK (submission_type IN (
    'photo', 'audio', 'video', 'text', 'timer', 'file',
    'revision_request'
  ));
