# GreekSync Design System

> This file is the single source of truth for all UI decisions. Reference it for every frontend change.

## Hard Rules

- Dark mode only (no light mode toggle for MVP)
- No gradients, glows, or shimmer effects
- No purple — the accent color is coral
- Use coral sparingly — only primary CTAs, active nav states, and key interactive elements
- No box shadows on cards by default
- No entrance animations on page load
- Loading states use skeleton screens, never spinners
- One primary CTA per screen maximum

---

## Colors

### CSS Variables (add to tailwind.config.js or globals.css)

```css
:root {
  /* Backgrounds */
  --color-bg-primary: #0D1117;       /* Page background */
  --color-bg-elevated: #161B22;      /* Cards, modals, dropdowns */
  --color-bg-surface: #21262D;       /* Input backgrounds, borders, dividers */

  /* Accent */
  --color-accent: #FF6B4A;           /* Primary CTAs, active states, links */
  --color-accent-hover: #E85A3A;     /* Hover on accent elements */
  --color-accent-subtle: rgba(255, 107, 74, 0.08); /* Active nav item bg, subtle highlights */
  --color-accent-badge: rgba(255, 107, 74, 0.12);  /* Badge/tag backgrounds */

  /* Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #8B949E;
  --color-text-placeholder: #8B949E;

  /* Borders */
  --color-border-default: #21262D;
  --color-border-hover: #30363D;

  /* Semantic */
  --color-success: #3FB88C;
  --color-warning: #F0B429;
  --color-danger: #E5484D;
}
```

### Tailwind Extend Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0D1117',
          elevated: '#161B22',
          surface: '#21262D',
        },
        accent: {
          DEFAULT: '#FF6B4A',
          hover: '#E85A3A',
          subtle: 'rgba(255, 107, 74, 0.08)',
          badge: 'rgba(255, 107, 74, 0.12)',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#8B949E',
        },
        border: {
          default: '#21262D',
          hover: '#30363D',
        },
        success: '#3FB88C',
        warning: '#F0B429',
        danger: '#E5484D',
      },
    },
  },
};
```

---

## Typography

### Font Stack

| Role    | Font           | Source                          |
|---------|----------------|---------------------------------|
| Display | Satoshi        | fontshare.com (next/font/local) |
| UI      | Inter          | next/font/google                |
| Mono    | JetBrains Mono | next/font/google                |

### Next.js Setup

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const satoshi = localFont({
  src: './fonts/Satoshi-Variable.woff2',
  variable: '--font-satoshi',
});

// Apply to <body>: `${inter.variable} ${satoshi.variable} ${jetbrains.variable} font-sans`
```

### Type Scale

| Token      | Size    | Weight | Font     | Use                                    |
|------------|---------|--------|----------|----------------------------------------|
| display-xl | 48px    | 700    | Satoshi  | Landing page hero headline             |
| display-lg | 36px    | 700    | Satoshi  | Marketing section headers              |
| h1         | 28px    | 700    | Satoshi  | In-app page titles                     |
| h2         | 22px    | 600    | Inter    | Card headers, section titles           |
| h3         | 18px    | 600    | Inter    | Subsection headers                     |
| body       | 15px    | 400    | Inter    | Default body text                      |
| body-sm    | 13px    | 400    | Inter    | Secondary text, captions               |
| label      | 12px    | 500    | Inter    | Form labels, overlines (UPPERCASE)     |
| mono       | 13px    | 400    | JetBrains| IDs, counts, timestamps, dates         |

### Rules

- Labels/overlines: always uppercase, letter-spacing 0.05em
- Line height: 1.5 for body, 1.2 for display/headings
- Max line width: 65ch for readable content

---

## Spacing

Base unit: 4px. All spacing is multiples of 4.

| Token    | Value | Use                              |
|----------|-------|----------------------------------|
| space-1  | 4px   | Icon-to-label gaps               |
| space-2  | 8px   | Compact element spacing          |
| space-3  | 12px  | Default inner padding            |
| space-4  | 16px  | Standard padding, card inner     |
| space-6  | 24px  | Section gaps within a card       |
| space-8  | 32px  | Section gaps on a page           |
| space-12 | 48px  | Major section dividers           |
| space-16 | 64px  | Page-level vertical rhythm       |

---

## Layout

- Max content width: 1200px, centered
- Sidebar: 240px fixed (collapsible to 64px on mobile)
- Content area: fluid within max-width
- Breakpoints: mobile <640px, tablet 640–1024px, desktop >1024px
- Mobile: single column, sidebar hidden, bottom nav

