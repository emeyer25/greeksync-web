'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import CalendarView from '@/components/calendar/CalendarView'
import DashboardShell from '@/components/layout/DashboardShell'
import type { SavedEvent } from '@/types/events'

const EVENT_TYPES = [
  'Mixer', 'Date Party / Cocktail', 'Formal', 'Darty',
  'Tailgate', 'Late Night', 'Philanthropy Event',
  'Brotherhood / Sisterhood Event', 'Rush Event', 'Chapter Event',
  'House Party', 'Other',
]

export default function CalendarPage() {
  const { chapterId, can } = useAuth()
  const [events, setEvents] = useState<SavedEvent[]>([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ theme: '', eventType: 'Mixer', date: '', location: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => { loadEvents() }, [chapterId])

  const loadEvents = async () => {
    if (!supabase) { setLoading(false); return }
    const query = supabase.from('events').select('*').order('date', { ascending: true })
    if (chapterId) query.eq('chapter_id', chapterId)
    const { data, error } = await query
    if (error) console.error('Failed to load events:', error.message)
    setEvents((data ?? []) as SavedEvent[])
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !form.theme.trim() || !form.date) return
    setSaving(true)
    setAddError('')
    const { data, error } = await supabase
      .from('events')
      .insert({
        theme: form.theme.trim(),
        event_type: form.eventType,
        date: form.date,
        sections: [],
        generated_content: {},
        is_rush_event: form.eventType === 'Rush Event',
        ...(form.location.trim() ? { location: form.location.trim() } : {}),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(chapterId ? { chapter_id: chapterId } : {}),
      })
      .select()
      .single()
    if (error) {
      setAddError(error.message)
      setSaving(false)
    } else {
      setEvents(prev => [...prev, data as SavedEvent].sort((a, b) => a.date.localeCompare(b.date)))
      setForm({ theme: '', eventType: 'Mixer', date: '', location: '', description: '' })
      setShowAdd(false)
      setSaving(false)
    }
  }

  const canAddEvents = can('calendar_write')

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF6B4A] mb-3">
              Chapter Events
            </p>
            <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight">
              Social Calendar
            </h1>
          </div>
          {canAddEvents && (
            <button
              onClick={() => setShowAdd(v => !v)}
              className={showAdd ? 'btn-ghost mt-5' : 'btn-primary mt-5'}
            >
              {showAdd ? 'Cancel' : '+ New Event'}
            </button>
          )}
        </div>

        {/* Add Event form */}
        {showAdd && canAddEvents && (
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-6 mb-8">
            <h3 className="text-[15px] font-semibold text-white mb-5">New Event</h3>
            <form onSubmit={handleAdd}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="label block mb-2">Event Name</label>
                  <input
                    autoFocus
                    value={form.theme}
                    onChange={e => setForm(p => ({ ...p, theme: e.target.value }))}
                    placeholder="e.g. Neon Jungle Mixer"
                    required
                    className="field"
                  />
                </div>
                <div>
                  <label className="label block mb-2">Type</label>
                  <select
                    value={form.eventType}
                    onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))}
                    className="field"
                  >
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label block mb-2">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    required
                    className="field [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="label block mb-2">
                    Location <span className="normal-case font-normal text-[#8B949E]">— optional</span>
                  </label>
                  <input
                    value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="Chapter House, 123 Greek Row"
                    className="field"
                  />
                </div>
                <div>
                  <label className="label block mb-2">
                    Description <span className="normal-case font-normal text-[#8B949E]">— optional</span>
                  </label>
                  <input
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Dress code, details…"
                    className="field"
                  />
                </div>
              </div>
              {addError && (
                <p className="text-[#E5484D] text-xs border border-[#E5484D]/20 bg-[#E5484D]/5 rounded-lg px-3 py-2 mb-4">
                  {addError}
                </p>
              )}
              <button
                type="submit"
                disabled={saving || !form.theme.trim() || !form.date}
                className="btn-primary"
              >
                {saving ? 'Saving…' : 'Add to Calendar'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {/* Calendar grid skeleton */}
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
              <div className="h-12 border-b border-[#21262D] flex items-center justify-between px-6">
                <div className="w-8 h-8 rounded-lg bg-[#21262D] animate-pulse" />
                <div className="w-32 h-4 rounded bg-[#21262D] animate-pulse" />
                <div className="w-8 h-8 rounded-lg bg-[#21262D] animate-pulse" />
              </div>
              <div className="h-8 border-b border-[#21262D] bg-[#161B22]" />
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="min-h-[72px] border-b border-r border-[#21262D] p-1.5">
                    <div className="w-6 h-6 rounded-full bg-[#21262D] animate-pulse mb-1" />
                  </div>
                ))}
              </div>
            </div>
            {/* Upcoming list skeleton */}
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
              <div className="h-3 w-20 rounded bg-[#21262D] animate-pulse mb-4" />
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-3 py-3">
                  <div className="w-0.5 h-8 rounded-full bg-[#21262D] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-[#21262D] animate-pulse" />
                    <div className="h-2.5 w-1/2 rounded bg-[#21262D] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <CalendarView
            events={events}
            onAddEvent={canAddEvents ? () => { setShowAdd(true); window.scrollTo({ top: 0, behavior: 'smooth' }) } : undefined}
          />
        )}

      </div>
    </DashboardShell>
  )
}
