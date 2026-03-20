-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006: Supabase Storage bucket + RLS policies for submissions
-- ─────────────────────────────────────────────────────────────────────────────
-- File path convention: submissions/{student_key}/{YYYY-MM-DD}/{subject_id}/{filename}
-- e.g.: submissions/deven/2025-09-15/math/workbook_p42.jpg
-- ─────────────────────────────────────────────────────────────────────────────

-- Create the submissions bucket (private — no public URL access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,         -- private bucket, all access via signed URLs
  52428800,      -- 50 MB per file limit
  NULL           -- accept any MIME type (photo, video, audio, pdf, doc, mp3, etc.)
)
ON CONFLICT (id) DO NOTHING;


-- ── Storage RLS Policies ──────────────────────────────────────────────────────
-- Students can upload files only into their own student_key folder
CREATE POLICY "Students upload own submissions"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = (
      SELECT student_key FROM profiles WHERE id = auth.uid()
    )
  );

-- Students can read their own files
CREATE POLICY "Students read own submissions"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = (
      SELECT student_key FROM profiles WHERE id = auth.uid()
    )
  );

-- Students can replace/update their own files
CREATE POLICY "Students update own submissions"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = (
      SELECT student_key FROM profiles WHERE id = auth.uid()
    )
  );

-- Admin can read ALL submissions (for review queue)
CREATE POLICY "Admin reads all submissions"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can delete files (e.g. to clean up inappropriate uploads)
CREATE POLICY "Admin deletes submissions"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
