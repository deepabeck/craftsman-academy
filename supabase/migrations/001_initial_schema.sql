-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  color TEXT NOT NULL DEFAULT '#4A90D0',
  avatar_url TEXT,
  grade TEXT,
  tagline TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subjects
CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  days TEXT[] NOT NULL DEFAULT '{}',
  only_student UUID REFERENCES profiles(id),
  detail TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks (daily instances per student per subject)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  proof_type TEXT NOT NULL CHECK (proof_type IN ('photo', 'timer', 'checkbox')),
  duration INTEGER DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'review', 'missed', 'approved')),
  notes TEXT DEFAULT '',
  files TEXT[] DEFAULT '{}',
  timer_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, subject_id, task_date)
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  subject_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs-revision')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  reviewer_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- AI Notes (weekly per student)
CREATE TABLE ai_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  week_start DATE NOT NULL,
  summary TEXT DEFAULT '',
  tags JSONB DEFAULT '[]',
  parent_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, week_start)
);

-- User Settings (background color, preferences)
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bg_color TEXT DEFAULT '#1A3A5C',
  settings JSONB DEFAULT '{}'
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Admin sees all profiles
CREATE POLICY "Admin reads all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students see own profile
CREATE POLICY "Students read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin updates all profiles
CREATE POLICY "Admin updates all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Subjects are visible to all authenticated users
CREATE POLICY "Authenticated users read subjects" ON subjects
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin manages subjects
CREATE POLICY "Admin manages subjects" ON subjects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students see own tasks
CREATE POLICY "Students read own tasks" ON tasks
  FOR SELECT USING (student_id = auth.uid());

-- Admin sees all tasks
CREATE POLICY "Admin reads all tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students update own tasks
CREATE POLICY "Students update own tasks" ON tasks
  FOR UPDATE USING (student_id = auth.uid());

-- Reviews: similar pattern
CREATE POLICY "Students read own reviews" ON reviews
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admin manages all reviews" ON reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- AI Notes: admin reads all, students read own
CREATE POLICY "Admin reads all ai_notes" ON ai_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students read own ai_notes" ON ai_notes
  FOR SELECT USING (student_id = auth.uid());

-- User settings: own only
CREATE POLICY "Users manage own settings" ON user_settings
  FOR ALL USING (user_id = auth.uid());
