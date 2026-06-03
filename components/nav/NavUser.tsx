'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-green-500 to-emerald-600',
  'from-cyan-500 to-teal-600',
]
function getAvatarGradient(name: string) {
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function NavUser() {
  const { user, member, chapter, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-[12px] font-medium text-zinc-400 hover:text-white transition-colors"
      >
        Sign In
      </Link>
    )
  }

  const displayName = member?.name ?? user.email?.split('@')[0] ?? ''
  const initial = displayName.charAt(0).toUpperCase()
  const gradient = getAvatarGradient(displayName)

  return (
    <div className="flex items-center gap-3">
      <Link href="/profile" className="hidden sm:block text-right hover:opacity-70 transition-opacity">
        <p className="text-[12px] font-medium text-zinc-200 leading-tight max-w-[120px] truncate">
          {displayName}
        </p>
        {chapter && (
          <p className="text-[10px] text-zinc-500 leading-tight max-w-[120px] truncate">
            {chapter.name}
          </p>
        )}
      </Link>

      <Link
        href="/profile"
        className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[11px] font-bold shadow-lg hover:scale-105 transition-transform`}
      >
        {initial}
      </Link>

      <button
        onClick={handleSignOut}
        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
