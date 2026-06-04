'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import DashboardShell from '@/components/layout/DashboardShell'
import { Users, X, ChevronUp, ChevronDown } from 'lucide-react'

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
  instagram: string | null
}

interface RushEvent {
  id: string
  theme: string
  event_type: string
  date: string
}

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
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoFileRef = useRef<File | null>(null)
  const photoUrlRef = useRef<string | null>(null) // URL from Instagram import
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rushEvents, setRushEvents] = useState<RushEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<RushEvent | null>(null)
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set())
  const [contactFilter, setContactFilter] = useState<'all' | 'contacted' | 'not'>('all')
  const [toggling, setToggling] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', hometown: '', notes: '', status: 'Rushing' as Status, phone: '', instagram: '',
  })
  const [igImporting, setIgImporting] = useState(false)
  const [igImportError, setIgImportError] = useState<string | null>(null)

  const [selectedRushee, setSelectedRushee] = useState<Rushee | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', hometown: '', notes: '', phone: '', instagram: '', status: 'Rushing' as Status })
  const [editIgImporting, setEditIgImporting] = useState(false)
  const [editIgImportError, setEditIgImportError] = useState<string | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const editPhotoFileRef = useRef<File | null>(null)
  const editPhotoUrlRef = useRef<string | null>(null) // URL from Instagram import
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

  function compressToDataURL(file: File, maxPx = 400, quality = 0.82): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = url
    })
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    // Try Supabase Storage first; fall back to compressed base64 if bucket isn't set up
    if (supabase) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('rushee-photos').upload(path, file)
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('rushee-photos').getPublicUrl(data.path)
        return publicUrl
      }
      console.warn('[uploadPhoto] Storage upload failed, falling back to base64:', JSON.stringify(error))
    }
    try {
      return await compressToDataURL(file)
    } catch (e) {
      console.error('[uploadPhoto] base64 fallback failed:', e)
      return null
    }
  }

  async function importInstagram(
    handle: string,
    setError: (e: string | null) => void,
    setImporting: (v: boolean) => void,
    onSuccess: (data: { name?: string | null; photoUrl?: string | null }) => void,
  ) {
    const username = handle.replace('@', '').trim()
    if (!username) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch(`/api/instagram?username=${encodeURIComponent(username)}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Could not load profile'); return }
      onSuccess(json)
    } catch {
      setError('Network error')
    } finally {
      setImporting(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !form.name.trim()) return
    setSaving(true)
    let photo_url: string | null = null
    if (photoFileRef.current) photo_url = await uploadPhoto(photoFileRef.current)
    else if (photoUrlRef.current) photo_url = photoUrlRef.current
    const { data } = await supabase.from('rushees').insert({
      name: form.name.trim(),
      hometown: form.hometown.trim() || null,
      notes: form.notes.trim() || null,
      phone: form.phone.trim() || null,
      instagram: form.instagram.trim() || null,
      status: form.status,
      photo_url,
      ...(chapterId ? { chapter_id: chapterId } : {}),
    }).select().single()
    if (data) setRushees(prev => [data as Rushee, ...prev])
    setForm({ name: '', hometown: '', notes: '', status: 'Rushing', phone: '', instagram: '' })
    setPhotoPreview(null)
    photoFileRef.current = null
    photoUrlRef.current = null
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!supabase) return
    if (!confirm(`Remove ${name} from the rush list?`)) return
    await supabase.from('rushees').delete().eq('id', id)
    setRushees(prev => prev.filter(r => r.id !== id))
    closePanel()
  }

  async function handleStatusChange(id: string, status: Status) {
    if (!supabase) return
    await supabase.from('rushees').update({ status }).eq('id', id)
    setRushees(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  function openPanel(r: Rushee) {
    setSelectedRushee(r)
    setEditMode(false)
    setEditForm({ name: r.name, hometown: r.hometown ?? '', notes: r.notes ?? '', phone: r.phone ?? '', instagram: r.instagram ?? '', status: r.status })
    setEditPhotoPreview(r.photo_url)
    editPhotoFileRef.current = null
  }

  function closePanel() {
    setSelectedRushee(null)
    setEditMode(false)
    setEditPhotoPreview(null)
    editPhotoFileRef.current = null
    editPhotoUrlRef.current = null
  }

  function handleEditPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    editPhotoFileRef.current = file
    setEditPhotoPreview(URL.createObjectURL(file))
  }

  async function saveEdit() {
    if (!supabase || !selectedRushee) return
    setSavingEdit(true)
    let photo_url = selectedRushee.photo_url
    if (editPhotoFileRef.current) photo_url = await uploadPhoto(editPhotoFileRef.current)
    else if (editPhotoUrlRef.current) photo_url = editPhotoUrlRef.current
    const updates = {
      name: editForm.name.trim() || selectedRushee.name,
      hometown: editForm.hometown.trim() || null,
      notes: editForm.notes.trim() || null,
      phone: editForm.phone.trim() || null,
      instagram: editForm.instagram.trim() || null,
      status: editForm.status,
      photo_url,
    }
    await supabase.from('rushees').update(updates).eq('id', selectedRushee.id)
    setRushees(prev => prev.map(r => r.id === selectedRushee.id ? { ...r, ...updates } : r))
    setSelectedRushee(prev => prev ? { ...prev, ...updates } : null)
    setEditMode(false)
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
          {canEditRushees && (
            <div className="mt-5">
              <button
                onClick={() => setShowForm(v => !v)}
                className={showForm ? 'btn-ghost' : 'btn-primary'}
              >
                {showForm ? 'Cancel' : '+ Add PNM'}
              </button>
            </div>
          )}
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

        {/* Add form */}
        {showForm && canEditRushees && (
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-6 mb-6">
            <h3 className="text-[15px] font-semibold text-white mb-5">New PNM</h3>
            <form onSubmit={handleAdd}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
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
                  <label className="label block mb-2">Instagram</label>
                  <div className="flex gap-2">
                    <input
                      value={form.instagram}
                      onChange={e => { setForm(p => ({ ...p, instagram: e.target.value })); setIgImportError(null) }}
                      placeholder="@handle"
                      className="field flex-1"
                    />
                    <button
                      type="button"
                      disabled={igImporting || !form.instagram.trim()}
                      onClick={() => importInstagram(
                        form.instagram,
                        setIgImportError,
                        setIgImporting,
                        ({ name, photoUrl }) => {
                          if (name && !form.name.trim()) setForm(p => ({ ...p, name }))
                          if (photoUrl && !photoPreview) {
                            setPhotoPreview(photoUrl)
                            photoUrlRef.current = photoUrl
                          }
                        },
                      )}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-[rgba(255,107,74,0.12)] text-[#FF6B4A] border border-[rgba(255,107,74,0.2)] hover:bg-[rgba(255,107,74,0.2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap"
                    >
                      {igImporting ? 'Loading…' : 'Import'}
                    </button>
                  </div>
                  {igImportError && <p className="text-xs text-red-400 mt-1">{igImportError}</p>}
                  <p className="text-[#8B949E]/60 text-xs mt-1">Import fills in name and profile photo from a public account.</p>
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

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or hometown…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field"
          />
        </div>

        {/* Loading skeleton */}
        {loading ? (
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
                className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 px-4 py-3 border-b border-[#21262D] hover:bg-[#1C2128] items-center cursor-pointer transition-colors duration-150"
                onClick={() => openPanel(rushee)}
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
                <StatusBadge status={rushee.status} />

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

      {/* Detail / edit panel */}
      {selectedRushee && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            style={{ backdropFilter: 'blur(8px)' }}
            onClick={closePanel}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-[#161B22] border-l border-[#21262D] z-50 flex flex-col">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
              <p className="label">PNM Detail</p>
              <div className="flex items-center gap-2">
                {canEditRushees && (
                  <button
                    onClick={() => setEditMode(v => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                      editMode
                        ? 'bg-[#21262D] text-white'
                        : 'text-[#8B949E] hover:text-white hover:bg-[#21262D]'
                    }`}
                  >
                    {editMode ? 'Cancel' : 'Edit'}
                  </button>
                )}
                <button
                  onClick={closePanel}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors duration-150"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {editMode ? (
                /* Edit form */
                <div className="space-y-5">
                  {/* Photo */}
                  <div className="flex flex-col items-center">
                    <div
                      className="relative w-20 h-20 rounded-full overflow-hidden border border-[#21262D] flex items-center justify-center cursor-pointer group/photo"
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      {editPhotoPreview
                        ? <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center bg-[rgba(255,107,74,0.15)] text-[#FF6B4A] font-semibold text-xl">
                            {getInitials(selectedRushee.name)}
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
                    <label className="label block mb-2">Instagram</label>
                    <div className="flex gap-2">
                      <input
                        value={editForm.instagram}
                        onChange={e => { setEditForm(p => ({ ...p, instagram: e.target.value })); setEditIgImportError(null) }}
                        placeholder="@handle"
                        className="field flex-1"
                      />
                      <button
                        type="button"
                        disabled={editIgImporting || !editForm.instagram.trim()}
                        onClick={() => importInstagram(
                          editForm.instagram,
                          setEditIgImportError,
                          setEditIgImporting,
                          ({ name, photoUrl }) => {
                            if (name && !editForm.name.trim()) setEditForm(p => ({ ...p, name }))
                            if (photoUrl && !editPhotoPreview) {
                            setEditPhotoPreview(photoUrl)
                            editPhotoUrlRef.current = photoUrl
                          }
                          },
                        )}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-[rgba(255,107,74,0.12)] text-[#FF6B4A] border border-[rgba(255,107,74,0.2)] hover:bg-[rgba(255,107,74,0.2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap"
                      >
                        {editIgImporting ? 'Loading…' : 'Import'}
                      </button>
                    </div>
                    {editIgImportError && <p className="text-xs text-red-400 mt-1">{editIgImportError}</p>}
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
              ) : (
                /* Read-only view */
                <div className="space-y-6">
                  {/* Avatar + name */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-3">
                      {selectedRushee.photo_url
                        ? <img src={selectedRushee.photo_url} alt={selectedRushee.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center bg-[rgba(255,107,74,0.15)] text-[#FF6B4A] font-semibold text-xl">
                            {getInitials(selectedRushee.name)}
                          </div>
                      }
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedRushee.name}</h2>
                    {selectedRushee.hometown && (
                      <p className="text-[#8B949E] text-sm mt-0.5">{selectedRushee.hometown}</p>
                    )}
                    <div className="mt-3">
                      <StatusBadge status={selectedRushee.status} />
                    </div>
                  </div>

                  <div className="border-t border-[#21262D]" />

                  {/* Details */}
                  <div className="space-y-4">
                    {selectedRushee.phone && (
                      <div>
                        <p className="label mb-1">Phone</p>
                        <p className="font-mono text-white text-sm">{selectedRushee.phone}</p>
                      </div>
                    )}
                    {selectedRushee.instagram && (
                      <div>
                        <p className="label mb-1">Instagram</p>
                        <a
                          href={`https://instagram.com/${selectedRushee.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FF6B4A] text-sm hover:underline"
                        >
                          @{selectedRushee.instagram.replace('@', '')}
                        </a>
                      </div>
                    )}
                    <div>
                      <p className="label mb-1">Added</p>
                      <p className="font-mono text-[#8B949E] text-sm">
                        {new Date(selectedRushee.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    {selectedRushee.notes && (
                      <div>
                        <p className="label mb-1">Notes</p>
                        <p className="text-[#8B949E] text-sm leading-relaxed whitespace-pre-wrap">{selectedRushee.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Panel footer */}
            {editMode ? (
              <div className="px-6 py-4 border-t border-[#21262D] space-y-2">
                <button onClick={saveEdit} disabled={savingEdit || !editForm.name.trim()} className="btn-primary w-full">
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => handleDelete(selectedRushee.id, selectedRushee.name)}
                  className="btn-danger w-full"
                >
                  Remove from Rush List
                </button>
              </div>
            ) : canEditRushees ? (
              <div className="px-6 py-4 border-t border-[#21262D]">
                <button onClick={() => setEditMode(true)} className="btn-primary w-full">
                  Edit PNM
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </DashboardShell>
  )
}
