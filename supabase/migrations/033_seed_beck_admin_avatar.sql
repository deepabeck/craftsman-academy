-- Seed the Beck household admin's avatar_url so the sidebar shows the
-- correct portrait instead of the generic locket fallback.
-- Only updates if avatar_url is currently NULL to avoid overwriting any
-- upload they may have done.
-- (Already applied directly via REST API on 2026-04-05.)
UPDATE profiles
SET avatar_url = '/assets/profile-admin.png'
WHERE student_key = 'admin'
  AND avatar_url IS NULL;
