'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { getInitials } from '@/lib/utils'

type Status = 'Rushing' | 'Bid Extended' | 'Bids Accepted' | 'Dropped'

export interface Rushee {
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

const STATUSES: Status[] = ['Rushing', 'Bid Extended', 'Bids Accepted', 'Dropped']

const STATUS_BADGE: Record<Status, { bg: string; color: string; label: string }> = {
  'Rushing':       { bg: 'rgba(240,180,41,0.15)',   color: '#F0B429', label: 'New' },
  'Bid Extended':  { bg: 'rgba(255,107,74,0.12)',   color: '#FF6B4A', label: 'Bid Extended' },
  'Bids Accepted': { bg: 'rgba(63,184,140,0.15)',   color: '#3FB88C', label: 'Accepted' },
  'Dropped':       { bg: 'rgba(139,148,158,0.15)',  color: '#8B949E', label: 'Dropped' },
}

function StatusBadge({ status }: { status: Status }) {
  const b = STATUS_BADGE[status]
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
      style={{ background: b.bg, color: b.color }}>
      {b.label}
    </span>
  )
}

interface Props {
  rushee: Rushee
  canEditRushees: boolean
  canManageMembers: boolean
  addingToRoster: boolean
  onClose: () => void
  onSave: (updates: Partial<Rushee> & { photo_url: string | null }) => Promise<void>
  onDelete: (id: string, name: string) => Promise<void>
  onAddToRoster: (rushee: Rushee) => Promise<void>
  uploadPhoto: (file: File) => Promise<string | null>
}

export default function RusheeDetailPanel({
  rushee, canEditRushees, canManageMembers, addingToRoster,
  onClose, onSave, onDelete, onAddToRoster, uploadPhoto,
}: Props) {
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    name: rushee.name,
    hometown: rushee.hometown ?? '',
    notes: rushee.notes ?? '',
    phone: rushee.phone ?? '',
    instagram: rushee.instagram ?? '',
    status: rushee.status,
  })
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(rushee.photo_url)
  const editPhotoFileRef = useRef<File | null>(null)
  const editPhotoUrlRef = useRef<string | null>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  // Reset edit state when a different rushee is opened
  useEffect(() => {
    setEditMode(false)
    setEditForm({
      name: rushee.name,
      hometown: rushee.hometown ?? '',
      notes: rushee.notes ?? '',
      phone: rushee.phone ?? '',
      instagram: rushee.instagram ?? '',
      status: rushee.status,
    })
    setEditPhotoPreview(rushee.photo_url)
    editPhotoFileRef.current = null
    editPhotoUrlRef.current = null
  }, [rushee.id])

  function handleEditPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    editPhotoFileRef.current = file
    setEditPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    let photo_url = rushee.photo_url
    if (editPhotoFileRef.current) photo_url = await uploadPhoto(editPhotoFileRef.current)
    else if (editPhotoUrlRef.current) photo_url = editPhotoUrlRef.current
    await onSave({
      name: editForm.name.trim() || rushee.name,
      hometown: editForm.hometown.trim() || null,
      notes: editForm.notes.trim() || null,
      phone: editForm.phone.trim() || null,
      instagram: editForm.instagram.trim() || null,
      status: editForm.status,
      photo_url,
    })
    setEditMode(false)
    setSaving(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" style={{ backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:max-w-sm bg-[#161B22] border-l border-[#21262D] z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
          <p className="label">PNM Detail</p>
          <div className="flex items-center gap-2">
            {canEditRushees && (
              <button
                onClick={() => setEditMode(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  editMode ? 'bg-[#21262D] text-white' : 'text-[#8B949E] hover:text-white hover:bg-[#21262D]'
                }`}
              >
                {editMode ? 'Cancel' : 'Edit'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors duration-150"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {editMode ? (
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
                        {getInitials(rushee.name)}
                      </div>
                  }
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity duration-200 rounded-full">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                </div>
                <button type="button" onClick={() => editFileInputRef.current?.click()}
                  className="mt-2 text-xs text-[#8B949E] hover:text-white transition-colors duration-150">
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
                <input
                  value={editForm.instagram}
                  onChange={e => setEditForm(p => ({ ...p, instagram: e.target.value }))}
                  placeholder="@handle"
                  className="field"
                />
              </div>
              <div>
                <label className="label block mb-2">Hometown</label>
                <input value={editForm.hometown} onChange={e => setEditForm(p => ({ ...p, hometown: e.target.value }))}
                  placeholder="City, State" className="field" />
              </div>
              <div>
                <label className="label block mb-2">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as Status }))} className="field">
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
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden mb-3">
                  {rushee.photo_url
                    ? <img src={rushee.photo_url} alt={rushee.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center bg-[rgba(255,107,74,0.15)] text-[#FF6B4A] font-semibold text-xl">
                        {getInitials(rushee.name)}
                      </div>
                  }
                </div>
                <h2 className="text-xl font-bold text-white">{rushee.name}</h2>
                {rushee.hometown && <p className="text-[#8B949E] text-sm mt-0.5">{rushee.hometown}</p>}
                <div className="mt-3"><StatusBadge status={rushee.status} /></div>
              </div>

              <div className="border-t border-[#21262D]" />

              <div className="space-y-4">
                {rushee.phone && (
                  <div>
                    <p className="label mb-1">Phone</p>
                    <p className="font-mono text-white text-sm">{rushee.phone}</p>
                  </div>
                )}
                {rushee.instagram && (
                  <div>
                    <p className="label mb-1">Instagram</p>
                    <a
                      href={`https://instagram.com/${rushee.instagram.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[#FF6B4A] text-sm hover:underline"
                    >
                      @{rushee.instagram.replace('@', '')}
                    </a>
                  </div>
                )}
                <div>
                  <p className="label mb-1">Added</p>
                  <p className="font-mono text-[#8B949E] text-sm">
                    {new Date(rushee.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                {rushee.notes && (
                  <div>
                    <p className="label mb-1">Notes</p>
                    <p className="text-[#8B949E] text-sm leading-relaxed whitespace-pre-wrap">{rushee.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {editMode ? (
          <div className="px-6 py-4 border-t border-[#21262D] space-y-2">
            <button onClick={handleSave} disabled={saving || !editForm.name.trim()} className="btn-primary w-full">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={() => onDelete(rushee.id, rushee.name)} className="btn-danger w-full">
              Remove from Rush List
            </button>
          </div>
        ) : (canEditRushees || (canManageMembers && rushee.status === 'Bids Accepted')) ? (
          <div className="px-6 py-4 border-t border-[#21262D] space-y-2">
            {canEditRushees && (
              <button onClick={() => setEditMode(true)} className="btn-primary w-full">Edit PNM</button>
            )}
            {canManageMembers && rushee.status === 'Bids Accepted' && (
              <button
                onClick={() => onAddToRoster(rushee)}
                disabled={addingToRoster}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-[#3FB88C] text-[#3FB88C] hover:bg-[#3FB88C]/10 transition-colors disabled:opacity-50"
              >
                {addingToRoster ? 'Adding…' : 'Add to Roster'}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </>
  )
}
