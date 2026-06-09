'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import DashboardShell from '@/components/layout/DashboardShell'
import type { SavedEvent } from '@/types/events'

const EVENT_TYPES = [
  'Mixer', 'Date Party / Cocktail', 'Formal', 'Darty',
  'Tailgate', 'Late Night', 'Philanthropy Event',
  'Brotherhood / Sisterhood Event', 'Rush Event', 'Chapter Event',
  'House Party', 'Other',
]

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { member, user, can } = useAuth()
  const canEdit = can('calendar_write')

  const [event, setEvent] = useState<SavedEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [myRsvp, setMyRsvp] = useState<'going' | 'not_going' | null>(null)
  const [goingCount, setGoingCount] = useState(0)
  const [rsvpLoading, setRsvpLoading] = useState(false)

  const [editingField, setEditingField] = useState<'location' | 'description' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingField, setSavingField] = useState(false)

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ theme: '', eventType: '', date: '' })
  const [savingHeader, setSavingHeader] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingFlyer, setUploadingFlyer] = useState(false)
  const [flyerError, setFlyerError] = useState('')

  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadEvent() }, [id])

  const loadEvent = async () => {
    if (!supabase) { setLoading(false); return }
    const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
    if (error || !data) { setNotFound(true); setLoading(false); return }
    setEvent(data as SavedEvent)

    const { data: rsvps } = await supabase.from('event_rsvp').select('member_id, status').eq('event_id', id)
    if (rsvps) {
      setGoingCount(rsvps.filter((r: any) => r.status === 'going').length)
      if (member) {
        const mine = rsvps.find((r: any) => r.member_id === member.id)
        setMyRsvp(mine?.status ?? null)
      }
    }
    setLoading(false)
  }

  const handleRsvp = async (status: 'going' | 'not_going') => {
    if (!supabase || !member) return
    setRsvpLoading(true)
    if (myRsvp === status) {
      await supabase.from('event_rsvp').delete().eq('event_id', id).eq('member_id', member.id)
      setMyRsvp(null)
      if (status === 'going') setGoingCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('event_rsvp').upsert(
        { event_id: id, member_id: member.id, status },
        { onConflict: 'event_id,member_id' }
      )
      if (myRsvp === 'going') setGoingCount(c => Math.max(0, c - 1))
      else if (status === 'going') setGoingCount(c => c + 1)
      setMyRsvp(status)
    }
    setRsvpLoading(false)
  }

  const startEdit = (field: 'location' | 'description') => {
    setEditingField(field)
    setEditValue(event?.[field] ?? '')
  }

  const saveField = async () => {
    if (!supabase || !event || !editingField) return
    setSavingField(true)
    const val = editValue.trim() || null
    await supabase.from('events').update({ [editingField]: val }).eq('id', id)
    setEvent(prev => prev ? { ...prev, [editingField!]: val } : null)
    setEditingField(null)
    setSavingField(false)
  }

  const startEditHeader = () => {
    if (!event) return
    setHeaderForm({ theme: event.theme, eventType: event.event_type, date: event.date })
    setEditingHeader(true)
  }

  const saveHeader = async () => {
    if (!supabase || !event || !headerForm.theme.trim() || !headerForm.date) return
    setSavingHeader(true)
    const updates = {
      theme: headerForm.theme.trim(),
      event_type: headerForm.eventType,
      date: headerForm.date,
      is_rush_event: headerForm.eventType === 'Rush Event',
    }
    await supabase.from('events').update(updates).eq('id', id)
    setEvent(prev => prev ? { ...prev, ...updates } : null)
    setEditingHeader(false)
    setSavingHeader(false)
  }

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !supabase || !event) return
    setUploadingFlyer(true)
    setFlyerError('')
    const ext = file.name.split('.').pop()
    const path = `${event.chapter_id ?? 'global'}/${id}/flyer.${ext}`
    const { error: upErr } = await supabase.storage.from('event-flyers').upload(path, file, { upsert: true })
    if (upErr) {
      setFlyerError(
        upErr.message.toLowerCase().includes('security') || upErr.message.toLowerCase().includes('policy') || upErr.statusCode === '403' || upErr.statusCode === '401'
          ? "You don't have permission to upload a flyer for this event."
          : 'Upload failed. Please try again.'
      )
      setUploadingFlyer(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('event-flyers').getPublicUrl(path)
    await supabase.from('events').update({ flyer_url: publicUrl }).eq('id', id)
    setEvent(prev => prev ? { ...prev, flyer_url: publicUrl } : null)
    setUploadingFlyer(false)
  }

  const removeFlyer = async () => {
    if (!supabase || !event) return
    await supabase.from('events').update({ flyer_url: null }).eq('id', id)
    setEvent(prev => prev ? { ...prev, flyer_url: null } : null)
  }

  const deleteEvent = async () => {
    if (!supabase || !event) return
    if (!confirm(`Delete "${event.theme}"? This cannot be undone.`)) return
    setDeleting(true)
    await supabase.from('events').delete().eq('id', id)
    router.replace('/calendar')
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex flex-1 items-center justify-center min-h-screen">
          <div className="w-1 h-8 bg-gold/30 rounded-full animate-pulse" />
        </div>
      </DashboardShell>
    )
  }

  if (notFound || !event) {
    return (
      <DashboardShell>
        <div className="flex flex-1 items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="font-sans text-cream/40 mb-5">Event not found.</p>
            <Link href="/calendar" className="font-sans text-cream/50 hover:text-cream/80 text-sm transition-colors">
              ← Back to Calendar
            </Link>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Back */}
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 font-sans text-cream/35 hover:text-cream/70 text-sm transition-colors duration-200 mb-8"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Social Calendar
        </Link>

        {/* Header */}
        <div className="mb-8">
          {editingHeader ? (
            <div className="card p-5 space-y-4">
              <div>
                <label className="label block mb-2">Event Name</label>
                <input
                  autoFocus
                  value={headerForm.theme}
                  onChange={e => setHeaderForm(p => ({ ...p, theme: e.target.value }))}
                  className="field"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label block mb-2">Type</label>
                  <select
                    value={headerForm.eventType}
                    onChange={e => setHeaderForm(p => ({ ...p, eventType: e.target.value }))}
                    className="field bg-[#0D1B2A]"
                  >
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label block mb-2">Date</label>
                  <input
                    type="date"
                    value={headerForm.date}
                    onChange={e => setHeaderForm(p => ({ ...p, date: e.target.value }))}
                    className="field [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveHeader}
                  disabled={savingHeader || !headerForm.theme.trim() || !headerForm.date}
                  className="btn-primary"
                >
                  {savingHeader ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingHeader(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="group/header">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-sans text-cream/40 text-sm">{event.event_type}</span>
                <span className="text-cream/20">·</span>
                <span className="font-sans text-cream/40 text-sm">{formatDate(event.date)}</span>
                {canEdit && (
                  <button
                    onClick={startEditHeader}
                    className="font-sans text-[11px] text-cream/25 hover:text-cream/60 transition-colors duration-200 opacity-0 group-hover/header:opacity-100"
                  >
                    Edit
                  </button>
                )}
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl text-cream font-semibold tracking-wide leading-tight">{event.theme}</h1>
            </div>
          )}
        </div>

        {/* Flyer */}
        <div className="mb-6">
          {event.flyer_url ? (
            <div className="relative rounded-lg overflow-hidden border border-[#C9A84C]/[0.14] group">
              <img src={event.flyer_url} alt="Event flyer" className="w-full object-contain max-h-[480px] bg-navy/50" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-end justify-end p-4 gap-2 opacity-0 group-hover:opacity-100">
                <a
                  href={event.flyer_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-xs px-3 py-1.5"
                >
                  Download
                </a>
                {canEdit && (
                  <button onClick={removeFlyer} className="btn-danger text-xs px-3 py-1.5">Remove</button>
                )}
              </div>
            </div>
          ) : canEdit ? (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingFlyer}
              className="w-full border border-dashed border-[#C9A84C]/20 rounded-lg py-10 flex flex-col items-center gap-3 text-cream/30 hover:border-[#C9A84C]/40 hover:text-cream/60 transition-all duration-200"
            >
              {uploadingFlyer ? (
                <div className="w-1 h-6 bg-gold/30 rounded-full animate-pulse" />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="font-sans text-sm">Upload Flyer</span>
                  <span className="font-sans text-xs text-cream/25">PNG, JPG, or PDF</span>
                </>
              )}
            </button>
          ) : null}
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFlyerUpload} />
          {flyerError && <p className="font-sans text-burgundy-light text-xs mt-2">{flyerError}</p>}
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          {/* Location */}
          <div className="card px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <label className="label">Location</label>
              {canEdit && editingField !== 'location' && (
                <button onClick={() => startEdit('location')} className="font-sans text-[11px] text-cream/30 hover:text-cream/60 transition-colors duration-200">
                  {event.location ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>
            {editingField === 'location' ? (
              <div className="mt-2 space-y-2">
                <input
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="Chapter House, 123 Greek Row"
                  className="field"
                />
                <div className="flex gap-2">
                  <button onClick={saveField} disabled={savingField} className="btn-primary text-xs px-3 py-1.5">
                    {savingField ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingField(null)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
                </div>
              </div>
            ) : (
              <p className={`font-sans text-sm mt-0.5 ${event.location ? 'text-cream/70' : 'text-cream/25 italic'}`}>
                {event.location || (canEdit ? 'No location set' : '—')}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="card px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <label className="label">Description</label>
              {canEdit && editingField !== 'description' && (
                <button onClick={() => startEdit('description')} className="font-sans text-[11px] text-cream/30 hover:text-cream/60 transition-colors duration-200">
                  {event.description ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>
            {editingField === 'description' ? (
              <div className="mt-2 space-y-2">
                <textarea
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="Dress code, details members should know…"
                  rows={4}
                  className="field resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={saveField} disabled={savingField} className="btn-primary text-xs px-3 py-1.5">
                    {savingField ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingField(null)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
                </div>
              </div>
            ) : (
              <p className={`font-sans text-sm mt-0.5 whitespace-pre-wrap ${event.description ? 'text-cream/70' : 'text-cream/25 italic'}`}>
                {event.description || (canEdit ? 'No description yet' : '—')}
              </p>
            )}
          </div>
        </div>

        {/* RSVP */}
        {user && member ? (
          <div className="card px-5 py-4 mb-6">
            <p className="label mb-3">Are you going?</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleRsvp('going')}
                disabled={rsvpLoading}
                className={`flex-1 py-2.5 rounded font-sans text-sm font-medium border transition-all duration-200 ${
                  myRsvp === 'going'
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : 'border-[#C9A84C]/[0.14] text-cream/40 hover:text-cream/70 hover:border-[#C9A84C]/30'
                }`}
              >
                ✓ Going
              </button>
              <button
                onClick={() => handleRsvp('not_going')}
                disabled={rsvpLoading}
                className={`flex-1 py-2.5 rounded font-sans text-sm font-medium border transition-all duration-200 ${
                  myRsvp === 'not_going'
                    ? 'border-burgundy/30 bg-burgundy/10 text-burgundy-light'
                    : 'border-[#C9A84C]/[0.14] text-cream/40 hover:text-cream/70 hover:border-[#C9A84C]/30'
                }`}
              >
                ✕ Can't Make It
              </button>
            </div>
            {goingCount > 0 && (
              <p className="font-sans text-cream/25 text-xs mt-2">{goingCount} {goingCount === 1 ? 'member' : 'members'} going</p>
            )}
          </div>
        ) : (
          <div className="card px-5 py-4 mb-6">
            <p className="font-sans text-cream/35 text-sm">
              <Link href="/login" className="text-cream/60 hover:text-cream/90 transition-colors">Sign in</Link> to RSVP
            </p>
          </div>
        )}

        {/* Delete */}
        {canEdit && (
          <button
            onClick={deleteEvent}
            disabled={deleting}
            className="btn-danger w-full"
          >
            {deleting ? 'Deleting…' : 'Delete Event'}
          </button>
        )}
      </div>
    </DashboardShell>
  )
}
