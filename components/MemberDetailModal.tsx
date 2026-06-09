'use client'

import { useState, useRef } from 'react'
import { X, Crown, Lock, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/lib/auth-context'
import MemberAvatar from './MemberAvatar'

// ── Constants ─────────────────────────────────────────────────────────────────

export const PRESET_POSITIONS = [
  'President', 'Vice President', 'Treasurer', 'Secretary',
  'Social Chair', 'Rush Chair', 'Risk Management', 'Philanthropy Chair',
  'Alumni Relations', 'Member', 'Not Initiated',
]

const PERMISSION_CHIPS = [
  { key: 'calendar_write', label: 'Social',   desc: 'Can add and edit events',            section: 'privileges' },
  { key: 'rushees_write',  label: 'Rush',     desc: 'Can add and edit rushees',           section: 'privileges' },
  { key: 'members_write',  label: 'Members',  desc: 'Can invite and remove members',      section: 'admin' },
  { key: 'positions_write',label: 'Titles',   desc: 'Can assign positions to others',     section: 'admin' },
]

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  member: [],
  editor: ['calendar_write', 'rushees_write'],
  admin:  ['calendar_write', 'rushees_write', 'members_write', 'positions_write'],
}

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  admin:  { bg: 'rgba(255,107,74,0.12)',  color: '#FF6B4A' },
  editor: { bg: 'rgba(240,180,41,0.15)',  color: '#F0B429' },
  member: { bg: 'rgba(139,148,158,0.15)', color: '#8B949E' },
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', editor: 'Officer', member: 'Member',
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, sub }: { message: string; sub?: string }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 flex flex-col items-center gap-0.5 px-4 py-3 rounded-xl border border-[#3FB88C]/30 text-center"
      style={{ background: 'rgba(13,17,23,0.96)', animation: 'modalIn 200ms ease-out' }}
    >
      <p className="text-[#3FB88C] text-sm font-medium">{message}</p>
      {sub && <p className="text-[#8B949E] text-xs">{sub}</p>}
    </div>
  )
}

// ── PositionSelector ─────────────────────────────────────────────────────────

