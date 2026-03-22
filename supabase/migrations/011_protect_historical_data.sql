-- ── Protect historical task data from accidental subject deletion ─────────────
-- Change tasks.subject_id FK from ON DELETE CASCADE to ON DELETE RESTRICT.
-- This means deleting a subject that has ANY tasks (including historical completed
-- ones) will be blocked at the DB level, not silently cascade-deleted.
-- The application layer (deleteSubject action) already checks for this, but the
-- DB constraint is a safety net in case of direct SQL access.

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_subject_id_fkey;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_subject_id_fkey
  FOREIGN KEY (subject_id)
  REFERENCES subjects(id)
  ON DELETE RESTRICT;

-- Same protection for lesson_plans — don't silently delete a full week's plans
-- if a subject is deleted.
ALTER TABLE lesson_plans
  DROP CONSTRAINT IF EXISTS lesson_plans_subject_id_fkey;

ALTER TABLE lesson_plans
  ADD CONSTRAINT lesson_plans_subject_id_fkey
  FOREIGN KEY (subject_id)
  REFERENCES subjects(id)
  ON DELETE RESTRICT;
