'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface InviteData {
  id: string
  chapter_id: string
  email: string
  role: 'admin' | 'editor' | 'member'
  position: string | null
  used_at: string | null
  expires_at: string | null
  chapters: { name: string; slug: string }
}

const POSITIONS = [
  'President', 'Vice President', 'Treasurer', 'Secretary',
  'Social Chair', 'Rush Chair', 'Risk Management', 'Philanthropy Chair',
  'Alumni Relations', 'Member',
]

export default function JoinPage() {
  const params = useParams()
  const token = params.token as string
  const router = useRouter()

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState('')

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [posSelect, setPosSelect] = useState('Member')
  const [posCustom, setPosCustom] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadInvite()
  }, [token])

  const loadInvite = async () => {
    if (!supabase || !token) { setLoadingInvite(false); return }

    const { data, error } = await supabase
      .from('chapter_invites')
      .select('*, chapters(name, slug)')
      .eq('token', token)
      .maybeSingle()

    if (error || !data) {
      setInviteError('Invite not found or has expired.')
      setLoadingInvite(false)
      return
    }

    const inv = data as InviteData

    if (inv.used_at) {
      setInviteError('This invite has already been used.')
      setLoadingInvite(false)
      return
    }

    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      setInviteError('This invite has expired. Ask an admin to send a new one.')
      setLoadingInvite(false)
      return
    }

    setInvite(inv)
    if (inv.position) {
      const presets = ['President','Vice President','Treasurer','Secretary','Social Chair','Rush Chair',
        'Risk Management','Philanthropy Chair','Alumni Relations','Sergeant-at-Arms','Member']
      if (presets.includes(inv.position)) {
        setPosSelect(inv.position)
      } else {
        setPosSelect('__custom__')
        setPosCustom(inv.position)
      }
    }
    setLoadingInvite(false)
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !invite) return
    setSubmitting(true)
    setError('')

    try {
      // 1. Create Supabase Auth account with the invited email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password,
      })
      if (authError) throw new Error(authError.message)
      const authUser = authData.user
      if (!authUser) throw new Error('Could not create account. Please try again.')

      // 2. Create member record
      const position = posSelect === '__custom__' ? (posCustom.trim() || 'Member') : posSelect
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          name: name.trim(),
          email: invite.email,
          position,
          role: 'member',
          chapter_id: invite.chapter_id,
          user_id: authUser.id,
        })
      if (memberError) throw new Error(memberError.message)

      // 3. Mark invite as used
      await supabase
        .from('chapter_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id)

      // Done — go to app
      router.replace('/generate')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  const bg = (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
    </div>
  )

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        {bg}
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
        {bg}
        <div className="relative text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Invite</h1>
          <p className="text-zinc-400 text-sm mb-6">{inviteError}</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-12">
      {bg}

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-[26px] h-[26px] rounded-[7px] bg-violet-600 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L4 14h7l-1 8 10-12h-7L13 2z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-[13.5px] tracking-tight">GreekSync</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">You're Invited!</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Join <span className="text-white font-semibold">{invite?.chapters.name}</span> on GreekSync
          </p>
        </div>

        {/* Invite details */}
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-lg flex-shrink-0">
              ✉️
            </div>
            <div>
              <p className="text-white text-sm font-medium">{invite?.email}</p>
              <p className="text-zinc-400 text-xs capitalize">Invited as {invite?.role}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/20">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs font-medium uppercase tracking-wide mb-1.5">Full Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-medium uppercase tracking-wide mb-1.5">Your Position</label>
              <select
                value={posSelect}
                onChange={e => setPosSelect(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              >
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__custom__">Other (custom title)...</option>
              </select>
              {posSelect === '__custom__' && (
                <input
                  value={posCustom}
                  onChange={e => setPosCustom(e.target.value)}
                  placeholder="Enter your title"
                  className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                />
              )}
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-medium uppercase tracking-wide mb-1.5">Password *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim() || !password}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-sm transition-all"
            >
              {submitting ? 'Joining...' : 'Join Chapter'}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