function PositionSelector({ sel, setSel, custom, setCustom }: {
  sel: string; setSel: (v: string) => void; custom: string; setCustom: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <select value={sel} onChange={e => setSel(e.target.value)} className="field">
        {PRESET_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="__custom__">Other (custom title)…</option>
      </select>
      {sel === '__custom__' && (
        <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Enter custom title" className="field" autoFocus />
      )}
    </div>
  )
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────

function ToggleRow({
  label, desc, active, locked, onClick,
}: {
  label: string; desc: string; active: boolean; locked?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-150 ${
        active ? 'border-[#FF6B4A]/20 bg-[rgba(255,107,74,0.06)]' : 'border-[#21262D] hover:border-[#30363D]'
      } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="text-left">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-white font-medium">{label}</p>
          {locked && <Lock size={10} className="text-[#8B949E]" />}
        </div>
        <p className={`text-xs mt-0.5 ${active ? 'text-[#FF6B4A]/70' : 'text-[#8B949E]'}`}>{desc}</p>
      </div>
      <div className={`w-8 h-4 rounded-full transition-all duration-200 flex-shrink-0 relative ${active ? 'bg-[#FF6B4A]' : 'bg-[#21262D]'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${active ? 'left-4' : 'left-0.5'}`} />
      </div>
    </button>
  )
}

// ── MemberDetailModal ─────────────────────────────────────────────────────────

interface Props {
  member: Member
  onClose: () => void
  onUpdate: (updated: Member) => void
  onDelete?: (id: string) => void
  canEditPositions: boolean
  canManageMembers: boolean
  canUploadPhoto?: boolean
  showRoleEditor?: boolean
  superAdminUserId?: string | null
  currentUserIsSuperAdmin?: boolean
}

export default function MemberDetailModal({
  member,
  onClose,
  onUpdate,
  onDelete,
  canEditPositions,
  canManageMembers,
  canUploadPhoto = false,
  showRoleEditor = false,
  superAdminUserId,
  currentUserIsSuperAdmin = false,
}: Props) {
  const isSuperAdminRow = member.user_id === superAdminUserId && !!superAdminUserId

  // ── Local state ────────────────────────────────────────────────────────────

  const initialPosSelect = PRESET_POSITIONS.includes(member.position) ? member.position : '__custom__'
  const initialPosCustom = PRESET_POSITIONS.includes(member.position) ? '' : member.position

  const [posSelect, setPosSelect]   = useState(initialPosSelect)
  const [posCustom, setPosCustom]   = useState(initialPosCustom)
  const [savingPos, setSavingPos]   = useState(false)

  const [localRole, setLocalRole]         = useState<Member['role']>(member.role)
  const [localPerms, setLocalPerms]       = useState<string[]>(member.permissions ?? [])
  const [savingRole, setSavingRole]       = useState(false)

  const [photoPreview, setPhotoPreview]   = useState<string | null>(member.photo_url ?? null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [toast, setToast] = useState<{ message: string; sub?: string } | null>(null)

  const showToast = (message: string, sub?: string) => {
    setToast({ message, sub })
    setTimeout(() => setToast(null), 2500)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const resolvePos = () => posSelect === '__custom__' ? posCustom.trim() || 'Member' : posSelect

  const posChanged = posSelect !== initialPosSelect || (posSelect === '__custom__' && posCustom !== initialPosCustom)

  const isAdminRole = localRole === 'admin'
  const allPermsLocked = isSuperAdminRow || isAdminRole

  // ── Save Position ──────────────────────────────────────────────────────────

  const savePosition = async () => {
    if (!supabase) return
    setSavingPos(true)
    const position = resolvePos()
    await supabase.from('members').update({ position }).eq('id', member.id)
    const updated = { ...member, position, role: localRole, permissions: localPerms }
    onUpdate(updated)
    setSavingPos(false)
    showToast('✓ Position saved')
  }

  // ── Role change + privilege sync ───────────────────────────────────────────

  const handleRoleChange = async (newRole: Member['role']) => {
    if (!supabase) return
    setSavingRole(true)
    const newPerms = ROLE_DEFAULT_PERMISSIONS[newRole] ?? []
    await supabase.from('members').update({ role: newRole, permissions: newPerms }).eq('id', member.id)
    setLocalRole(newRole)
    setLocalPerms(newPerms)
    const updated = { ...member, role: newRole, permissions: newPerms }
    onUpdate(updated)
    setSavingRole(false)
    showToast('✓ Role updated', `Privileges updated to match ${ROLE_LABEL[newRole]} defaults`)
  }

  // ── Toggle permission ──────────────────────────────────────────────────────

  const togglePermission = async (perm: string) => {
    if (!supabase || allPermsLocked) return
    const updated = localPerms.includes(perm)
      ? localPerms.filter(p => p !== perm)
      : [...localPerms, perm]
    await supabase.from('members').update({ permissions: updated }).eq('id', member.id)
    setLocalPerms(updated)
    onUpdate({ ...member, role: localRole, permissions: updated })
    showToast('✓ Privileges saved')
  }

  // ── Photo upload ───────────────────────────────────────────────────────────

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !supabase) return
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${member.id}-${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('member-photos').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(data.path)
      await supabase.from('members').update({ photo_url: publicUrl }).eq('id', member.id)
      setPhotoPreview(publicUrl)
      onUpdate({ ...member, photo_url: publicUrl, role: localRole, permissions: localPerms })
      showToast('✓ Photo updated')
    } else {
      showToast('Upload failed')
    }
    setUploadingPhoto(false)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    if (!onDelete) return
    if (confirm(`Remove ${member.name} from the chapter?`)) onDelete(member.id)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const privilegeChips  = PERMISSION_CHIPS.filter(c => c.section === 'privileges')
  const adminChips      = PERMISSION_CHIPS.filter(c => c.section === 'admin')

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        <div
          className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
          style={{ animation: 'modalIn 200ms ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D] flex-shrink-0">
            <div className="flex items-center gap-2">
              <p className="label">Member Details</p>
              {isSuperAdminRow && <Crown size={13} className="text-[#FF6B4A]" />}
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 group">
                <MemberAvatar name={member.name} photoUrl={photoPreview} size={64} />
                {canUploadPhoto && (
                  <>
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-[#161B22] transition-colors duration-150"
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
                  </>
                )}
              </div>
              <p className="text-white text-lg font-semibold">{member.name}</p>
              {member.email && (
                <p className="font-mono text-[#8B949E] text-xs mt-1">{member.email}</p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: ROLE_BADGE[localRole]?.bg ?? 'rgba(139,148,158,0.15)', color: ROLE_BADGE[localRole]?.color ?? '#8B949E' }}
                >
                  {localRole === 'admin' ? 'Admin' : member.position}
                </span>
                {isSuperAdminRow && (
                  <span className="text-[#FF6B4A] text-[11px] font-medium">· Super Admin</span>
                )}
              </div>
            </div>

            <div className="h-px bg-[#21262D]" />

            {/* Role editor (Settings page only) */}
            {showRoleEditor && (
              <div>
                <label className="label block mb-2">Role</label>
                {isSuperAdminRow && !currentUserIsSuperAdmin ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#21262D] text-[#8B949E] text-sm">
                    <span style={{ color: ROLE_BADGE['admin'].color }}>{ROLE_LABEL['admin']}</span>
                    <Lock size={11} className="text-[#8B949E]" />
                    <span className="text-xs ml-1">Super Admin — cannot be changed here</span>
                  </div>
                ) : (
                  <select
                    value={localRole}
                    onChange={e => handleRoleChange(e.target.value as Member['role'])}
                    disabled={savingRole}
                    className="field"
                    style={{ color: ROLE_BADGE[localRole]?.color ?? '#8B949E' }}
                  >
                    <option value="admin"  className="text-white bg-[#161B22]">Admin</option>
                    <option value="editor" className="text-white bg-[#161B22]">Officer</option>
                    <option value="member" className="text-white bg-[#161B22]">Member</option>
                  </select>
                )}
                {savingRole && <p className="text-[#8B949E] text-xs mt-1">Updating…</p>}
              </div>
            )}

            {/* Position editor */}
            {canEditPositions && !isAdminRole ? (
              <div>
                <label className="label block mb-2">Position</label>
                <PositionSelector sel={posSelect} setSel={setPosSelect} custom={posCustom} setCustom={setPosCustom} />
                {posChanged && (
                  <button
                    onClick={savePosition}
                    disabled={savingPos}
                    className="mt-2 w-full btn-primary disabled:opacity-50"
                  >
                    {savingPos ? 'Saving…' : 'Save Position'}
                  </button>
                )}
              </div>
            ) : (
              <div>
                <label className="label block mb-1">Position</label>
                <p className="text-[#8B949E] text-sm">{member.position}</p>
              </div>
            )}

            {/* Privileges */}
            {canManageMembers && (
              <div className="space-y-4">
                {isAdminRole ? (
                  <p className="text-[#8B949E] text-xs text-center">
                    {isSuperAdminRow ? 'Super Admins have full access to everything and cannot be restricted.' : 'Admins have full access to everything.'}
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="label block mb-3">Privileges</label>
                      <div className="space-y-2">
                        {privilegeChips.map(({ key, label, desc }) => (
                          <ToggleRow
                            key={key}
                            label={`${label} Privileges`}
                            desc={desc}
                            active={localPerms.includes(key)}
                            locked={allPermsLocked}
                            onClick={() => togglePermission(key)}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label block mb-3">Admin Privileges</label>
                      <div className="space-y-2">
                        {adminChips.map(({ key, label, desc }) => (
                          <ToggleRow
                            key={key}
                            label={label}
                            desc={desc}
                            active={localPerms.includes(key)}
                            locked={allPermsLocked}
                            onClick={() => togglePermission(key)}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer — delete button (Roster only) */}
          {onDelete && canManageMembers && !isAdminRole && (
            <div className="px-6 py-4 border-t border-[#21262D] flex-shrink-0">
              <button onClick={handleDelete} className="btn-danger w-full">
                Remove from Chapter
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} sub={toast.sub} />}
    </>
  )
}
