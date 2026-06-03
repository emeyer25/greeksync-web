import type { CSSProperties } from 'react'

// ---------------------------------------------------------------------------
// Logo — GreekSync wordmark / monogram
//
// Sizes
//   compact  — GS badge only, 24 × 24 px  (nav collapse, favicons, app icons)
//   default  — badge + wordmark, 20px text  (sidebar, nav bar)
//   large    — badge + wordmark, 32px text  (auth pages, marketing)
//
// The coral 'S' in "Sync" is the only colored character in the wordmark.
// The badge always renders the GS monogram on a coral (#FF6B4A) rounded square.
// ---------------------------------------------------------------------------

export type LogoSize = 'compact' | 'default' | 'large'

interface LogoProps {
  size?: LogoSize
  /** Extra class applied to the root element */
  className?: string
  /** Suppress the animated hover tint on the wordmark (e.g. inside a Link) */
  static?: boolean
}

// ── Per-size design tokens ──────────────────────────────────────────────────
const CONFIG = {
  compact: {
    badge:    { px: 24, radius: 7,  fontSize: 11, fontWeight: 800, letterSpacing: '-0.04em' },
    wordmark: null,
    gap:      0,
  },
  default: {
    badge:    { px: 20, radius: 6,  fontSize: 9,  fontWeight: 800, letterSpacing: '-0.04em' },
    wordmark: { fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em' },
    gap:      8,
  },
  large: {
    badge:    { px: 32, radius: 9,  fontSize: 14, fontWeight: 800, letterSpacing: '-0.04em' },
    wordmark: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em' },
    gap:      12,
  },
} as const satisfies Record<LogoSize, {
  badge: { px: number; radius: number; fontSize: number; fontWeight: number; letterSpacing: string }
  wordmark: { fontSize: number; fontWeight: number; letterSpacing: string } | null
  gap: number
}>

// ── Badge (coral square + GS monogram) ─────────────────────────────────────
function Badge({ cfg }: { cfg: typeof CONFIG[LogoSize]['badge'] }) {
  const { px, radius, fontSize, fontWeight, letterSpacing } = cfg

  const badgeStyle: CSSProperties = {
    display:         'inline-flex',
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
    width:           px,
    height:          px,
    borderRadius:    radius,
    background:      '#FF6B4A',
  }

  const textStyle: CSSProperties = {
    fontFamily:    'var(--font-satoshi, system-ui, sans-serif)',
    fontWeight,
    fontSize,
    letterSpacing,
    lineHeight:    1,
    color:         '#ffffff',
    userSelect:    'none',
  }

  return (
    <span style={badgeStyle} aria-hidden="true">
      <span style={textStyle}>GS</span>
    </span>
  )
}

// ── Wordmark ("Greek" + coral "S" + "ync") ──────────────────────────────────
function Wordmark({ cfg }: { cfg: NonNullable<typeof CONFIG[LogoSize]['wordmark']> }) {
  const { fontSize, fontWeight, letterSpacing } = cfg

  const baseStyle: CSSProperties = {
    fontFamily:    'var(--font-satoshi, system-ui, sans-serif)',
    fontWeight,
    fontSize,
    letterSpacing,
    lineHeight:    1,
    userSelect:    'none',
  }

  return (
    <span style={baseStyle}>
      <span style={{ color: '#ffffff' }}>Greek</span>
      <span style={{ color: '#FF6B4A' }}>S</span>
      <span style={{ color: '#ffffff' }}>ync</span>
    </span>
  )
}

// ── Logo (root) ─────────────────────────────────────────────────────────────
export default function Logo({ size = 'default', className }: LogoProps) {
  const cfg = CONFIG[size]

  const rootStyle: CSSProperties = {
    display:    'inline-flex',
    alignItems: 'center',
    gap:        cfg.gap,
  }

  return (
    <span className={className} style={rootStyle}>
      <Badge cfg={cfg.badge} />
      {cfg.wordmark && <Wordmark cfg={cfg.wordmark} />}
    </span>
  )
}
