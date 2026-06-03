# GreekSync — Claude Code Project Config

## Design System

Always reference `DESIGN_SYSTEM.md` in the repo root before making any frontend changes. It is the single source of truth for colors, typography, spacing, components, and page layouts.

## Key Constraints

- Dark mode only. No light mode toggle.
- Accent color is coral (#FF6B4A). Use it sparingly — only for primary CTAs, active nav indicators, and key interactive elements.
- No gradients, glows, shimmer effects, or purple anywhere.
- No box shadows on cards unless specified for hover states.
- Loading states use skeleton screens (pulsing #161B22 / #21262D), never spinners.
- One primary CTA per screen maximum.

## Stack

- Next.js (App Router)
- Supabase (Auth + Database)
- Tailwind CSS
- Lucide React for icons

## When Making UI Changes

1. Read the relevant section of DESIGN_SYSTEM.md first.
2. Only change styling and layout. Do not modify data fetching, auth, or Supabase calls unless explicitly asked.
3. Use the CSS variable tokens defined in DESIGN_SYSTEM.md — do not hardcode colors.
4. Fonts: Satoshi for headings (h1, h2, display), Inter for everything else, JetBrains Mono for timestamps/IDs/counts.
