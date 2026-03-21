-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Public avatars storage bucket for profile photos
-- ─────────────────────────────────────────────────────────────────────────────
-- Path convention: avatars/{student_key}.jpg  (or .png, etc.)
-- Public bucket — no signed URLs needed since profile photos are not sensitive
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,          -- public bucket, URLs are stable and shareable
  5242880,       -- 5 MB per file limit (profile photos don't need to be large)
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS Policies ──────────────────────────────────────────────────────

-- Anyone (including unauthenticated) can read avatars (they appear on login screen)
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Admin can upload / update avatars
CREATE POLICY "Admin uploads avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin updates avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin deletes avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