---

## Components

### Buttons

| Variant   | Background       | Text    | Border          | Use                          |
|-----------|------------------|---------|-----------------|------------------------------|
| Primary   | #FF6B4A          | #FFFFFF | none            | Main CTA (one per screen)    |
| Secondary | transparent      | #FFFFFF | 1px #21262D     | Supporting actions           |
| Ghost     | transparent      | #8B949E | none            | Tertiary, nav links          |
| Danger    | #E5484D          | #FFFFFF | none            | Destructive actions          |

**Specs:** height 40px (default), 32px (compact), 48px (large). Border-radius 8px. Font: Inter 14px/500. Padding: 0 16px. Hover: darken 10%. Active: scale(0.98). Disabled: opacity 0.5.

### Cards

- Background: #161B22
- Border: 1px solid #21262D
- Border-radius: 12px
- Padding: 24px
- No box-shadow by default
- Hover (if interactive): border-color #30363D, translateY(-1px), shadow 0 4px 12px rgba(0,0,0,0.3)

### Inputs

- Background: #0D1117
- Border: 1px solid #21262D
- Border-radius: 8px
- Height: 40px
- Padding: 0 12px
- Font: Inter 15px, color white
- Placeholder: #8B949E
- Focus: border-color #FF6B4A, box-shadow 0 0 0 3px rgba(255,107,74,0.15)
- Error: border-color #E5484D
- Disabled: opacity 0.5

### Badges / Tags

| Type             | Background                  | Text Color |
|------------------|-----------------------------|------------|
| Role (President) | rgba(255, 107, 74, 0.12)   | #FF6B4A    |
| Active           | rgba(63, 184, 140, 0.15)   | #3FB88C    |
| Pending          | rgba(240, 180, 41, 0.15)   | #F0B429    |
| Inactive         | rgba(139, 148, 158, 0.15)  | #8B949E    |

### Modals

- Overlay: rgba(0,0,0,0.6) with backdrop-blur 8px
- Surface: #161B22, border 1px #21262D, border-radius 16px
- Max-width: 480px (forms), 640px (content-heavy)
- Enter: fade + scale from 0.95, 200ms ease-out
- Exit: fade + scale to 0.95, 150ms ease-in

### Data Tables

- Header: 12px uppercase, #8B949E, border-bottom 1px #21262D
- Rows: 48px height, border-bottom 1px #161B22
- Row hover: background #161B22
- Active sort column: coral chevron icon

---

## Navigation (Sidebar)

Replace the top nav bar with a left sidebar on all authenticated pages.

- Width: 240px
- Background: #0D1117
- Border-right: 1px solid #21262D
- Top: GreekSync wordmark, then chapter name dropdown
- Nav items: Lucide icon (20px) + label. Padding: 8px vertical, 12px horizontal
- Active state: 3px coral left border, white text, background rgba(255,107,74,0.08)
- Sections: MAIN (Calendar, Rush, Roster) → divider → SETTINGS (Chapter Settings, My Account)
- User avatar + name at bottom, sign-out action

---

## Transitions

| Element       | Property                    | Duration | Easing                         |
|---------------|-----------------------------|----------|--------------------------------|
| Button hover  | background-color            | 150ms    | ease                           |
| Button press  | transform (scale)           | 100ms    | ease-in                        |
| Card hover    | border-color, transform     | 200ms    | ease-out                       |
| Modal enter   | opacity, transform (scale)  | 200ms    | ease-out                       |
| Modal exit    | opacity, transform (scale)  | 150ms    | ease-in                        |
| Slide panel   | transform (translateX)      | 250ms    | cubic-bezier(0.4, 0, 0.2, 1)  |
| Page transition | opacity                   | 150ms    | ease                           |
| Toast         | transform (translateY)      | 300ms    | spring                         |

### Do NOT animate

- No parallax scrolling
- No floating/bouncing elements
- No gradient shimmer effects
- No entrance animations on page load

---

## Page Specs

### Landing Page

- Hero: full viewport height, bg #0D1117 with subtle dot-grid pattern (opacity 0.03)
- Headline: LEFT-aligned, Satoshi Bold 48px. "Run your chapter like a pro." — "pro" gets coral underline decoration (not colored text)
- Subhead: Inter 18px, #8B949E. "Calendar. Rush. Roster. One platform."
- CTA: single primary button "Get Started Free". No secondary link
- Right side: product screenshot, slightly rotated (2°), subtle shadow
- Nav bar: sticky, transparent → blurs to #0D1117 on scroll. Logo left, "Sign In" (ghost) + "Get Started" (primary compact) right
- Features: full-width alternating rows (not equal-weight cards). Overline label in coral above each feature heading

