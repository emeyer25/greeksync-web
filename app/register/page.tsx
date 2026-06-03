'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

const inputCls =
  'w-full bg-[#0D1117] border border-[#21262D] rounded-lg px-3 h-10 text-white placeholder-[#8B949E] text-sm focus:outline-none focus:border-[#FF6B4A] transition-all'

export default function RegisterPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)
  const [chapterName, setChapterName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [posSelect, setPosSelect] = useState('President')
  const [posCustom, setPosCustom] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slugManual) setSlug(slugify(chapterName))
  }, [chapterName, slugManual])

  useEffect(() => {
    if (!loading && user) router.replace('/calendar')
  }, [user, loading, router])

  if (loading) return null

  if (!supabase) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-4">
        <p className="text-[#8B949E] text-sm">Supabase is not configured.</p>
      </div>
    )
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setSubmitting(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw new Error(authError.message)
      const authUser = authData.user
      if (!authUser) throw new Error('Could not create account. Please try again.')

      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .insert({ name: chapterName.trim(), slug: slug.trim(), created_by: authUser.id })
        .select()
        .single()
      if (chapterError) throw new Error(chapterError.message)

      const position = posSelect === '__custom__' ? (posCustom.trim() || 'President') : posSelect
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          name: name.trim(),
          email: email.trim(),
          position,
          role: 'admin',
          chapter_id: chapterData.id,
          user_id: authUser.id,
        })
      if (memberError) throw new Error(memberError.message)

      router.replace('/calendar')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">

          <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B4A] flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L4 14h7l-1 8 10-12h-7L13 2z" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm tracking-tight">GreekSync</span>
          </Link>

          <h1
            className="text-[28px] font-bold text-white leading-tight mb-1"
            style={{ fontFamily: 'var(--font-satoshi, sans-serif)' }}
          >
            Create Your Chapter
          </h1>
          <p className="text-[#8B949E] text-sm mb-8">Set up GreekSync for your organization</p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {([1, 2] as const).map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${
                  step === s
                    ? 'bg-[#FF6B4A] text-white'
                    : step > s
                    ? 'text-[#FF6B4A]'
                    : 'bg-[#21262D] text-[#8B949E]'
                }`}
                  style={step > s ? { background: 'rgba(255,107,74,0.15)' } : undefined}
                >
                  {step > s ? '✓' : s}
                </div>
                {s < 2 && (
                  <div
                    className="w-8 h-px transition-colors"
                    style={{ background: step > s ? 'rgba(255,107,74,0.3)' : '#21262D' }}
                  />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em] mb-2">
                  Chapter Name
                </label>
                <input
                  value={chapterName}
                  onChange={e => setChapterName(e.target.value)}
                  placeholder="Alpha Beta Gamma at State U"
                  autoFocus
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em] mb-2">
                  URL Slug
                </label>
                <div className="flex items-center w-full bg-[#0D1117] border border-[#21262D] rounded-lg px-3 h-10 focus-within:border-[#FF6B4A] transition-all">
                  <span className="text-[#8B949E] text-xs flex-shrink-0 whitespace-nowrap pr-1">greeksync.com/</span>
                  <input
                    value={slug}
                    onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
                    placeholder="alpha-beta-gamma"
                    className="flex-1 bg-transparent text-white text-sm placeholder-[#8B949E] focus:outline-none min-w-0"
                  />
                </div>
                <p className="text-[#8B949E] text-[11px] mt-1.5">Lowercase, numbers, hyphens only</p>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!chapterName.trim() || !slug.trim()}
                className="w-full h-10 bg-[#FF6B4A] hover:bg-[#E85A3A] text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em] mb-2">
                  Your Name
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em] mb-2">
                  Your Position
                </label>
                <select
                  value={posSelect}
                  onChange={e => setPosSelect(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#21262D] rounded-lg px-3 h-10 text-white text-sm focus:outline-none focus:border-[#FF6B4A] transition-all"
                >
                  {['President', 'Vice President', 'Treasurer', 'Secretary', 'Social Chair', 'Rush Chair',
                    'Risk Management', 'Philanthropy Chair', 'Alumni Relations', 'Member'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="__custom__">Other (custom title)…</option>
                </select>
                {posSelect === '__custom__' && (
                  <input
                    value={posCustom}
                    onChange={e => setPosCustom(e.target.value)}
                    placeholder="Enter your title"
                    className={`${inputCls} mt-2`}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@chapter.com"
                  required
                  autoComplete="email"
                  className={inputCls}
                />
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
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg text-xs text-[#E5484D] border"
                  style={{ background: 'rgba(229,72,77,0.08)', borderColor: 'rgba(229,72,77,0.2)' }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-10 px-4 bg-transparent border border-[#21262D] hover:border-[#30363D] text-[#8B949E] hover:text-white font-medium text-sm rounded-lg transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !email.trim() || !password}
                  className="flex-1 h-10 bg-[#FF6B4A] hover:bg-[#E85A3A] text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {submitting ? 'Creating…' : 'Create Chapter'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-[#8B949E] mt-6">
            Already registered?{' '}
            <Link href="/login" className="text-white hover:text-[#FF6B4A] transition-colors">
              Sign in →
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
            Everything your<br />chapter needs.
          </h2>
          <p className="text-[#8B949E] text-sm">Calendar. Rush. Roster. One platform.</p>

          <div className="mt-10 space-y-3 text-left">
            {[
              { label: 'Events this semester', value: '24' },
              { label: 'Active members', value: '48' },
              { label: 'PNMs in pipeline', value: '17' },
            ].map(item => (
              <div
                key={item.label}
                className="flex items-center justify-between bg-[#0D1117] border border-[#21262D] rounded-lg px-4 py-3"
              >
                <span className="text-[#8B949E] text-xs">{item.label}</span>
                <span
                  className="text-white text-sm font-semibold"
                  style={{ fontFamily: 'var(--font-mono, monospace)' }}
                >
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
