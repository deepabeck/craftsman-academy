-- ── Writing Journal subject ──────────────────────────────────────────────────
-- Adds the Writing Journal enrichment subject available any weekday.
-- The admin assigns it to specific days via lesson plans; the AI prompt
-- is stored in lesson_plans.assignment_detail when the plan is created.

INSERT INTO subjects (
  id,
  name,
  icon,
  color,
  days,
  only_student_key,
  active,
  category,
  activity_type,
  proof_types,
  requires_review,
  duration_minutes,
  scoring_approach,
  detail,
  sort_order
) VALUES (
  'writing-journal',
  'Writing Journal',
  'reading',
  '#9BA4F0',
  ARRAY['Mon','Tue','Wed','Thu','Fri'],
  NULL,
  true,
  'Enrichment',
  'writing_activity',
  ARRAY['text'],
  true,
  20,
  'review_based',
  'Write your journal entry for today.',
  55
)
ON CONFLICT (id) DO NOTHING;
