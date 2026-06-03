'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import DashboardShell from '@/components/layout/DashboardShell'
import { Users, X, ChevronUp, ChevronDown, LayoutGrid, List } from 'lucide-react'

type Status = 'Rushing' | 'Bid Extended' | 'Bids Accepted' | 'Dropped'

interface Rushee {
  id: string
  created_at: string
  name: string
  hometown: string | null
  notes: string | null
  status: Status
  photo_url: string | null
  phone: string | null
}

interface RushEvent {
  id: string
  theme: string
  event_type: string
  date: string
}

const KANBAN_COLUMNS: { status: Status; label: string }[] = [
  { status: 'Rushing',       label: 'New' },
  { status: 'Bid Extended',  label: 'Bid Extended' },
  { status: 'Bids Accepted', label: 'Accepted' },
  { status: 'Dropped',       label: 'Dropped' },
]

const STATUS_BADGE: Record<Status, { bg: string; color: string; label: string }> = {
  'Rushing':       { bg: 'rgba(240,180,41,0.15)',   color: '#F0B429', label: 'New' },
  'Bid Extended':  { bg: 'rgba(255,107,74,0.12)',   color: '#FF6B4A', label: 'Bid Extended' },
  'Bids Accepted': { bg: 'rgba(63,184,140,0.15)',   color: '#3FB88C', label: 'Accepted' },
  'Dropped':       { bg: 'rgba(139,148,158,0.15)',  color: '#8B949E', label: 'Dropped' },
}

const STATUSES: Status[] = ['Rushing', 'Bid Extended', 'Bids Accepted', 'Dropped']

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ rushee, size = 'md' }: { rushee: Rushee; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-lg' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0`}>
      {rushee.photo_url
        ? <img src={rushee.photo_url} alt={rushee.name} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center bg-[rgba(255,107,74,0.15)] text-[#FF6B4A] font-semibold">
            {getInitials(rushee.name)}
          </div>
      }
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const b = STATUS_BADGE[status]
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
      style={{ background: b.bg, color: b.color }}
    >
      {b.label}
    </span>
  )
}

