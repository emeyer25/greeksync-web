'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setSubmitting(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setSubmitting(false)
    } else {
      setSent(true)
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
            Reset password
          </h1>
          <p className="text-[#8B949E] text-sm mb-8">We'll send a reset link to your email</p>

          {sent ? (
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-6 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(63, 184, 140, 0.15)', border: '1px solid rgba(63, 184, 140, 0.25)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3FB88C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-white font-semibold mb-1">Check your email</p>
              <p className="text-[#8B949E] text-sm mb-5">
                We sent a reset link to <span className="text-white">{email}</span>. Click it to set a new password.
              </p>
              <Link href="/login" className="text-[#FF6B4A] hover:text-[#E85A3A] text-sm transition-colors">
                ← Back to login
              </Link>
            </div>
          ) : (
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
                  autoFocus
                  autoComplete="email"
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
                disabled={submitting || !email.trim()}
                className="w-full h-10 bg-[#FF6B4A] hover:bg-[#E85A3A] text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-[#8B949E] mt-6">
            <Link href="/login" className="hover:text-white transition-colors">← Back to login</Link>
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
