-- Migration 031: Household-scoped RLS
-- Replaces all "any admin sees everything" policies with policies that
-- restrict each admin to their own household's data only.
-- All existing data is preserved — this only changes access control.
--
-- Pattern for tables WITH household_id (profiles, subjects, marketplace_items):
--   admin's household_id = row's household_id
--
-- Pattern for tables WITHOUT household_id but linked via student_id
-- (tasks, submissions, points_log, ai_notes, school_years, marketplace_purchases):
--   admin's household_id = student's household_id

-- ── Helper: reusable inline check ────────────────────────────────────────────
-- We use a subquery pattern throughout:
--   EXISTS (
--     SELECT 1 FROM profiles
--     WHERE id = auth.uid() AND role = 'admin'
--       AND household_id = <target household>
--   )

-- ── profiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin reads all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin updates all profiles" ON profiles;

CREATE POLICY "Admin reads household profiles" ON profiles
  FOR SELECT USING (
    -- Admins see their own household's profiles (including their own)
    household_id = (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin updates household profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      WHERE admin_p.id = auth.uid()
        AND admin_p.role = 'admin'
        AND admin_p.household_id = profiles.household_id
    )
  );

-- ── subjects ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users read subjects" ON subjects;
DROP POLICY IF EXISTS "Admin manages subjects" ON subjects;

-- Students read only their household's subjects
CREATE POLICY "Students read household subjects" ON subjects
  FOR SELECT USING (
    household_id = (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins manage only their household's subjects
CREATE POLICY "Admin manages household subjects" ON subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND household_id = subjects.household_id
    )
  );

-- ── tasks ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manages all tasks" ON tasks;

CREATE POLICY "Admin manages household tasks" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      JOIN profiles student_p ON student_p.household_id = admin_p.household_id
      WHERE admin_p.id = auth.uid()
        AND admin_p.role = 'admin'
        AND student_p.id = tasks.student_id
    )
  );

-- ── submissions ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin reads all submissions" ON submissions;

CREATE POLICY "Admin reads household submissions" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      JOIN profiles student_p ON student_p.household_id = admin_p.household_id
      WHERE admin_p.id = auth.uid()
        AND admin_p.role = 'admin'
        AND student_p.id = submissions.student_id
    )
  );

-- ── ai_notes ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin reads all ai_notes" ON ai_notes;

CREATE POLICY "Admin manages household ai_notes" ON ai_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      JOIN profiles student_p ON student_p.household_id = admin_p.household_id
      WHERE admin_p.id = auth.uid()
        AND admin_p.role = 'admin'
        AND student_p.id = ai_notes.student_id
    )
  );

-- ── points_log ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_read_all_points" ON points_log;

CREATE POLICY "admins_read_household_points" ON points_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      JOIN profiles student_p ON student_p.household_id = admin_p.household_id
      WHERE admin_p.id = auth.uid()
        AND admin_p.role = 'admin'
        AND student_p.id = points_log.student_id
    )
  );

-- ── school_years ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "school_years_admin_all" ON school_years;

CREATE POLICY "school_years_admin_household" ON school_years
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      JOIN profiles student_p ON student_p.household_id = admin_p.household_id
      WHERE admin_p.id = auth.uid()
        AND admin_p.role = 'admin'
        AND student_p.id = school_years.student_id
    )
  );

-- ── marketplace_items ─────────────────────────────────────────────────────────
-- Students currently see all active items; scope to their household
DROP POLICY IF EXISTS "students read active items" ON marketplace_items;

CREATE POLICY "students read household active items" ON marketplace_items
  FOR SELECT USING (
    is_active = true
    AND household_id = (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admin manages only their household's items (no existing policy — add new)
CREATE POLICY "admin manages household items" ON marketplace_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND household_id = marketplace_items.household_id
    )
  );

-- ── marketplace_purchases ─────────────────────────────────────────────────────
-- No existing admin RLS policy (service client handles writes).
-- Add a scoped read policy for admins so direct API calls are safe.
CREATE POLICY "admin reads household purchases" ON marketplace_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      JOIN profiles student_p ON student_p.household_id = admin_p.household_id
      WHERE admin_p.id = auth.uid()
        AND admin_p.role = 'admin'
        AND student_p.id = marketplace_purchases.student_id
    )
  );
