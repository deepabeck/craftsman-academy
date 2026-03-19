# Craftsman Academy

A steampunk-themed homeschool management portal for parents and students. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Supabase
- **Package Manager**: pnpm
- **Linting/Formatting**: Biome
- **Pre-commit Hooks**: Husky

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Supabase CLI (optional, for local Supabase development)

## Local Development

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file in the root directory:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Project Structure

```
src/
  app/                    # Next.js App Router pages and layouts
    login/                # Login page
    (authenticated)/      # Route group for authenticated pages
      admin/              # Admin dashboard, subjects, lessons, review, profiles
      student/            # Student today, week, progress, history, customize
  components/
    ui/                   # Base design system (Icon, Rivet, Divider, etc.)
    layout/               # Sidebars, background layers
    widgets/              # Weather, calendar widgets
    modals/               # Submit, subject modals
  lib/
    supabase/             # Supabase client utilities
    types.ts              # TypeScript interfaces
    utils.ts              # Helper functions (hexToRgb, rgba)
    constants.ts          # Icon map, mock data
  providers/              # React context providers (auth, theme)
public/
  assets/                 # Image assets (icons, backgrounds, profiles)
supabase/
  migrations/             # Database migration SQL files
```

## Design System

The app uses a steampunk brass/glass-morphism design:

- **Fonts**: Cinzel (headings), Space Grotesk (body)
- **Primary accent**: Brass gold (#E8A820)
- **Glass panels**: Semi-transparent with backdrop blur
- **Metallic text**: Gradient background-clip effect
- **Animations**: Tech pulse glow, coin spin

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm start        # Start production server
pnpm biome check  # Run linting and formatting
```
