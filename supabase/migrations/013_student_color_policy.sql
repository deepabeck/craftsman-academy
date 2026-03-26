-- Allow students to update their own color on profiles.
-- Scoped to only their own row; the app only writes the color column.
CREATE POLICY "Students update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
