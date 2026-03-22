-- Add cancelled_reason column to tasks table.
-- Stores the human-readable reason shown to students when a task is cancelled
-- (e.g. "Doctor appointment", "CU Science Class").
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;
