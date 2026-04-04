# Craftsman Academy — Project Conventions

## Stack

- Next.js 16 (App Router) with TypeScript
- Tailwind CSS v4 for styling
- Supabase for database and authentication
- pnpm as package manager (never use npm)
- Biome for linting and formatting (not ESLint or Prettier)

## Commands

- `pnpm dev` — Start development server
- `pnpm build` — Production build
- `pnpm biome check --write` — Fix lint and format issues
- `pnpm biome check --staged --write` — Pre-commit hook command

## Design System

Steampunk brass/glass-morphism theme. Every visual element must match the existing design exactly.

- **Fonts**: Cinzel (headings/display), Space Grotesk (body/UI)
- **Primary colors**: Brass (#E8A820), Brass Dark (#C8860A), Brass Light (#D4A830)
- **Background**: Dark navy (#08111E) with 4 fixed layers (color, haze, gears, vignette)
- **Glass panels**: Semi-transparent backgrounds with backdrop-filter blur
- **Status colors**: Done (#70E090), Pending (#D4A830), Review (#B0A0F0), Missed (#F08080)

## Component Conventions

- Components live in `/src/components/`
- Use `'use client'` only when the component needs hooks, event handlers, or browser APIs
- Default to server components
- Use `next/image` for all images (assets stored in `/public/assets/`)
- Dynamic colors (from student/subject data) use inline `style` with the `rgba()` utility
- Static design tokens use Tailwind classes

## File Naming

- kebab-case for files (`progress-bar.tsx`)
- PascalCase for component names (`ProgressBar`)
- camelCase for functions and variables

## Database

- Supabase with Row Level Security (RLS)
- Migrations in `/supabase/migrations/`
- Admin sees all records; students see only their own
- Foreign keys reference `profiles.id` (which extends `auth.users`)

## Pre-commit

Husky runs `pnpm biome check --staged --write` before every commit.

## Important Patterns

- The `rgba(hex, alpha)` utility in `/src/lib/utils.ts` is used extensively for dynamic color manipulation
- Background color is managed via ThemeProvider context and applied to the `#bg-color` layer
- Student/subject colors come from the database and cannot be known at build time — always use runtime style props for these

---

## What Has Been Built

### Users & Roles
- Two roles: `admin` (instructor/parent) and `student`
- `profiles` table extends `auth.users` with `display_name`, `tagline`, `avatar_url`, `role`, `grade`, `color` (per-student accent color)
- `user_settings` table stores per-user preferences: `bg_color` (background hue tint)
- Currently two students: **Deven** (4th Grade) and **Shaan** (6th Grade)
- Admin has a profile page with avatar, tagline, and background color picker (same as students)

### Subjects
- `subjects` table: `id`, `name`, `icon` (emoji), `color` (hex), `created_at`
- Subjects are global (not yet per-student or per-school)
- Seeded via `003_seed_subjects.sql`

### Task System
- `tasks` table: `id`, `student_id`, `subject_id`, `task_date`, `status`, `description`, `timed_task` (bool), `duration_minutes`, `admin_note`, `created_at`
- Statuses: `pending` → `review` (student submits) → `approved` or back to `pending` (if admin says revise)
- Checkbox tasks go directly to `done` (no review needed)
- `export const dynamic = "force-dynamic"` on all pages that read tasks to prevent stale caching
- Tasks are generated per-day per-student based on the lesson plan / schedule
- **Timed tasks**: timer stored in localStorage (honor system), duration tracked client-side

### Submissions & Review
- `submissions` table: `id`, `task_id`, `student_id`, `content` (text), `file_url` (optional), `submitted_at`
- Students submit text + optional file upload; task moves to `review`
- Admin review queue at `/admin/review` — shows pending submissions with approve/revise actions
- Approving sets a score (0–100) and optional admin note; triggers approval points
- "Revise" sends task back to `pending` for resubmission (student gets another +5 on resubmit)
- Writing Journal tasks support rich multi-paragraph text entry

### Points / Cogs System (`014_points_system.sql`)
- `points_log` table: `id`, `student_id`, `category`, `points`, `source_id`, `source_date`, `note`, `earned_at`
- Categories: `task_submit` (+5), `task_approve` (+0–15 based on score), `daily_submit_bonus` (+20 when all tasks submitted), `weekly_bonus` (accelerator)
- Score → approval points: 90–100% = +15, 80–89% = +12, 70–79% = +8, 60–69% = +5, below 60% = +0
- Unique constraint prevents double-awarding (idempotent via 23505 error catch)
- `awardSubmissionPoints`, `awardApprovalPoints` in `src/app/actions/points.ts`
- **Important**: auto-fulfilled tasks (via lesson planner calendar) also award points — both submit and approve entries are logged at 100%

### Marketplace / Shop (`015_marketplace.sql`, `016_shared_contributions.sql`)
- `marketplace_items` table: `id`, `name`, `description`, `price` (Cogs), `icon`, `active`, `shared` (bool — splits cost ÷ 2 per student)
- `marketplace_purchases` table: `id`, `item_id`, `student_id`, `status` (`pending`/`approved`/`rejected`), `note` (student's optional note), `contribution_amount` (actual Cogs deducted, = price÷2 for shared items), `admin_note`, `requested_at`, `resolved_at`
- Students request items; admin approves/rejects from `/admin/shop`
- Shared items: both students each pay half; admin sees a grouped "SharedGroupCard" and can only approve once both have contributed
- Approval deducts `contribution_amount` from student's Cogs balance via a negative `points_log` entry
- `getSharedItemContributions()` uses service-role client to bypass RLS and show co-contributor status to students

### Lesson Planner / Schedule (`005_lesson_plans.sql`)
- `lesson_plans` table: per-student weekly plans with subject/day assignments
- `school_years` table (`012_school_years.sql`): defines school year start/end, active year
- Schedule page at `/admin/schedule` — admin assigns subjects to days of the week per student
- Calendar events can auto-fulfill tasks (e.g. "CU Science Class" fulfills Science task for that day)
- **Known edge case**: adding a new subject backfills tasks to previous days — points for backfilled tasks should be manually audited if the subject didn't start until a later date
- Cancel class tool: using "save" on the cancel class UI accidentally auto-submits tasks — be careful

### Command Center Dashboard (`/admin/dashboard`)
- `export const dynamic = "force-dynamic"` — never cached
- Student selector cards at top: avatar, name, grade, Cogs balance (inline), today % / week %
- Left column: today's progress bar, week's progress bar, today's task list with status badges, parent note for the week
- Right column: 30-day per-subject breakdown with completion % bar and AI-generated one-liner note per subject
- `SubjectMonth` interface: `{ id, name, icon, color, pct30, total30, done30, aiNote }`
- `ai_notes` table: per-student per-week parent notes (upserted, never overwritten mid-week)
- Cogs balance = sum of all `points_log.points` for the student (can go negative after purchases)

### Admin Sections
- `/admin/dashboard` — Command Center (see above)
- `/admin/review` — Submission review queue
- `/admin/shop` — Marketplace management (add/edit items, approve/reject purchases)
- `/admin/schedule` — Lesson planner / calendar
- `/admin/profiles` — Admin's own profile (name, tagline, avatar, background color)

### Student Sections
- `/student/dashboard` — Student's daily view (today's tasks, progress, Cogs balance)
- `/student/shop` — Browse items, request purchases, see co-contributor status on shared items
- `/student/profile` — Avatar, tagline, background color picker (`HexPicker` component)
- `/student/submissions` — View past submissions

### Key Components
- `PortraitFrame` — Gold-framed avatar with name/tagline, used in sidebars
- `ProgBar` — Reusable progress bar, accepts `value` (0–100) and `color` (CSS string)
- `HexPicker` — Color picker for background hue tint, debounced save
- `ThemeProvider` — Context that applies `bg_color` to the `#bg-color` background layer
- `AISummaryPanel` — Parent note input for the week (must use `key={student.id}` to reset between students)
- `SharedGroupCard` — Admin component showing both contributors' amounts/notes for shared shop items

### Database Migrations Summary
| Migration | Purpose |
|---|---|
| 001 | Initial schema: profiles, subjects, tasks, submissions |
| 002 | Expand schema: admin_note, timed tasks |
| 003 | Seed subjects with icons and colors |
| 004 | DB functions (e.g. generate tasks) |
| 005 | Lesson plans table |
| 006–008 | Storage buckets for file uploads and avatars |
| 009 | Writing journal support |
| 010 | Cancelled class reason field |
| 011 | Protect historical task data from edits |
| 012 | School years table |
| 013 | Student color RLS policy |
| 014 | Points system (points_log, Cogs) |
| 015 | Marketplace (items + purchases) |
| 016 | Shared contributions (shared bool, note, contribution_amount) |

### Known Issues / Gotchas
- New subject creation backfills tasks to previous days — can cause incorrect point awards for days the subject didn't exist yet
- Auto-fulfillment via lesson planner calendar does award points (both submit + approve at 100%) — this is intentional
- Always use `key={student.id}` when rendering per-student stateful components to prevent state bleed between students
- All admin pages that read live data use `export const dynamic = "force-dynamic"` to prevent Next.js caching stale results
- `pnpm` only — never `npm`

---

# Evolution Plan: Craftsman Academy → Homeschool SaaS App

## ⚠️ CRITICAL: Data Preservation

**This app is in active daily use by the family.** All existing data — profiles, tasks, submissions, scores, points, lesson plans, progress notes — must be preserved throughout the evolution. No destructive migrations. No breaking changes to the production branch.

- All database migrations must be **additive only** (no DROP TABLE, no DROP COLUMN on populated tables)
- Schema evolution via ALTER TABLE ADD COLUMN with safe defaults
- Existing RLS policies remain until explicitly replaced
- Feature branches for all development; main/production stays stable
- Deven and Shaan's data is sacrosanct

## Evolution Direction

This codebase is evolving from a single-family homeschool app into a multi-household SaaS product. The key changes:

1. **Multi-household support** — new `households` table; `profiles`, `subjects`, `marketplace_items` get `household_id`; RLS evolves from global-admin to household-scoped
2. **Student theme system** — new `theme_library` table + `user_settings.theme` column; themes are CSS variable swaps only, no per-theme custom assets
3. **AI philosophy: TA, not teacher** — AI assists with first-pass scoring, lesson plan scaffolding, and progress note drafts. Parent reviews and approves everything. AI score is visible to admin only (students see qualitative feedback, not the number).
4. **Freemium pricing** — `households.plan_tier` controls feature access (free = 1 student, no AI; standard/family = multi-student + AI)
5. **Simplified theming** — Steampunk becomes one theme in a library of 6. The gold frames, gear overlays, composited portraits, and per-component art direction are NOT replicated across themes. Each theme = CSS variables + one background image.
6. **Community-shared lesson plans** — parents can share plans; other parents browse and import. New `shared_lesson_plan_templates` table.

## Key Decisions (from product planning session)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Codebase strategy | Evolve in place (not fork) | Live data must be preserved; Craftsman Academy is the production app |
| Pricing model | Freemium + paid tiers | Free (1 student, no AI) → Standard (~$6-8/mo, 5 students, full AI) → Family (~$10-12/mo, 10 students) |
| AI cost management | Smart limits | AI scores review-required submissions only; checkbox/timer tasks skip AI entirely |
| Homeschool philosophy | Structured-first, flex-friendly | Core UX = daily assigned tasks. Non-traditional styles can use it loosely. No separate modes. |
| Community features | Household-focused only | No social feed, no messaging. Community-shared lesson plans are the only cross-household feature. |
| Co-op / multi-teacher | Phase 3 / future | Not designing for it now. |
| Publisher lesson plans | Out of scope | AI generation + community sharing replaces the need for publisher partnerships |
| Student themes | CSS variable swap only | No per-theme custom assets. One background image + color palette + font pairing + card style. That's the budget. |
| AI boundaries | 3 places only | AI in: (1) submission scoring, (2) lesson plan scaffolding, (3) progress note drafts. That's it. No AI encouragement, no AI journal prompts, no AI batch grading. |

## Schema Evolution (Migrations 017–025)

See `schema-evolution-plan.md` for full SQL. Summary:

| # | Migration | Purpose |
|---|-----------|---------|
| 017 | Households | New `households` table, `profiles.household_id`, backfill existing data |
| 018 | Household-scoped subjects | `subjects.household_id`, backfill |
| 019 | Household-scoped marketplace | `marketplace_items.household_id`, backfill |
| 020 | Student themes | `user_settings.theme`, new `theme_library` table with 7 seed themes |
| 021 | AI progress notes | `ai_notes.ai_draft`, `ai_draft_generated_at`, `is_approved` |
| 022 | Community shared plans | New `shared_lesson_plan_templates` table |
| 023 | Onboarding tracking | `households.onboarding_complete/step/philosophy/state_code` |
| 024 | Grade book enhancement | `subjects.grade_weights/grading_scale/transcript_group/is_core/credit_hours`, `tasks.grade_category` |
| 025 | Attendance tracking | New `attendance` table |

## Reference Documents

These files contain the full product requirements and competitive research:

- `homeschool-app-requirements.md` — Product spec with all functional requirements, AI philosophy, pricing, phasing
- `homeschool-app-research-annotated.md` — Competitive research with requirement callouts
- `schema-evolution-plan.md` — Full SQL for migrations 017–025
