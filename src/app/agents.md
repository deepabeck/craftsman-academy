# App Router — Agent Guidelines

## Routing Structure

- `/login` — Public login page
- `/(authenticated)/` — Route group requiring auth
  - `/admin/dashboard` — Command Center
  - `/admin/subjects` — Subject CRUD
  - `/admin/lessons` — Lesson planner with inline editing
  - `/admin/review` — Review queue (approve/reject student work)
  - `/admin/profiles` — Student profile management
  - `/student/today` — Today's missions (task cards + submit modal)
  - `/student/week` — Weekly schedule grid
  - `/student/progress` — Progress report
  - `/student/history` — Mission log (completed assignments)
  - `/student/customize` — Color customization

## Layout Hierarchy

1. **Root layout** (`/src/app/layout.tsx`): Fonts, providers, BackgroundLayers
2. **Auth layout** (`/(authenticated)/layout.tsx`): Auth check, redirect to /login if needed
3. **Admin layout** (`/(authenticated)/admin/layout.tsx`): AdminSidebar + main scroll area
4. **Student layout** (`/(authenticated)/student/layout.tsx`): StudentSidebar + main scroll area

## Client vs Server Boundaries

- Page files (`page.tsx`) can be server components that fetch data
- Interactive content should be extracted into separate client components
- Sidebars are client components (need `usePathname()` for active state)
- Auth provider wraps everything in the root layout
