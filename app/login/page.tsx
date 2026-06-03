'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const { signIn, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/calendar')
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
      setSubmitting(false)
    } else {
      router.replace('/calendar')
    }
  }

  if (loading) return null

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
            Welcome back
          </h1>
          <p className="text-[#8B949E] text-sm mb-8">Sign in to your chapter</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full bg-[#0D1117] border border-[#21262D] rounded-lg px-3 h-10 text-white placeholder-[#8B949E] text-sm focus:outline-none focus:border-[#FF6B4A] transition-all"
                style={{ '--tw-ring-color': 'rgba(255,107,74,0.15)' } as React.CSSProperties}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-[0.05em]">
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs text-[#8B949E] hover:text-white transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-[#0D1117] border border-[#21262D] rounded-lg px-3 h-10 text-white placeholder-[#8B949E] text-sm focus:outline-none focus:border-[#FF6B4A] transition-all"
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
              disabled={submitting}
              className="w-full h-10 bg-[#FF6B4A] hover:bg-[#E85A3A] text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#21262D]" />
            <span className="text-xs text-[#8B949E]">or</span>
            <div className="flex-1 h-px bg-[#21262D]" />
          </div>

          {/* Google — UI only */}
          <button
            type="button"
            className="w-full h-10 bg-transparent border border-[#21262D] hover:border-[#30363D] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-[#8B949E] mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-white hover:text-[#FF6B4A] transition-colors">
              Create one →
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
            Run your chapter<br />like a pro.
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
                <span className="text-white text-sm font-semibold" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
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
