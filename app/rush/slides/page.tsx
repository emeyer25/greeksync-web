'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import DashboardShell from '@/components/layout/DashboardShell'

type Status = 'Rushing' | 'Bid Extended' | 'Bids Accepted' | 'Dropped'

interface Rushee {
  id: string
  name: string
  hometown: string | null
  notes: string | null
  status: Status
  photo_url: string | null
}

const STATUS_CONFIG: Record<Status, { color: string; bg: string; key: string }> = {
  'Rushing':       { color: 'text-blue-400',  bg: 'bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30',   key: '1' },
  'Bid Extended':  { color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30', key: '2' },
  'Bids Accepted': { color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/40 hover:bg-green-500/30', key: '3' },
  'Dropped':       { color: 'text-red-400',   bg: 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30',       key: '4' },
}

const STATUSES: Status[] = ['Rushing', 'Bid Extended', 'Bids Accepted', 'Dropped']

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-pink-500', 'bg-amber-500',
  'bg-green-500', 'bg-cyan-500', 'bg-orange-500', 'bg-rose-500',
]
function getAvatarColor(name: string) {
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function RushSlidesPage() {
  const { canEdit, loading: authLoading, user, chapterId } = useAuth()
  const [rushees, setRushees] = useState<Rushee[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All')

  useEffect(() => { fetchRushees() }, [chapterId])

  async function fetchRushees() {
    if (!supabase) { setLoading(false); return }
    const query = supabase.from('rushees').select('*').order('created_at', { ascending: true })
    if (chapterId) query.eq('chapter_id', chapterId)
    const { data } = await query
    setRushees((data as Rushee[]) ?? [])
    setLoading(false)
  }

  const displayed = filterStatus === 'All'
    ? rushees
    : rushees.filter(r => r.status === filterStatus)

  const current = displayed[index] ?? null

  const goNext = useCallback(() => setIndex(i => Math.min(i + 1, displayed.length - 1)), [displayed.length])
  const goPrev = useCallback(() => setIndex(i => Math.max(i - 1, 0)), [])

  async function handleStatusChange(status: Status) {
    if (!supabase || !current) return
    setSaving(true)
    await supabase.from('rushees').update({ status }).eq('id', current.id)
    setRushees(prev => prev.map(r => r.id === current.id ? { ...r, status } : r))
    setSaving(false)
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev()
      if (e.key === '1') handleStatusChange('Rushing')
      if (e.key === '2') handleStatusChange('Bid Extended')
      if (e.key === '3') handleStatusChange('Bids Accepted')
      if (e.key === '4') handleStatusChange('Dropped')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, current])

  // Reset index when filter changes
  useEffect(() => { setIndex(0) }, [filterStatus])

  const bg = (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
    </div>
  )

  if (supabase && authLoading) {
    return (
      <DashboardShell>
        <div className="flex flex-1 items-center justify-center min-h-screen">
          {bg}
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-[#FF6B4A] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (supabase && !canEdit) {
    return (
      <DashboardShell>
        <div className="flex flex-1 items-center justify-center min-h-screen px-4">
          {bg}
          <div className="relative text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#8B949E]">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Members Only</h1>
            <Link href="/login" className="btn-primary inline-flex">
              {user ? 'Back to Login' : 'Sign In →'}
            </Link>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="flex flex-col min-h-screen">
      {bg}

      {/* Filter tabs */}
      <div className="relative px-4 mb-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500">Show:</span>
            {(['All', ...STATUSES] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filterStatus === s
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                }`}
              >
                {s} {s !== 'All' && `(${rushees.filter(r => r.status === s).length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slide area */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div className="w-full max-w-3xl">
          {loading ? (
            <div className="text-center text-zinc-500 py-20">Loading...</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-500 text-sm">No rushees to show.</p>
              <Link href="/rush" className="mt-4 inline-block text-violet-400 text-sm hover:text-violet-300 transition-colors">
                ← Back to Rush List
              </Link>
            </div>
          ) : current ? (
            <>
              {/* Progress */}
              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-zinc-500">{index + 1} of {displayed.length}</span>
                <div className="flex gap-1">
                  {displayed.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      className={`h-1 rounded-full transition-all ${
                        i === index ? 'w-6 bg-violet-500' : i < index ? 'w-2 bg-violet-500/30' : 'w-2 bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-zinc-600 text-xs">← → to navigate · 1-4 for status</span>
              </div>

              {/* Main card */}
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
                {/* Photo */}
                <div className="relative h-64 bg-white/5">
                  {current.photo_url ? (
                    <img src={current.photo_url} alt={current.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-white text-7xl font-bold ${getAvatarColor(current.name)}/20`}>
                      <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold text-white ${getAvatarColor(current.name)}`}>
                        {getInitials(current.name)}
                      </div>
                    </div>
                  )}
                  {/* Current status badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_CONFIG[current.status].bg} ${STATUS_CONFIG[current.status].color}`}>
                      {current.status}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-white mb-1">{current.name}</h2>
                  {current.hometown && (
                    <p className="text-zinc-400 text-base mb-3">📍 {current.hometown}</p>
                  )}
                  {current.notes && (
                    <p className="text-zinc-400 text-sm leading-relaxed bg-white/5 rounded-xl px-4 py-3 mb-6">
                      {current.notes}
                    </p>
                  )}

                  {/* Status buttons */}
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-3">Change Status</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {STATUSES.map((s, i) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          disabled={saving}
                          className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${
                            current.status === s
                              ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} ring-2 ring-offset-2 ring-offset-zinc-950 ring-${s === 'Rushing' ? 'blue' : s === 'Bid Extended' ? 'amber' : s === 'Bids Accepted' ? 'green' : 'red'}-500/50`
                              : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span className="text-zinc-600 text-xs mr-1">[{i + 1}]</span>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={goPrev}
                  disabled={index === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all font-medium text-sm"
                >
                  ← Previous
                </button>
                <button
                  onClick={goNext}
                  disabled={index === displayed.length - 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all font-medium text-sm"
                >
                  Next →
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
      </div>
    </DashboardShell>
  )
}
