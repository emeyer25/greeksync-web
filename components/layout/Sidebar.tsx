'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Calendar, Users, BookUser, Settings, User, LogOut, UtensilsCrossed, DollarSign } from 'lucide-react'
import Logo from '@/components/ui/Logo'

const MAIN_NAV = [
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/rush', label: 'Rush', icon: Users },
  { href: '/members', label: 'Roster', icon: BookUser },
  { href: '/meals', label: 'Meals', icon: UtensilsCrossed },
  { href: '/dues', label: 'Dues', icon: DollarSign },
]

const SETTINGS_NAV = [
  { href: '/settings', label: 'Chapter Settings', icon: Settings },
  { href: '/profile', label: 'My Account', icon: User },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}


function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
        active
          ? 'text-white bg-[rgba(255,107,74,0.08)]'
          : 'text-[#8B949E] hover:text-white hover:bg-[#21262D]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#FF6B4A] rounded-r-full" />
      )}
      <Icon size={20} strokeWidth={1.5} />
      <span>{label}</span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, member, chapter, signOut, isAdmin } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const displayName = member?.name ?? user?.email?.split('@')[0] ?? ''
  const initials = displayName ? getInitials(displayName) : '?'

  const allNav = [
    ...MAIN_NAV,
    ...SETTINGS_NAV.filter(({ href }) => href !== '/settings' || isAdmin),
  ]

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 min-h-screen flex-col bg-[#0D1117] border-r border-[#21262D] flex-shrink-0">
        {/* Wordmark + chapter */}
        <div className="px-4 py-5 border-b border-[#21262D]">
          <Link href="/" className="group">
            <Logo size="default" />
          </Link>
          {chapter && (
            <p className="text-[#8B949E] text-xs mt-2 truncate pl-[36px]">{chapter.name}</p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4">
          <p className="text-[10px] font-medium text-[#8B949E] uppercase tracking-[0.08em] px-3 mb-2">
            Main
          </p>
          <ul className="space-y-0.5">
            {MAIN_NAV.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <li key={href}>
                  <NavItem href={href} label={label} icon={icon} active={active} />
                </li>
              )
            })}
          </ul>

          <div className="my-4 border-t border-[#21262D]" />

          <p className="text-[10px] font-medium text-[#8B949E] uppercase tracking-[0.08em] px-3 mb-2">
            Settings
          </p>
          <ul className="space-y-0.5">
            {SETTINGS_NAV.filter(({ href }) => href !== '/settings' || isAdmin).map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <li key={href}>
                  <NavItem href={href} label={label} icon={icon} active={active} />
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-[#21262D]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[rgba(255,107,74,0.12)] border border-[rgba(255,107,74,0.2)] flex items-center justify-center text-[#FF6B4A] text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate leading-tight">{displayName}</p>
              {chapter && (
                <p className="text-[#8B949E] text-xs truncate leading-tight">{chapter.name}</p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="text-[#8B949E] hover:text-white transition-colors duration-150 flex-shrink-0"
              title="Sign out"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1117] border-t border-[#21262D] flex items-stretch">
        {allNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-150 min-h-[56px] ${
                active ? 'text-[#FF6B4A]' : 'text-[#8B949E]'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#FF6B4A] rounded-b-full" />
              )}
              <Icon size={20} strokeWidth={1.5} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
