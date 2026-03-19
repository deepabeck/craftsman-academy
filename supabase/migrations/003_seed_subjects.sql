-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Seed subjects from the curriculum blueprint
-- Maps the blueprint spreadsheet to the subjects table.
-- Run once after 002. Safe to re-run (ON CONFLICT DO UPDATE refreshes data).
-- ─────────────────────────────────────────────────────────────────────────────

-- Clear any old mock-data subjects inserted during development
DELETE FROM subjects WHERE id IN (
  'math','geo','science','reading','coding','music','piano','apex',
  'lang','pe','life','apex-hw'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CORE ACADEMIC subjects (shared by both students)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO subjects
  (id, name, icon, color, days, only_student_key, active,
   category, activity_type, proof_types, requires_review,
   duration_minutes, external_platform, detail, sort_order)
VALUES

-- Math — worksheet proof, parent reviews
('math', 'Mathematics', 'math', '#C8860A',
 ARRAY['Mon','Tue','Fri'], NULL, true,
 'Core Academic', 'worksheet',
 ARRAY['photo']::TEXT[], true,
 25, NULL,
 'Complete your assigned workbook pages. Show all work neatly.',
 10),

-- Reading — timed independent reading, no review needed
('reading', 'Reading', 'reading', '#8A60C0',
 ARRAY['Mon','Tue','Wed','Thu','Fri'], NULL, true,
 'Core Academic', 'independent_reading',
 ARRAY['timer']::TEXT[], false,
 30, NULL,
 'Read for the full session. Optional: jot a quick note about what happened.',
 20),

-- Language Arts — writing, accepts photo or text, parent reviews
('lang', 'Language Arts', 'reading', '#7050A0',
 ARRAY['Mon','Wed'], NULL, true,
 'Core Academic', 'writing_activity',
 ARRAY['photo','text']::TEXT[], true,
 40, NULL,
 'Complete your writing assignment. You can type it here or upload a photo of handwritten work.',
 30),

-- Science — worksheet or experiment; parent reviews
('science', 'Science', 'science', '#4A90C0',
 ARRAY['Wed'], NULL, true,
 'Core Academic', 'worksheet',
 ARRAY['photo']::TEXT[], true,
 30, NULL,
 'Complete the assigned pages or experiment worksheet.',
 40),

-- Geography — map work / workbook pages
('geo', 'Geography', 'geography', '#6A9A60',
 ARRAY['Mon','Thu'], NULL, true,
 'Core Academic', 'worksheet',
 ARRAY['photo']::TEXT[], false,
 20, NULL,
 'Complete the map work or reading pages for today.',
 50),

-- ─────────────────────────────────────────────────────────────────────────────
-- ELECTIVE subjects (student-specific)
-- ─────────────────────────────────────────────────────────────────────────────

-- Coding — Deven only, platform sync from husband-built Pickcode
('coding', 'Coding', 'coding', '#30A0A0',
 ARRAY['Mon','Tue','Thu','Fri'], 'deven', true,
 'Elective', 'online_platform',
 ARRAY['platform_sync']::TEXT[], true,
 30, 'Pickcode',
 'Complete today''s coding lesson or work on your current project.',
 60),

-- Music / Skoove — Shaan only, timer-based practice (no API needed)
('music', 'Music (Skoove)', 'music', '#C05070',
 ARRAY['Mon','Tue','Wed','Thu','Fri'], 'shaan', true,
 'Elective', 'online_platform',
 ARRAY['timer']::TEXT[], false,
 30, 'Skoove',
 'Practice on Skoove for the full session time. Timer marks you done.',
 70),

-- Piano — Shaan only, timer for practice sessions
('piano', 'Piano Practice', 'piano', '#7050C0',
 ARRAY['Mon','Wed','Fri'], 'shaan', true,
 'Elective', 'flashcard_drill',
 ARRAY['timer']::TEXT[], false,
 20, NULL,
 'Practice your scales and recital piece for the full session.',
 80),

-- ─────────────────────────────────────────────────────────────────────────────
-- ENRICHMENT subjects
-- ─────────────────────────────────────────────────────────────────────────────

-- APEX in-person class — auto-complete from iCal in Phase 2; checkbox for now
('apex', 'APEX Class', 'apex', '#D09040',
 ARRAY['Tue'], NULL, true,
 'Enrichment', 'in_person_class',
 ARRAY['checkbox']::TEXT[], false,
 330, NULL,
 'Attend APEX class. Check off when you arrive.',
 90),

-- APEX Homework — follow-up work, photo or text, parent reviews
('apex-hw', 'APEX Homework', 'apex', '#C07830',
 ARRAY['Fri'], NULL, true,
 'Enrichment', 'worksheet',
 ARRAY['photo','text']::TEXT[], true,
 40, NULL,
 'Complete the follow-up work from Tuesday''s APEX class.',
 100),

-- ─────────────────────────────────────────────────────────────────────────────
-- PHYSICAL
-- ─────────────────────────────────────────────────────────────────────────────

-- PE / Play — timed activity block, honor system
('pe', 'PE / Play', 'subjects', '#5090A0',
 ARRAY['Tue','Thu','Fri'], NULL, true,
 'Physical', 'life_skills',
 ARRAY['timer']::TEXT[], false,
 60, NULL,
 'Get outside and move! Start the timer when you begin your activity.',
 110),

-- ─────────────────────────────────────────────────────────────────────────────
-- LIFE SKILLS
-- ─────────────────────────────────────────────────────────────────────────────

-- Life Skills — checkbox, honor system
('life', 'Life Skills', 'subjects', '#709060',
 ARRAY['Tue'], NULL, true,
 'Life Skills', 'life_skills',
 ARRAY['checkbox']::TEXT[], false,
 15, NULL,
 'Complete today''s household or practical task.',
 120),

-- ─────────────────────────────────────────────────────────────────────────────
-- INACTIVE subjects (available to activate later — not visible on dashboards)
-- ─────────────────────────────────────────────────────────────────────────────

-- Personal Finance — inactive until activated by admin
('finance', 'Personal Finance', 'subjects', '#A08040',
 ARRAY['Mon','Wed'], NULL, false,
 'Life Skills', 'worksheet',
 ARRAY['text']::TEXT[], false,
 20, NULL,
 'Complete the personal finance activity for today.',
 200),

-- Spanish / Duolingo — inactive until activated by admin
('spanish', 'Spanish', 'subjects', '#D06040',
 ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], NULL, false,
 'Elective', 'online_platform',
 ARRAY['platform_sync','checkbox']::TEXT[], false,
 30, 'Duolingo',
 'Complete your Duolingo lesson. Mark done when finished.',
 210)

ON CONFLICT (id) DO UPDATE SET
  name              = EXCLUDED.name,
  icon              = EXCLUDED.icon,
  color             = EXCLUDED.color,
  days              = EXCLUDED.days,
  only_student_key  = EXCLUDED.only_student_key,
  active            = EXCLUDED.active,
  category          = EXCLUDED.category,
  activity_type     = EXCLUDED.activity_type,
  proof_types       = EXCLUDED.proof_types,
  requires_review   = EXCLUDED.requires_review,
  duration_minutes  = EXCLUDED.duration_minutes,
  external_platform = EXCLUDED.external_platform,
  detail            = EXCLUDED.detail,
  sort_order        = EXCLUDED.sort_order,
  updated_at        = now();
