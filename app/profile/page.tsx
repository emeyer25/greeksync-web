'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import DashboardShell from '@/components/layout/DashboardShell'
import MemberAvatar from '@/components/MemberAvatar'

const PRESET_POSITIONS = [
  'President', 'Vice President', 'Treasurer', 'Secretary',
  'Social Chair', 'Rush Chair', 'Risk Management', 'Philanthropy Chair',
  'Alumni Relations', 'Member',
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function ProfilePage() {
  const { user, member, chapter, signOut, refreshMember } = useAuth()
  const router = useRouter()

  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [editingPos, setEditingPos] = useState(false)
  const [posSelect, setPosSelect] = useState('Member')
  const [posCustom, setPosCustom] = useState('')
  const [savingPos, setSavingPos] = useState(false)

  const [savedField, setSavedField] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const startEditName = () => {
    setNameVal(member?.name ?? '')
    setEditingName(true)
  }

  const saveName = async () => {
    if (!supabase || !member || !nameVal.trim()) return
    setSavingName(true)
    await supabase.from('members').update({ name: nameVal.trim() }).eq('id', member.id)
    await refreshMember()
    setEditingName(false)
    setSavingName(false)
    flashSaved('name')
  }

  const startEditPos = () => {
    const pos = member?.position ?? 'Member'
    if (PRESET_POSITIONS.includes(pos)) {
      setPosSelect(pos); setPosCustom('')
    } else {
      setPosSelect('__custom__'); setPosCustom(pos)
    }
    setEditingPos(true)
  }

  const savePosition = async () => {
    if (!supabase || !member) return
    const position = posSelect === '__custom__' ? posCustom.trim() || 'Member' : posSelect
    setSavingPos(true)
    await supabase.from('members').update({ position }).eq('id', member.id)
    await refreshMember()
    setEditingPos(false)
    setSavingPos(false)
    flashSaved('position')
  }

  const flashSaved = (field: string) => {
    setSavedField(field)
    setTimeout(() => setSavedField(null), 2000)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !supabase || !member) return
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${member.id}-${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('member-photos').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(data.path)
      await supabase.from('members').update({ photo_url: publicUrl }).eq('id', member.id)
      setPhotoPreview(publicUrl)
      await refreshMember()
      flashSaved('photo')
    }
    setUploadingPhoto(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!user || !member) {
    return (
      <DashboardShell>
        <div className="flex flex-1 items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-[#8B949E] text-sm mb-5">Sign in to view your profile.</p>
            <button onClick={() => router.push('/login')} className="btn-primary">Go to Login</button>
          </div>
        </div>
      </DashboardShell>
    )
  }

  const displayName = member.name ?? user.email?.split('@')[0] ?? 'You'

  return (
    <DashboardShell>
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF6B4A] mb-3">
            Account
          </p>
          <h1 className="text-2xl sm:text-[28px] font-bold text-white leading-tight tracking-tight">
            My Account
          </h1>
        </div>

        {/* Avatar block */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <MemberAvatar name={displayName} photoUrl={photoPreview ?? member.photo_url} size={64} />
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-[#0D1117] transition-colors duration-150 hover:bg-[#30363D]"
              style={{ background: '#21262D' }}
              title="Upload photo"
            >
              {uploadingPhoto
                ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <Camera size={13} className="text-[#8B949E]" />
              }
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          {savedField === 'photo' && <p className="text-[#3FB88C] text-xs mb-2">✓ Photo updated</p>}
          <p className="text-white text-lg font-semibold">{displayName}</p>
          <p className="font-mono text-[#8B949E] text-xs mt-1">{user.email}</p>
          {chapter && <p className="text-[#8B949E]/60 text-xs mt-0.5">{chapter.name}</p>}
          {member.role === 'admin' && (
            <span
              className="mt-2 inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
              style={{ background: 'rgba(255,107,74,0.12)', color: '#FF6B4A' }}
            >
              Admin
            </span>
          )}
        </div>

        <div className="space-y-3">

          {/* Name */}
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <label className="label">Name</label>
              {!editingName && (
                <button
                  onClick={startEditName}
                  className="text-[11px] text-[#8B949E] hover:text-white transition-colors duration-150"
                >
                  Edit {savedField === 'name' && <span className="text-[#3FB88C] ml-1">✓</span>}
                </button>
              )}
            </div>
            {editingName ? (
              <div className="mt-2 space-y-2">
                <input
                  autoFocus
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  placeholder="Your full name"
                  className="field"
                />
                <div className="flex gap-2">
                  <button onClick={saveName} disabled={savingName || !nameVal.trim()} className="btn-primary h-8 text-xs px-3">
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingName(false)} className="btn-ghost h-8 text-xs px-3">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-[#8B949E] text-sm mt-0.5">{member.name || '—'}</p>
            )}
          </div>

          {/* Position */}
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <label className="label">Position</label>
              {!editingPos && member.role !== 'admin' && (
                <button
                  onClick={startEditPos}
                  className="text-[11px] text-[#8B949E] hover:text-white transition-colors duration-150"
                >
                  Edit {savedField === 'position' && <span className="text-[#3FB88C] ml-1">✓</span>}
                </button>
              )}
            </div>
            {editingPos ? (
              <div className="mt-2 space-y-2">
                <select value={posSelect} onChange={e => setPosSelect(e.target.value)} className="field">
                  {PRESET_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="__custom__">Other (custom title)…</option>
                </select>
                {posSelect === '__custom__' && (
                  <input value={posCustom} onChange={e => setPosCustom(e.target.value)} placeholder="Enter custom title" className="field" autoFocus />
                )}
                <div className="flex gap-2">
                  <button onClick={savePosition} disabled={savingPos} className="btn-primary h-8 text-xs px-3">
                    {savingPos ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingPos(false)} className="btn-ghost h-8 text-xs px-3">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-[#8B949E] text-sm mt-0.5">{member.position || '—'}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl px-5 py-4">
            <label className="label block mb-1">Email</label>
            <p className="font-mono text-[#8B949E] text-sm mt-0.5">{user.email}</p>
          </div>

          {/* Chapter (read-only) */}
          {chapter && (
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl px-5 py-4">
              <label className="label block mb-1">Chapter</label>
              <p className="text-[#8B949E] text-sm mt-0.5">{chapter.name}</p>
            </div>
          )}

          <div className="h-px bg-[#21262D] my-2" />

          <button
            onClick={handleSignOut}
            className="text-sm text-[#8B949E] hover:text-white transition-colors duration-150 w-full text-center py-2"
          >
            Sign Out
          </button>
        </div>
      </div>
    </DashboardShell>
  )
}
