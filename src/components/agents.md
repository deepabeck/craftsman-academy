# Components — Agent Guidelines

## Design System: Steampunk Brass/Glass-Morphism

### Glass Panels
- `.glass` — Dark semi-transparent panel: `bg-steampunk-panel backdrop-blur-[14px] border border-brass-dark/22 rounded-[10px]`
- `.glass-warm` — Warm semi-transparent panel: `bg-steampunk-panel-warm backdrop-blur-[16px] border border-brass-dark/32 rounded-[10px]` with inset shadow

### Brass Elements
- Buttons use `btn-brass` (gradient brass) or `btn-ghost` (transparent with brass border)
- Rivets: small circular decorative elements at panel corners
- Dividers: horizontal gradient lines (transparent → brass → transparent)

### Typography
- `.cinzel` — Display font for headers and labels
- `.metal-text` — Gradient brass text using background-clip
- `.metal-wrap` — Drop shadow wrapper for metal text (needed since text-fill is transparent)

### Dynamic Colors
Student and subject colors come from the database. Use the `rgba(hex, alpha)` utility from `@/lib/utils` with inline `style` props. These cannot be Tailwind classes since the values are dynamic.

### Component Hierarchy
1. **Base UI** (`/ui/`): Icon, Rivet, Divider, ProgressBar, StatusBadge, PageHeader, buttons
2. **Layout** (`/layout/`): BackgroundLayers, AdminSidebar, StudentSidebar
3. **Widgets** (`/widgets/`): WeatherWidget, CalendarWidget
4. **Modals** (`/modals/`): SubmitModal, SubjectModal

### Client vs Server Components
- Server by default. Only add `'use client'` when the component uses hooks, event handlers, or browser APIs.
- All modals, sidebars, and interactive pickers are client components.
- Static display components (Icon, Rivet, Divider, StatusBadge, PageHeader) are server components.