### Auth (Sign In / Sign Up)

- Split screen: left = form (max-width 420px centered), right = branded visual
- Mobile: form only
- Sign Up: Chapter Name, Your Name, Email, Password
- Sign In: Email, Password, "Forgot password?" link
- OAuth: "Continue with Google" (secondary) below form with "or" divider
- Submit: full-width primary CTA

### Social Calendar

- Header: overline "CHAPTER EVENTS" (coral), title "Social Calendar" (h1), view toggle (Month/Week/List), "+ New Event" button
- Month grid: day cells #161B22, 1px #21262D borders, today = coral bottom-border
- Events: compact pills with coral left-border, truncated name, time in mono
- Click day → slide-in panel from right with day events + quick-add form
- Event detail: modal with name, date/time (mono), location, description, RSVP badge, actions
- Empty state: calendar icon (Lucide 48px, slate), "No events this month", coral "+ New Event" button

### Rush Management

- Primary view: Kanban board. Toggle to table view via segmented control
- Kanban columns: "New", "Contacted", "Invited", "Bid Extended", "Accepted" — each with overline header + count badge
- PNM cards: name (h3), phone/email (body-sm), notes preview, avatar if exists. Drag-and-drop between columns
- Quick-add: "+ Add PNM" inline at bottom of "New" column (no modal)
- Table view: columns = Name, Contact, Status (badge), Notes, Added Date (mono). Sortable + searchable
- PNM detail: slide-over panel from right (not modal). Photo upload, contact info, status dropdown, notes, contact log

### Roster

- Primary view: grid of member cards. Toggle to table view
- Search bar + role filter at top
- Member card: avatar (64px circle, initials fallback with coral bg), name (h3), role badge, class year (body-sm)
- Click → modal with full profile
- Table view: Avatar+Name, Role (badge), Class Year, Email, Status (badge). Sortable + searchable
- Invite: "Invite Member" button in header → modal with invite link (copy), role selector, optional email invite. Pending invites shown as ghost-style cards below roster

### Settings / Admin

- Vertical tabs within content area: Chapter Profile, Members & Roles, Billing, Danger Zone
- Chapter Profile: name, Greek letters, school, description, avatar upload. Save button appears only on change (sticky footer)
- Members & Roles: table with inline role dropdowns. Role definitions at top (Admin/Officer/Member)
- Danger Zone: red-bordered section, "Delete Chapter" with typed-name confirmation modal

### Meals

- Header: overline "CHAPTER MEALS" (coral), title "Meal Plan" (h1), week navigation (prev/next arrows + date range in mono font)
- Default view: week grid (Mon–Sun columns × Breakfast / Lunch / Dinner rows)
- Grid structure: `grid-cols-[88px_repeat(7,1fr)]` — first column is the meal-type label, remaining 7 are day columns
- Today's column: subtle coral tint on bg (`rgba(255,107,74,0.02)`), coral day-number text, 2px coral bottom-border on header cell
- Filled cell: meal title (xs/medium, white, 2-line clamp) + optional description snippet (11px, secondary, 1-line clamp) + thumbnail image (56px tall, `object-cover`, `rounded-md`) if present. Clicking opens edit modal (Admins/Officers only).
- Empty cell: dashed circle `+` button visible only to Admins/Officers; members see blank cell
- Loading state: skeleton rectangles (`animate-pulse bg-[#21262D]`) — one per cell, no spinners
- Modal (add/edit): 480px max-width, coral overline = meal type, title = "Add Meal" / "Edit Meal". Fields: Photo upload (drag-area or image preview with hover-remove), Meal Name (required), Description (optional textarea). Footer: Delete (danger outline, edit-only) | Cancel | Save. One primary CTA (Save).
- Permissions: `canEdit` (admin or editor role) controls all write actions. Members are read-only.
- Data: `meals` table — `(chapter_id, meal_type, date)` unique. Images in `meal-photos` Supabase Storage bucket (public).
- Navigation: prev/next week buttons shift `weekStart` by ±7 days; page re-fetches meals for the new range on change.

---

## File Structure

```
styles/tokens.css          — CSS variables from this doc
components/ui/             — Button, Card, Input, Badge, Modal, SlidePanel, DataTable
components/layout/         — Sidebar, PageHeader, ContentArea
app/(dashboard)/           — Calendar, Rush, Roster, Settings
app/(marketing)/           — Landing page, Auth pages
```
