-- Track when student last viewed their points notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points_last_seen_at TIMESTAMPTZ DEFAULT NULL;
