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
