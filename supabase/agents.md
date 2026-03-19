# Supabase — Agent Guidelines

## Schema

- `profiles` — Extends auth.users with display_name, role, color, avatar_url, grade, tagline
- `subjects` — Curriculum subjects with icon, color, schedule days, assignment details
- `tasks` — Per-student per-day task instances with status tracking
- `reviews` — Submitted work awaiting admin review
- `ai_notes` — Weekly AI-generated summaries per student
- `user_settings` — Per-user preferences (background color, etc.)

## Row Level Security

- Admin role: SELECT/UPDATE on all tables
- Student role: SELECT/UPDATE only on own records
- All tables have RLS enabled

## Migration Conventions

- Files in `/supabase/migrations/` with sequential numbering: `001_initial_schema.sql`
- Use `gen_random_uuid()` for UUID primary keys
- Use `TIMESTAMPTZ` for all timestamps
- Foreign keys reference `profiles.id` which references `auth.users(id)`

## Client Usage

- Browser client: `/src/lib/supabase/client.ts` — for client components
- Server client: `/src/lib/supabase/server.ts` — for server components and route handlers
- Middleware: `/src/middleware.ts` — session refresh and route protection
