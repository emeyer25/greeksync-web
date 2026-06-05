'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Mail } from 'lucide-react'

interface InviteData {
  id: string
  chapter_id: string
  email: string | null
  role: 'admin' | 'editor' | 'member'
  position: string | null
  used_at: string | null
  expires_at: string | null
  chapters: { name: string; slug: string }
}

const PRESET_POSITIONS = [
  'President', 'Vice President', 'Treasurer', 'Secretary',
  'Social Chair', 'Rush Chair', 'Risk Management', 'Philanthropy Chair',
  'Alumni Relations', 'Sergeant-at-Arms', 'Member',
]

export default function JoinPage() {
  const params = useParams()
  const token = params.token as string
  const router = useRouter()

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [posSelect, setPosSelect] = useState('Member')
  const [posCustom, setPosCustom] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadInvite() }, [token])

  const loadInvite = async () => {
    if (!supabase || !token) { setLoadingInvite(false); return }

    const { data, error } = await supabase
      .from('chapter_invites')
      .select('*, chapters(name, slug)')
      .eq('token', token)
      .maybeSingle()

    if (error || !data) {
      setInviteError('This invite link is invalid or has expired.')
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
    if (inv.email) setEmail(inv.email)

    if (inv.position) {
      if (PRESET_POSITIONS.includes(inv.position)) {
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

    const joinEmail = invite.email ?? email.trim()

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: joinEmail,
        password,
      })
      if (authError) throw new Error(authError.message)
      const authUser = authData.user
      if (!authUser) throw new Error('Could not create account. Please try again.')

      const position = posSelect === '__custom__' ? (posCustom.trim() || 'Member') : posSelect
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          name: name.trim(),
          email: joinEmail,
          position,
          role: 'member',
          chapter_id: invite.chapter_id,
          user_id: authUser.id,
        })
      if (memberError) throw new Error(memberError.message)

      await supabase
        .from('chapter_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id)

      router.replace('/calendar')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  const Logo = () => (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-[#FF6B4A] flex items-center justify-center">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
          <path d="M13 2L4 14h7l-1 8 10-12h-7L13 2z" />
        </svg>
      </div>
      <span className="font-semibold text-white text-sm tracking-tight">GreekSync</span>
    </Link>
  )

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-6">
        <div className="w-full max-w-[420px] space-y-4">
          <div className="h-8 w-32 bg-[#161B22] rounded-lg animate-pulse" />
          <div className="h-7 w-48 bg-[#161B22] rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-[#161B22] rounded animate-pulse" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-11 bg-[#161B22] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex">
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-10"><Logo /></div>
            <div className="bg-[#161B22] border border-[#21262D] rounded-2xl p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#21262D] flex items-center justify-center mx-auto mb-4">
                <Mail size={20} className="text-[#8B949E]" />
              </div>
              <h1
                className="text-xl font-bold text-white mb-2"
                style={{ fontFamily: 'var(--font-satoshi, sans-serif)' }}
              >
                Invite unavailable
              </h1>
              <p className="text-[#8B949E] text-sm mb-6">{inviteError}</p>
              <Link
                href="/login"
                className="inline-block bg-[#FF6B4A] hover:bg-[#E85A3A] text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex w-[480px] bg-[#161B22] border-l border-[#21262D] flex-col items-center justify-center p-12 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              opacity: 0.03,
            }}
          />
          <div className="relative text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FF6B4A] flex items-center justify-center mx-auto mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L4 14h7l-1 8 10-12h-7L13 2z" />
              </svg>
            </div>
            <p className="text-[#8B949E] text-xs font-medium uppercase tracking-[0.05em] mb-3">GreekSync</p>
            <h2
              className="text-white text-2xl font-bold leading-tight mb-3"
              style={{ fontFamily: 'var(--font-satoshi, sans-serif)' }}
            >
              Run your chapter<br />like a pro.
            </h2>
            <p className="text-[#8B949E] text-sm">Calendar. Rush. Roster. One platform.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">

          <div className="mb-10"><Logo /></div>

          <h1
            className="text-[28px] font-bold text-white leading-tight mb-1"
            style={{ fontFamily: 'var(--font-satoshi, sans-serif)' }}
          >
            Join {invite?.chapters.name}
          </h1>
          <p className="text-[#8B949E] text-sm mb-8">
            {invite?.email
              ? <>Invited as <span className="text-white font-mono">{invite.email}</span></>
              : 'Create your account to get started.'}
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em] mb-2">
                Full Name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                className="field"
              />
            </div>

            {!invite?.email && (
              <div>
                <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="field"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em] mb-2">
                Position
              </label>
              <select
                value={posSelect}
                onChange={e => setPosSelect(e.target.value)}
                className="field"
              >
                {PRESET_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__custom__">Other…</option>
              </select>
              {posSelect === '__custom__' && (
                <input
                  value={posCustom}
                  onChange={e => setPosCustom(e.target.value)}
                  placeholder="Enter your title"
                  className="field mt-2"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
                className="field"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg text-xs text-[#E5484D] border"
                style={{ background: 'rgba(229,72,77,0.08)', borderColor: 'rgba(229,72,77,0.2)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim() || !password}
              className="btn-primary w-full mt-2"
            >
              {submitting ? 'Creating account…' : 'Join Chapter'}
            </button>
          </form>

          <p className="text-center text-[#8B949E] text-xs mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:text-[#FF6B4A] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right: branded visual (desktop only) */}
      <div className="hidden lg:flex w-[480px] bg-[#161B22] border-l border-[#21262D] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.03,
          }}
        />
        <div className="relative text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FF6B4A] flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L4 14h7l-1 8 10-12h-7L13 2z" />
            </svg>
          </div>
          <p className="text-[#8B949E] text-xs font-medium uppercase tracking-[0.05em] mb-3">GreekSync</p>
          <h2
            className="text-white text-2xl font-bold leading-tight mb-3"
            style={{ fontFamily: 'var(--font-satoshi, sans-serif)' }}
          >
            Your chapter<br />awaits.
          </h2>
          <p className="text-[#8B949E] text-sm">Calendar. Rush. Roster. One platform.</p>

          <div className="mt-10 space-y-3 text-left">
            {[
              { label: 'Chapter', value: invite?.chapters.name ?? '—' },
              { label: 'Your position', value: posSelect === '__custom__' ? (posCustom || 'Custom') : posSelect },
              { label: 'Invite type', value: invite?.email ? 'Personal' : 'Open link' },
            ].map(item => (
              <div
                key={item.label}
                className="flex items-center justify-between bg-[#0D1117] border border-[#21262D] rounded-lg px-4 py-3"
              >
                <span className="text-[#8B949E] text-xs">{item.label}</span>
                <span className="text-white text-sm font-semibold truncate max-w-[160px]" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
