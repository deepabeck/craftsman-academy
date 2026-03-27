-- Migration 025: Attendance Tracking
-- Brand new table for daily attendance records per student.

CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'present'
                CHECK (status IN ('present', 'absent', 'excused', 'half_day')),
  hours       NUMERIC(4,2),
  source      TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual', 'auto')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(student_id, date)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manages_attendance" ON attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "students_read_own_attendance" ON attendance
  FOR SELECT USING (student_id = auth.uid());