export default function RushPage() {
  const { canEdit, loading: authLoading, user, chapterId, can } = useAuth()
  const canEditRushees = can('rushees_write')
  const [rushees, setRushees] = useState<Rushee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoFileRef = useRef<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showInlineAdd, setShowInlineAdd] = useState(false)

  const [rushEvents, setRushEvents] = useState<RushEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<RushEvent | null>(null)
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set())
  const [contactFilter, setContactFilter] = useState<'all' | 'contacted' | 'not'>('all')
  const [toggling, setToggling] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', hometown: '', notes: '', status: 'Rushing' as Status, phone: '',
  })

  const [editRushee, setEditRushee] = useState<Rushee | null>(null)
  const [editForm, setEditForm] = useState({ name: '', hometown: '', notes: '', phone: '', status: 'Rushing' as Status })
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const editPhotoFileRef = useRef<File | null>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [sortField, setSortField] = useState<'name' | 'status' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchRushees()
    fetchRushEvents()
  }, [chapterId])

  async function fetchRushees() {
    if (!supabase) { setLoading(false); return }
    const query = supabase.from('rushees').select('*').order('created_at', { ascending: false })
    if (chapterId) query.eq('chapter_id', chapterId)
    const { data } = await query
    setRushees((data as Rushee[]) ?? [])
    setLoading(false)
  }

  async function fetchRushEvents() {
    if (!supabase) return
    const query = supabase
      .from('events')
      .select('id, theme, event_type, date')
      .eq('is_rush_event', true)
      .order('date', { ascending: true })
    if (chapterId) query.eq('chapter_id', chapterId)
    const { data } = await query
    setRushEvents((data as RushEvent[]) ?? [])
  }

  async function loadContacts(eventId: string) {
    if (!supabase) return
    const { data } = await supabase
      .from('event_contacts')
      .select('rushee_id')
      .eq('event_id', eventId)
    setContactedIds(new Set((data ?? []).map((r: any) => r.rushee_id as string)))
  }

  async function toggleContact(rusheeId: string) {
    if (!supabase || !selectedEvent) return
    setToggling(rusheeId)
    if (contactedIds.has(rusheeId)) {
      await supabase.from('event_contacts').delete().eq('event_id', selectedEvent.id).eq('rushee_id', rusheeId)
      setContactedIds(prev => { const s = new Set(prev); s.delete(rusheeId); return s })
    } else {
      await supabase.from('event_contacts').insert({ event_id: selectedEvent.id, rushee_id: rusheeId })
      setContactedIds(prev => new Set([...prev, rusheeId]))
    }
    setToggling(null)
  }

  function handleSelectEvent(event: RushEvent) {
    if (selectedEvent?.id === event.id) {
      setSelectedEvent(null); setContactedIds(new Set()); setContactFilter('all')
    } else {
      setSelectedEvent(event); setContactFilter('all'); loadContacts(event.id)
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    photoFileRef.current = file
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    if (!supabase) return null
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('rushee-photos').upload(path, file)
    if (error || !data) return null
    const { data: { publicUrl } } = supabase.storage.from('rushee-photos').getPublicUrl(data.path)
    return publicUrl
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !form.name.trim()) return
    setSaving(true)
    let photo_url: string | null = null
    if (photoFileRef.current) photo_url = await uploadPhoto(photoFileRef.current)
    const { data } = await supabase.from('rushees').insert({
      name: form.name.trim(),
      hometown: form.hometown.trim() || null,
      notes: form.notes.trim() || null,
      phone: form.phone.trim() || null,
      status: form.status,
      photo_url,
      ...(chapterId ? { chapter_id: chapterId } : {}),
    }).select().single()
    if (data) setRushees(prev => [data as Rushee, ...prev])
    setForm({ name: '', hometown: '', notes: '', status: 'Rushing', phone: '' })
    setPhotoPreview(null)
    photoFileRef.current = null
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(false)
    setShowInlineAdd(false)
    setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!supabase) return
    if (!confirm(`Remove ${name} from the rush list?`)) return
    await supabase.from('rushees').delete().eq('id', id)
    setRushees(prev => prev.filter(r => r.id !== id))
  }

  async function handleStatusChange(id: string, status: Status) {
    if (!supabase) return
    await supabase.from('rushees').update({ status }).eq('id', id)
    setRushees(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  function openEdit(r: Rushee) {
    setEditRushee(r)
    setEditForm({ name: r.name, hometown: r.hometown ?? '', notes: r.notes ?? '', phone: r.phone ?? '', status: r.status })
    setEditPhotoPreview(r.photo_url)
    editPhotoFileRef.current = null
  }

  function closeEdit() { setEditRushee(null); setEditPhotoPreview(null); editPhotoFileRef.current = null }

  function handleEditPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    editPhotoFileRef.current = file
    setEditPhotoPreview(URL.createObjectURL(file))
  }

  async function saveEdit() {
    if (!supabase || !editRushee) return
    setSavingEdit(true)
    let photo_url = editRushee.photo_url
    if (editPhotoFileRef.current) photo_url = await uploadPhoto(editPhotoFileRef.current)
    const updates = {
      name: editForm.name.trim() || editRushee.name,
      hometown: editForm.hometown.trim() || null,
      notes: editForm.notes.trim() || null,
      phone: editForm.phone.trim() || null,
      status: editForm.status,
      photo_url,
    }
    await supabase.from('rushees').update(updates).eq('id', editRushee.id)
    setRushees(prev => prev.map(r => r.id === editRushee.id ? { ...r, ...updates } : r))
    closeEdit()
    setSavingEdit(false)
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = rushees
    .filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.hometown ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .filter(r => {
      if (!selectedEvent) return true
      if (contactFilter === 'contacted') return contactedIds.has(r.id)
      if (contactFilter === 'not') return !contactedIds.has(r.id)
      return true
    })

  const tableSorted = [...filtered].sort((a, b) => {
    const aVal = (a[sortField] ?? '') as string
    const bVal = (b[sortField] ?? '') as string
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
  })

  const counts = {
    total: rushees.length,
    bids: rushees.filter(r => r.status === 'Bid Extended').length,
    pledging: rushees.filter(r => r.status === 'Bids Accepted').length,
  }

  // ── Access gates ──────────────────────────────────────────────────────────

  if (supabase && authLoading) {
    return (
      <DashboardShell>
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
          <div className="h-8 w-48 rounded bg-[#21262D] animate-pulse" />
          <div className="h-4 w-32 rounded bg-[#21262D] animate-pulse" />
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[#161B22] animate-pulse" />)}
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (supabase && !canEdit) {
    return (
      <DashboardShell>
        <div className="flex flex-1 items-center justify-center min-h-screen px-4">
          <div className="text-center">
            <Users size={48} strokeWidth={1} className="text-[#8B949E] mx-auto mb-5" />
            <h1 className="text-2xl font-bold text-white mb-2">Members Only</h1>
            <p className="text-[#8B949E] text-sm mb-7 max-w-xs mx-auto">
              {user ? "Your account doesn't have access to this feature." : 'Sign in to manage the rush list.'}
            </p>
            <Link href="/login" className="btn-primary">
              {user ? 'Go Back' : 'Sign In →'}
            </Link>
          </div>
        </div>
      </DashboardShell>
    )
  }

  // ── Page ──────────────────────────────────────────────────────────────────

  return (
    <DashboardShell>
      <div className="max-w-[1200px] mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF6B4A] mb-3">
              Rush Season
            </p>
            <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight">
              Rush Management
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-5">
            {/* View toggle */}
            <div className="flex bg-[#161B22] border border-[#21262D] rounded-lg p-0.5">
              <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                  view === 'kanban' ? 'bg-[#21262D] text-white' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <LayoutGrid size={13} />
                Kanban
              </button>
              <button
                onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                  view === 'table' ? 'bg-[#21262D] text-white' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <List size={13} />
                Table
              </button>
            </div>

            {/* Primary CTA — table view only (kanban has inline add) */}
            {canEditRushees && view === 'table' && (
              <button
                onClick={() => setShowForm(v => !v)}
                className={showForm ? 'btn-ghost' : 'btn-primary'}
              >
                {showForm ? 'Cancel' : '+ Add PNM'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total PNMs',     value: counts.total },
            { label: 'Bids Extended',  value: counts.bids },
            { label: 'Bids Accepted',  value: counts.pledging },
          ].map(stat => (
            <div key={stat.label} className="bg-[#161B22] border border-[#21262D] rounded-xl px-4 py-4 text-center">
              <p className="font-mono text-2xl font-semibold text-white">{stat.value}</p>
              <p className="label mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Rush event contact tracking */}
        {rushEvents.length > 0 && (
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4 mb-6">
            <p className="label mb-3">Rush Events — Contact Tracking</p>
            <div className="flex flex-wrap gap-2">
              {rushEvents.map(event => {
                const isSelected = selectedEvent?.id === event.id
                const date = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                      isSelected
                        ? 'bg-[rgba(255,107,74,0.12)] border-[#FF6B4A] text-[#FF6B4A]'
                        : 'border-[#21262D] text-[#8B949E] hover:border-[#30363D] hover:text-white'
                    }`}
                  >
                    <span>{event.theme}</span>
                    <span className="opacity-60 font-mono">· {date}</span>
                  </button>
                )
              })}
            </div>

            {selectedEvent && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#21262D]">
                <span className="text-xs text-[#8B949E]">Show:</span>
                {(['all', 'not', 'contacted'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setContactFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors duration-150 ${
                      contactFilter === f
                        ? 'text-white font-medium bg-[#21262D]'
                        : 'text-[#8B949E] hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'not' ? 'Not Contacted' : 'Contacted'}
                  </button>
                ))}
                <span className="ml-auto font-mono text-xs text-[#8B949E]">
                  {contactedIds.size} / {rushees.length} contacted
                </span>
              </div>
            )}
          </div>
        )}

        {/* Table view: add form + search */}
        {view === 'table' && (
          <>
            {showForm && canEditRushees && (
              <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-6 mb-6">
                <h3 className="text-[15px] font-semibold text-white mb-5">New PNM</h3>
                <form onSubmit={handleAdd}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    {/* Photo upload */}
                    <div className="md:col-span-2 flex items-center gap-4">
                      <div
                        className="relative w-14 h-14 rounded-full overflow-hidden border border-dashed border-[#30363D] bg-[#21262D] flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-[#FF6B4A]/50 transition-colors duration-200"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {photoPreview
                          ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[#8B949E]">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                            </svg>
                        }
                      </div>
                      <div>
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                          className="text-sm text-[#8B949E] hover:text-white transition-colors duration-200">
                          {photoPreview ? 'Change photo' : 'Upload photo'}
                        </button>
                        <p className="text-[#8B949E]/60 text-xs mt-0.5">Optional · JPG, PNG, WebP</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </div>

                    <div>
                      <label className="label block mb-2">Name</label>
                      <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="First Last" className="field" />
                    </div>
                    <div>
                      <label className="label block mb-2">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="(555) 000-0000" className="field" />
                    </div>
                    <div>
                      <label className="label block mb-2">Hometown</label>
                      <input value={form.hometown} onChange={e => setForm(p => ({ ...p, hometown: e.target.value }))}
                        placeholder="City, State" className="field" />
                    </div>
                    <div>
                      <label className="label block mb-2">Status</label>
                      <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Status }))}
                        className="field">
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="label block mb-2">Notes</label>
                      <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Mutual connections, interests, impressions…"
                        rows={2} className="field resize-none pt-2.5" style={{ height: 'auto' }} />
                    </div>
                  </div>
                  <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary">
                    {saving ? 'Saving…' : 'Add to Rush List'}
                  </button>
                </form>
              </div>
            )}

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name or hometown…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="field"
              />
            </div>
          </>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────── */}
        {loading ? (
          view === 'kanban' ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {KANBAN_COLUMNS.map(col => (
                <div key={col.status} className="flex-shrink-0 w-64 bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#21262D] flex items-center justify-between">
                    <div className="h-3 w-16 rounded bg-[#21262D] animate-pulse" />
                    <div className="h-4 w-6 rounded bg-[#21262D] animate-pulse" />
                  </div>
                  <div className="p-2 space-y-2">
                    {[1,2].map(i => (
                      <div key={i} className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#21262D] animate-pulse flex-shrink-0" />
                          <div className="h-3 w-24 rounded bg-[#21262D] animate-pulse" />
                        </div>
                        <div className="h-2.5 w-32 rounded bg-[#21262D] animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
              <div className="h-10 border-b border-[#21262D] bg-[#161B22]" />
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#21262D]">
                  <div className="w-8 h-8 rounded-full bg-[#21262D] animate-pulse" />
                  <div className="flex-1 h-3 rounded bg-[#21262D] animate-pulse" />
                  <div className="w-20 h-5 rounded bg-[#21262D] animate-pulse" />
                </div>
              ))}
            </div>
          )

        /* ── Kanban view ─────────────────────────────────────────────────── */
        ) : view === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
            {KANBAN_COLUMNS.map(col => {
              const colRushees = filtered.filter(r => r.status === col.status)
              const isNewCol = col.status === 'Rushing'
              return (
                <div key={col.status} className="flex-shrink-0 w-64 bg-[#161B22] border border-[#21262D] rounded-xl flex flex-col">
                  {/* Column header */}
                  <div className="px-4 py-3 border-b border-[#21262D] flex items-center gap-2">
                    <p className="label flex-1">{col.label}</p>
                    <span className="font-mono text-[11px] text-[#8B949E] bg-[#21262D] rounded px-1.5 py-0.5 leading-none">
                      {colRushees.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 80 }}>
                    {colRushees.length === 0 && !isNewCol && (
                      <p className="text-center text-[#8B949E]/50 text-xs py-4">No PNMs</p>
                    )}
                    {colRushees.map(rushee => (
                      <div
                        key={rushee.id}
                        className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3 cursor-pointer hover:border-[#30363D] transition-all duration-200 group"
                        onClick={() => canEditRushees && openEdit(rushee)}
                      >
                        {/* Contact checkbox */}
                        {selectedEvent && (
                          <button
                            onClick={e => { e.stopPropagation(); toggleContact(rushee.id) }}
                            disabled={toggling === rushee.id}
                            className={`mb-2 w-5 h-5 rounded border flex items-center justify-center transition-all duration-150 ${
                              contactedIds.has(rushee.id)
                                ? 'bg-[rgba(255,107,74,0.12)] border-[#FF6B4A] text-[#FF6B4A]'
                                : 'border-[#30363D] text-transparent hover:border-[#8B949E]'
                            }`}
                          >
                            {contactedIds.has(rushee.id) && <span className="text-[9px] font-bold">✓</span>}
                          </button>
                        )}

                        {/* Avatar + name */}
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar rushee={rushee} size="sm" />
                          <span className="text-white text-sm font-semibold leading-tight truncate">{rushee.name}</span>
                        </div>

                        {/* Contact */}
                        {rushee.phone && (
                          <p className="text-[#8B949E] text-xs mb-1">{rushee.phone}</p>
                        )}
                        {rushee.hometown && (
                          <p className="text-[#8B949E] text-xs mb-1">{rushee.hometown}</p>
                        )}

                        {/* Notes preview */}
                        {rushee.notes && (
                          <p className="text-[#8B949E]/70 text-xs mt-1 line-clamp-2 leading-relaxed">{rushee.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Inline quick-add (New column only) */}
                  {isNewCol && canEditRushees && (
                    <div className="p-2 border-t border-[#21262D]">
                      {showInlineAdd ? (
                        <form onSubmit={handleAdd} className="space-y-2">
                          <input
                            autoFocus
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value, status: 'Rushing' }))}
                            placeholder="Name"
                            className="field text-sm h-8 px-2.5"
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="submit"
                              disabled={saving || !form.name.trim()}
                              className="flex-1 h-7 text-xs bg-[#FF6B4A] hover:bg-[#E85A3A] text-white font-medium rounded-md transition-colors disabled:opacity-50"
                            >
                              {saving ? '…' : 'Add'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowInlineAdd(false); setForm(p => ({ ...p, name: '' })) }}
                              className="h-7 px-2 text-xs text-[#8B949E] hover:text-white border border-[#21262D] hover:border-[#30363D] rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowInlineAdd(true)}
                          className="w-full text-left text-xs text-[#8B949E] hover:text-white px-2 py-1.5 rounded-lg hover:bg-[#21262D] transition-colors duration-150"
                        >
                          + Add PNM
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        /* ── Table view ──────────────────────────────────────────────────── */
        ) : tableSorted.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Users size={48} strokeWidth={1} className="text-[#8B949E] mb-5" />
            {rushees.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-white mb-2">No rushees yet</h3>
                <p className="text-[#8B949E] text-sm mb-7">Start tracking potential new members.</p>
                {canEditRushees && (
                  <button onClick={() => setShowForm(true)} className="btn-primary">
                    + Add PNM
                  </button>
                )}
              </>
            ) : (
              <p className="text-[#8B949E] text-sm">No results for that search.</p>
            )}
          </div>
        ) : (
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 px-4 py-2.5 border-b border-[#21262D]">
              {[
                { key: 'name', label: 'Name' },
                { key: null, label: 'Contact' },
                { key: 'status', label: 'Status' },
                { key: null, label: 'Notes' },
                { key: 'created_at', label: 'Added' },
              ].map(col => (
                <button
                  key={col.label}
                  onClick={() => col.key && toggleSort(col.key as any)}
                  className={`text-left label flex items-center gap-1 ${col.key ? 'hover:text-white transition-colors' : ''}`}
                >
                  {col.label}
                  {col.key && sortField === col.key && (
                    sortDir === 'asc'
                      ? <ChevronUp size={11} className="text-[#FF6B4A]" />
                      : <ChevronDown size={11} className="text-[#FF6B4A]" />
                  )}
                </button>
              ))}
            </div>

            {/* Table rows */}
            {tableSorted.map(rushee => (
              <div
                key={rushee.id}
                className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 px-4 py-3 border-b border-[#161B22] hover:bg-[#161B22] items-center cursor-pointer transition-colors duration-150 group"
                onClick={() => canEditRushees && openEdit(rushee)}
                style={{ borderBottomColor: '#21262D' }}
              >
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  {selectedEvent && (
                    <button
                      onClick={e => { e.stopPropagation(); toggleContact(rushee.id) }}
                      disabled={toggling === rushee.id}
                      className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 ${
                        contactedIds.has(rushee.id)
                          ? 'bg-[rgba(255,107,74,0.12)] border-[#FF6B4A] text-[#FF6B4A]'
                          : 'border-[#30363D] text-transparent hover:border-[#8B949E]'
                      }`}
                    >
                      {contactedIds.has(rushee.id) && <span className="text-[8px] font-bold">✓</span>}
                    </button>
                  )}
                  <Avatar rushee={rushee} size="sm" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{rushee.name}</p>
                    {rushee.hometown && <p className="text-[#8B949E] text-xs truncate">{rushee.hometown}</p>}
                  </div>
                </div>

                {/* Contact */}
                <p className="font-mono text-[#8B949E] text-xs truncate">{rushee.phone ?? '—'}</p>

                {/* Status */}
                <div onClick={e => e.stopPropagation()}>
                  <select
                    value={rushee.status}
                    onChange={e => handleStatusChange(rushee.id, e.target.value as Status)}
                    className="bg-transparent border-none text-xs cursor-pointer focus:outline-none appearance-none"
                    style={{ color: STATUS_BADGE[rushee.status].color }}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s} className="bg-[#161B22] text-white">{STATUS_BADGE[s].label}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <p className="text-[#8B949E] text-xs truncate">{rushee.notes ?? '—'}</p>

                {/* Added date */}
                <p className="font-mono text-[#8B949E] text-xs">
                  {new Date(rushee.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Edit slide-over ───────────────────────────────────────────────── */}
      {editRushee && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            style={{ backdropFilter: 'blur(8px)' }}
            onClick={closeEdit}
          />
          <div
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-[#161B22] border-l border-[#21262D] z-50 flex flex-col"
            style={{ transform: 'translateX(0)', transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {/* Slide-over header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
              <p className="label">PNM Detail</p>
              <button
                onClick={closeEdit}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors duration-150"
              >
                <X size={14} />
              </button>
            </div>

            {/* Slide-over body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {/* Photo */}
              <div className="flex flex-col items-center">
                <div
                  className="relative w-16 h-16 rounded-full overflow-hidden border border-[#21262D] flex items-center justify-center cursor-pointer group/photo"
                  onClick={() => editFileInputRef.current?.click()}
                >
                  {editPhotoPreview
                    ? <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center bg-[rgba(255,107,74,0.15)] text-[#FF6B4A] font-semibold text-lg">
                        {getInitials(editRushee.name)}
                      </div>
                  }
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity duration-200 rounded-full">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="mt-2 text-xs text-[#8B949E] hover:text-white transition-colors duration-150"
                >
                  Change photo
                </button>
                <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleEditPhotoChange} className="hidden" />
              </div>

              <div>
                <label className="label block mb-2">Name</label>
                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="field" />
              </div>
              <div>
                <label className="label block mb-2">Phone</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(555) 000-0000" className="field" />
              </div>
              <div>
                <label className="label block mb-2">Hometown</label>
                <input value={editForm.hometown} onChange={e => setEditForm(p => ({ ...p, hometown: e.target.value }))}
                  placeholder="City, State" className="field" />
              </div>
              <div>
                <label className="label block mb-2">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as Status }))}
                  className="field">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-2">Notes</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Mutual connections, interests, impressions…"
                  rows={4} className="field resize-none pt-2.5" style={{ height: 'auto' }} />
              </div>
            </div>

            {/* Slide-over footer */}
            <div className="px-6 py-4 border-t border-[#21262D] space-y-2">
              <button onClick={saveEdit} disabled={savingEdit || !editForm.name.trim()} className="btn-primary w-full">
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => { closeEdit(); handleDelete(editRushee.id, editRushee.name) }}
                className="btn-danger w-full"
              >
                Remove from Rush List
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  )
}
