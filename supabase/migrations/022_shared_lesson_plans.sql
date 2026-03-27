-- Migration 022: Community-Shared Lesson Plans
-- Brand new table for parents to share lesson plan templates across households.

CREATE TABLE shared_lesson_plan_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who shared it
  shared_by       UUID NOT NULL REFERENCES profiles(id),
  household_id    UUID NOT NULL REFERENCES households(id),

  -- Metadata for browse/search
  title           TEXT NOT NULL,
  description     TEXT,
  subject_name    TEXT NOT NULL,
  grade_level     TEXT,
  curriculum_name TEXT,
  tags            TEXT[] DEFAULT '{}',

  -- The actual plan content (JSON array of plan entries)
  plan_content    JSONB NOT NULL,

  -- How many weeks the plan covers
  week_count      INTEGER NOT NULL DEFAULT 1,

  -- Usage stats
  import_count    INTEGER NOT NULL DEFAULT 0,

  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shared_lesson_plan_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can browse shared templates
CREATE POLICY "authenticated_reads_shared_templates" ON shared_lesson_plan_templates
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Users can manage their own shared templates
CREATE POLICY "users_manage_own_templates" ON shared_lesson_plan_templates
  FOR ALL USING (shared_by = auth.uid());

-- Indexes for search/browse
CREATE INDEX idx_shared_templates_subject ON shared_lesson_plan_templates(subject_name);
CREATE INDEX idx_shared_templates_grade ON shared_lesson_plan_templates(grade_level);
CREATE INDEX idx_shared_templates_curriculum ON shared_lesson_plan_templates(curriculum_name);
