'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavUser from './NavUser'

const NAV_LINKS = [
  { href: '/calendar', label: 'Calendar' },
  { href: '/rush', label: 'Rush' },
  { href: '/members', label: 'Roster' },
]

function SigmaLogo({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M16 5H8L13 12L8 19H16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <SigmaLogo size={13} />
          </div>
          <span className="text-white font-semibold text-[13.5px] tracking-tight group-hover:text-violet-300 transition-colors">
            GreekSync
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? 'text-white bg-white/[0.08]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-violet-500 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>

        <NavUser />
      </div>
    </nav>
  )
}
