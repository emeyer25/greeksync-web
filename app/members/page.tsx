'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, type Member } from '@/lib/auth-context'
import DashboardShell from '@/components/layout/DashboardShell'
import { LayoutGrid, List, X, Mail, ChevronUp, ChevronDown } from 'lucide-react'

const PRESET_POSITIONS = [
  'President', 'Vice President', 'Treasurer', 'Secretary',
  'Social Chair', 'Rush Chair', 'Risk Management', 'Philanthropy Chair',
  'Alumni Relations', 'Member',
]

const POSITION_ORDER = [
  'President', 'Vice President', 'Treasurer', 'Secretary',
  'Social Chair', 'Rush Chair', 'Risk Management', 'Philanthropy Chair',
  'Alumni Relations', 'Member',
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

interface PendingInvite {
  id: string
  email: string
  role: string
  position: string | null
  token: string
  created_at: string
  expires_at: string | null
  used_at: string | null
}

const PERMISSION_CHIPS = [
  { key: 'calendar_write', label: 'Social',   desc: 'Can add and edit events' },
  { key: 'rushees_write',  label: 'Rush',     desc: 'Can add and edit rushees' },
  { key: 'members_write',  label: 'Members',  desc: 'Can invite and remove members' },
  { key: 'positions_write',label: 'Titles',   desc: 'Can assign positions to others' },
]

function PositionBadge({ position, role }: { position: string; role: string }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
        style={{ background: 'rgba(255,107,74,0.12)', color: '#FF6B4A' }}>
        Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
      style={{ background: 'rgba(255,107,74,0.12)', color: '#FF6B4A' }}>
      {position}
    </span>
  )
}

export default function MembersPage() {
  const { chapterId, user, can } = useAuth()
  const canManageMembers = can('members_write')
  const canEditPositions = can('positions_write')

  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [search, setSearch] = useState('')
  const [filterPos, setFilterPos] = useState('')
  const [sortField, setSortField] = useState<'name' | 'position'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [panel, setPanel] = useState<'none' | 'add' | 'invite'>('none')
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPosSelect, setAddPosSelect] = useState('Member')
  const [addPosCustom, setAddPosCustom] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invPosSelect, setInvPosSelect] = useState('Member')
  const [invPosCustom, setInvPosCustom] = useState('')
  const [saving, setSaving] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [createdInvite, setCreatedInvite] = useState<PendingInvite | null>(null)

  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [drawerPosSelect, setDrawerPosSelect] = useState('')
  const [drawerPosCustom, setDrawerPosCustom] = useState('')
  const [savingPos, setSavingPos] = useState(false)
  const [savedPos, setSavedPos] = useState(false)

  useEffect(() => { loadData() }, [chapterId])

  const loadData = async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const q = supabase.from('members').select('*').order('created_at')
    if (chapterId) q.eq('chapter_id', chapterId)
    const { data } = await q
    setMembers((data ?? []) as Member[])

    if (chapterId && canManageMembers) {
      const { data: inv } = await supabase
        .from('chapter_invites').select('*').eq('chapter_id', chapterId)
        .is('used_at', null).order('created_at', { ascending: false })
      setInvites((inv ?? []) as PendingInvite[])
    }
    setLoading(false)
  }

  const resolvePos = (sel: string, custom: string) =>
    sel === '__custom__' ? custom.trim() || 'Member' : sel

  const openDrawer = (m: Member) => {
    setSelectedMember(m)
    setSavedPos(false)
    if (PRESET_POSITIONS.includes(m.position)) {
      setDrawerPosSelect(m.position)
      setDrawerPosCustom('')
    } else {
      setDrawerPosSelect('__custom__')
      setDrawerPosCustom(m.position)
    }
  }

  const closeDrawer = () => setSelectedMember(null)

  const addMember = async () => {
    if (!supabase || !addName.trim()) return
    setSaving(true)
    const ins: Record<string, unknown> = {
      name: addName.trim(),
      position: resolvePos(addPosSelect, addPosCustom),
      email: addEmail.trim() || null,
      role: 'member',
    }
    if (chapterId) ins.chapter_id = chapterId
    const { data, error } = await supabase.from('members').insert(ins).select().single()
    if (!error && data) {
      setMembers(prev => [...prev, data as Member])
      setAddName(''); setAddEmail('')
      setAddPosSelect('Member'); setAddPosCustom('')
      setPanel('none')
    }
    setSaving(false)
  }

  const sendInvite = async () => {
    if (!supabase || !user) return
    if (!chapterId) { setInviteError('No chapter found. Try signing out and back in.'); return }
    setSaving(true)
    setInviteError('')
    const { data, error } = await supabase
      .from('chapter_invites')
      .insert({
        chapter_id: chapterId,
        email: inviteEmail.trim().toLowerCase(),
        role: 'member',
        position: resolvePos(invPosSelect, invPosCustom),
        invited_by: user.id,
      })
      .select().single()
    if (error) {
      setInviteError(error.message)
    } else if (data) {
      setInvites(prev => [data as PendingInvite, ...prev])
      setCreatedInvite(data as PendingInvite)
    }
    setSaving(false)
  }

  const closeInviteModal = () => {
    setPanel('none')
    setCreatedInvite(null)
    setInviteEmail('')
    setInvPosSelect('Member')
    setInvPosCustom('')
    setInviteError('')
  }

  const revokeInvite = async (id: string) => {
    if (!supabase) return
    await supabase.from('chapter_invites').delete().eq('id', id)
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const deleteMember = async (id: string) => {
    if (!supabase) return
    await supabase.from('members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
    closeDrawer()
  }

  const togglePermission = async (id: string, perm: string, current: string[]) => {
    if (!supabase) return
    const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm]
    await supabase.from('members').update({ permissions: updated }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, permissions: updated } : m))
    if (selectedMember?.id === id) setSelectedMember(prev => prev ? { ...prev, permissions: updated } : null)
  }

  const savePosition = async () => {
    if (!supabase || !selectedMember) return
    setSavingPos(true)
    const position = resolvePos(drawerPosSelect, drawerPosCustom)
    await supabase.from('members').update({ position }).eq('id', selectedMember.id)
    setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, position } : m))
    setSelectedMember(prev => prev ? { ...prev, position } : null)
    setSavingPos(false)
    setSavedPos(true)
    setTimeout(() => setSavedPos(false), 2000)
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1
    if (b.role === 'admin' && a.role !== 'admin') return 1
    const ai = POSITION_ORDER.indexOf(a.position)
    const bi = POSITION_ORDER.indexOf(b.position)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name)
  })

  const filteredMembers = sortedMembers.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchPos = !filterPos || m.position === filterPos
    return matchSearch && matchPos
  })

  const tableSorted = view === 'table'
    ? [...filteredMembers].sort((a, b) => {
        const aVal = (a[sortField] ?? '') as string
        const bVal = (b[sortField] ?? '') as string
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    : filteredMembers

  const PositionSelector = ({ sel, setSel, custom, setCustom }: {
    sel: string; setSel: (v: string) => void; custom: string; setCustom: (v: string) => void
  }) => (
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

  // ── Page ──────────────────────────────────────────────────────────────────

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF6B4A] mb-3">
              Brotherhood
            </p>
            <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight">
              Chapter Roster
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-5">
            {/* View toggle */}
            <div className="flex bg-[#161B22] border border-[#21262D] rounded-lg p-0.5">
              <button
                onClick={() => setView('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                  view === 'grid' ? 'bg-[#21262D] text-white' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <LayoutGrid size={13} /> Grid
              </button>
              <button
                onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                  view === 'table' ? 'bg-[#21262D] text-white' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <List size={13} /> Table
              </button>
            </div>

            {canManageMembers && (
              <>
                <button
                  onClick={() => { setPanel(panel === 'invite' ? 'none' : 'invite'); setCreatedInvite(null) }}
                  className="btn-ghost"
                >
                  Invite Member
                </button>
                <button
                  onClick={() => setPanel(panel === 'add' ? 'none' : 'add')}
                  className={panel === 'add' ? 'btn-ghost' : 'btn-primary'}
                >
                  {panel === 'add' ? 'Cancel' : '+ Add Member'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Search members…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field flex-1"
          />
          <select
            value={filterPos}
            onChange={e => setFilterPos(e.target.value)}
            className="field w-48"
          >
            <option value="">All Positions</option>
            {PRESET_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Add member form */}
        {panel === 'add' && canManageMembers && (
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-6 mb-6">
            <h3 className="text-[15px] font-semibold text-white mb-5">Add Member Directly</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="label block mb-2">Name</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Full name" className="field" autoFocus />
              </div>
              <div>
                <label className="label block mb-2">Position</label>
                <PositionSelector sel={addPosSelect} setSel={setAddPosSelect} custom={addPosCustom} setCustom={setAddPosCustom} />
              </div>
              <div>
                <label className="label block mb-2">
                  Email <span className="normal-case font-normal text-[#8B949E]">— optional</span>
                </label>
                <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="member@chapter.com" className="field" />
              </div>
            </div>
            <button onClick={addMember} disabled={saving || !addName.trim()} className="btn-primary">
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[#161B22] border border-[#21262D] rounded-xl p-5 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#21262D] animate-pulse" />
                  <div className="h-4 w-24 rounded bg-[#21262D] animate-pulse" />
                  <div className="h-5 w-16 rounded bg-[#21262D] animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
              <div className="h-10 border-b border-[#21262D]" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#21262D]">
                  <div className="w-8 h-8 rounded-full bg-[#21262D] animate-pulse" />
                  <div className="flex-1 h-3 rounded bg-[#21262D] animate-pulse" />
                  <div className="w-20 h-5 rounded bg-[#21262D] animate-pulse" />
                </div>
              ))}
            </div>
          )

        /* ── Grid view ───────────────────────────────────────────────────── */
        ) : view === 'grid' ? (
          <>
            {filteredMembers.length === 0 && invites.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#8B949E] text-sm">
                  {members.length === 0
                    ? canManageMembers ? 'No members yet. Add one or send an invite.' : 'No members have been added yet.'
                    : 'No members match that search.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => openDrawer(m)}
                    className="bg-[#161B22] border border-[#21262D] rounded-xl p-5 flex flex-col items-center text-center hover:border-[#30363D] transition-all duration-200 group"
                    style={{ transform: 'translateY(0)' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    {/* 64px avatar */}
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-[#FF6B4A] font-semibold text-lg mb-4 flex-shrink-0"
                      style={{ background: 'rgba(255,107,74,0.15)' }}>
                      {getInitials(m.name)}
                    </div>
                    {/* Name (h3) */}
                    <p className="text-white text-[15px] font-semibold leading-tight w-full truncate">{m.name}</p>
                    {/* Position badge */}
                    <span className="mt-2 inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium max-w-full truncate"
                      style={{ background: 'rgba(255,107,74,0.12)', color: '#FF6B4A' }}>
                      {m.role === 'admin' ? 'Admin' : m.position}
                    </span>
                  </button>
                ))}

                {/* Pending invite ghost cards */}
                {canManageMembers && invites.map(inv => (
                  <div
                    key={inv.id}
                    className="bg-transparent border border-dashed border-[#21262D] rounded-xl p-5 flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 rounded-full border border-dashed border-[#21262D] flex items-center justify-center mb-4 flex-shrink-0">
                      <Mail size={20} className="text-[#8B949E]" />
                    </div>
                    <p className="text-[#8B949E] text-[13px] font-medium w-full truncate">{inv.email}</p>
                    <p className="text-[#8B949E]/60 text-xs mt-1">{inv.position ?? 'Member'}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => copyInviteLink(inv.token)}
                        className={`text-xs transition-colors duration-150 ${
                          copiedToken === inv.token ? 'text-[#3FB88C]' : 'text-[#8B949E] hover:text-white'
                        }`}
                      >
                        {copiedToken === inv.token ? '✓ Copied' : 'Copy Link'}
                      </button>
                      <span className="text-[#21262D]">·</span>
                      <button
                        onClick={() => revokeInvite(inv.id)}
                        className="text-xs text-[#8B949E] hover:text-[#E5484D] transition-colors duration-150"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>

        /* ── Table view ──────────────────────────────────────────────────── */
        ) : (
          <>
            {tableSorted.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#8B949E] text-sm">No members match that search.</p>
              </div>
            ) : (
              <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-4 px-4 py-2.5 border-b border-[#21262D]">
                  {[
                    { key: 'name',     label: 'Name' },
                    { key: 'position', label: 'Position' },
                    { key: null,       label: 'Email' },
                    { key: null,       label: 'Added' },
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

                {/* Rows */}
                {tableSorted.map(m => (
                  <div
                    key={m.id}
                    onClick={() => openDrawer(m)}
                    className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-4 px-4 py-3 border-b border-[#21262D] hover:bg-[#21262D]/40 items-center cursor-pointer transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#FF6B4A] text-xs font-semibold flex-shrink-0"
                        style={{ background: 'rgba(255,107,74,0.15)' }}>
                        {getInitials(m.name)}
                      </div>
                      <p className="text-white text-sm font-medium truncate">{m.name}</p>
                    </div>
                    <div>
                      <PositionBadge position={m.position} role={m.role} />
                    </div>
                    <p className="font-mono text-[#8B949E] text-xs truncate">{m.email ?? '—'}</p>
                    <p className="font-mono text-[#8B949E] text-xs">
                      {new Date((m as any).created_at ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))}

                {/* Pending invites in table */}
                {canManageMembers && invites.map(inv => (
                  <div key={inv.id} className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-4 px-4 py-3 border-b border-[#21262D] items-center opacity-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full border border-dashed border-[#21262D] flex items-center justify-center flex-shrink-0">
                        <Mail size={12} className="text-[#8B949E]" />
                      </div>
                      <p className="text-[#8B949E] text-sm truncate">{inv.email}</p>
                    </div>
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: 'rgba(240,180,41,0.15)', color: '#F0B429' }}>
                      Pending
                    </span>
                    <p className="font-mono text-[#8B949E] text-xs">{inv.position ?? 'Member'}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyInviteLink(inv.token)}
                        className={`text-xs transition-colors ${copiedToken === inv.token ? 'text-[#3FB88C]' : 'text-[#8B949E] hover:text-white'}`}
                      >
                        {copiedToken === inv.token ? '✓' : 'Copy'}
                      </button>
                      <button onClick={() => revokeInvite(inv.id)} className="text-xs text-[#8B949E] hover:text-[#E5484D] transition-colors">
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Invite modal ─────────────────────────────────────────────────── */}
      {panel === 'invite' && canManageMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeInviteModal() }}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
            style={{ animation: 'modalIn 200ms ease-out' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
              <h2 className="text-[15px] font-semibold text-white">Invite Member</h2>
              <button onClick={closeInviteModal}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors">
                <X size={14} />
              </button>
            </div>

            {createdInvite ? (
              /* ── Link created state ── */
              <div className="px-6 py-6 space-y-5">
                <div className="flex flex-col items-center text-center gap-2 py-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                    style={{ background: 'rgba(63,184,140,0.12)' }}>
                    <Mail size={18} className="text-[#3FB88C]" />
                  </div>
                  <p className="text-white text-[15px] font-semibold">Invite link created</p>
                  <p className="text-[#8B949E] text-sm">Share this link with the new member.</p>
                </div>

                {/* Link copy row */}
                <div className="flex items-center gap-2 bg-[#0D1117] border border-[#21262D] rounded-lg px-3 py-2.5">
                  <p className="flex-1 font-mono text-[12px] text-[#8B949E] truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}/join/${createdInvite.token}` : `/join/${createdInvite.token}`}
                  </p>
                  <button
                    onClick={() => copyInviteLink(createdInvite.token)}
                    className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-md border transition-all duration-150 ${
                      copiedToken === createdInvite.token
                        ? 'border-[#3FB88C]/30 bg-[rgba(63,184,140,0.08)] text-[#3FB88C]'
                        : 'border-[#21262D] text-[#8B949E] hover:text-white hover:border-[#30363D]'
                    }`}
                  >
                    {copiedToken === createdInvite.token ? '✓ Copied' : 'Copy'}
                  </button>
                </div>

                {createdInvite.email && (
                  <p className="text-[#8B949E] text-xs text-center">
                    Invite for <span className="text-white font-mono">{createdInvite.email}</span> · {createdInvite.position ?? 'Member'}
                  </p>
                )}
                {!createdInvite.email && (
                  <p className="text-[#8B949E] text-xs text-center">
                    Position: {createdInvite.position ?? 'Member'}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setCreatedInvite(null); setInviteEmail(''); setInvPosSelect('Member'); setInvPosCustom('') }}
                    className="flex-1 btn-ghost"
                  >
                    Invite Another
                  </button>
                  <button onClick={closeInviteModal} className="flex-1 btn-primary">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* ── Form state ── */
              <div className="px-6 py-6 space-y-4">
                <p className="text-[#8B949E] text-sm">Generate a link for someone to create their account and join the chapter.</p>
                <div>
                  <label className="label block mb-2">Position</label>
                  <PositionSelector sel={invPosSelect} setSel={setInvPosSelect} custom={invPosCustom} setCustom={setInvPosCustom} />
                </div>
                <div>
                  <label className="label block mb-2">Email</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="member@chapter.com" className="field" autoFocus />
                </div>
                {inviteError && (
                  <p className="text-[#E5484D] text-xs border border-[#E5484D]/20 bg-[#E5484D]/5 rounded-lg px-3 py-2">{inviteError}</p>
                )}
                <button onClick={sendInvite} disabled={saving || !inviteEmail.trim()} className="btn-primary w-full">
                  {saving ? 'Creating…' : 'Generate Invite Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Member detail modal ───────────────────────────────────────────── */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeDrawer() }}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ animation: 'modalIn 200ms ease-out' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D] flex-shrink-0">
              <p className="label">Member Details</p>
              <button onClick={closeDrawer}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-[#FF6B4A] font-semibold text-xl mb-4"
                  style={{ background: 'rgba(255,107,74,0.15)' }}>
                  {getInitials(selectedMember.name)}
                </div>
                <p className="text-white text-lg font-semibold">{selectedMember.name}</p>
                {selectedMember.email && (
                  <p className="font-mono text-[#8B949E] text-xs mt-1">{selectedMember.email}</p>
                )}
                <div className="mt-2">
                  <PositionBadge position={selectedMember.position} role={selectedMember.role} />
                </div>
              </div>

              <div className="h-px bg-[#21262D]" />

              {/* Position editor */}
              {canEditPositions && selectedMember.role !== 'admin' ? (
                <div>
                  <label className="label block mb-2">Position</label>
                  <PositionSelector sel={drawerPosSelect} setSel={setDrawerPosSelect} custom={drawerPosCustom} setCustom={setDrawerPosCustom} />
                  {(drawerPosSelect !== (PRESET_POSITIONS.includes(selectedMember.position) ? selectedMember.position : '__custom__') ||
                    (drawerPosSelect === '__custom__' && drawerPosCustom !== selectedMember.position)) && (
                    <button
                      onClick={savePosition}
                      disabled={savingPos}
                      className={`mt-2 w-full h-10 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                        savedPos
                          ? 'border border-[#3FB88C]/30 text-[#3FB88C]'
                          : 'btn-primary'
                      }`}
                    >
                      {savingPos ? 'Saving…' : savedPos ? '✓ Saved' : 'Save Position'}
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <label className="label block mb-1">Position</label>
                  <p className="text-[#8B949E] text-sm">{selectedMember.position}</p>
                </div>
              )}

              {/* Privileges */}
              {canManageMembers && selectedMember.role !== 'admin' && (
                <div className="space-y-4">
                  <div>
                    <label className="label block mb-3">Privileges</label>
                    <div className="space-y-2">
                      {PERMISSION_CHIPS.filter(c => c.key === 'calendar_write' || c.key === 'rushees_write').map(({ key, label, desc }) => {
                        const perms = selectedMember.permissions ?? []
                        const active = perms.includes(key)
                        return (
                          <button
                            key={key}
                            onClick={() => togglePermission(selectedMember.id, key, perms)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-150 ${
                              active
                                ? 'border-[#FF6B4A]/20 bg-[rgba(255,107,74,0.06)]'
                                : 'border-[#21262D] hover:border-[#30363D]'
                            }`}
                          >
                            <div className="text-left">
                              <p className="text-sm text-white font-medium">{label} Privileges</p>
                              <p className={`text-xs mt-0.5 ${active ? 'text-[#FF6B4A]/70' : 'text-[#8B949E]'}`}>{desc}</p>
                            </div>
                            <div className={`w-8 h-4 rounded-full transition-all duration-200 flex-shrink-0 relative ${active ? 'bg-[#FF6B4A]' : 'bg-[#21262D]'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${active ? 'left-4' : 'left-0.5'}`} />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="label block mb-3">Admin Privileges</label>
                    <div className="space-y-2">
                      {PERMISSION_CHIPS.filter(c => c.key === 'members_write' || c.key === 'positions_write').map(({ key, label, desc }) => {
                        const perms = selectedMember.permissions ?? []
                        const active = perms.includes(key)
                        return (
                          <button
                            key={key}
                            onClick={() => togglePermission(selectedMember.id, key, perms)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-150 ${
                              active
                                ? 'border-[#FF6B4A]/20 bg-[rgba(255,107,74,0.06)]'
                                : 'border-[#21262D] hover:border-[#30363D]'
                            }`}
                          >
                            <div className="text-left">
                              <p className="text-sm text-white font-medium">{label}</p>
                              <p className={`text-xs mt-0.5 ${active ? 'text-[#FF6B4A]/70' : 'text-[#8B949E]'}`}>{desc}</p>
                            </div>
                            <div className={`w-8 h-4 rounded-full transition-all duration-200 flex-shrink-0 relative ${active ? 'bg-[#FF6B4A]' : 'bg-[#21262D]'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${active ? 'left-4' : 'left-0.5'}`} />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {selectedMember.role === 'admin' && (
                <p className="text-[#8B949E] text-xs text-center">Admins have full access to everything.</p>
              )}
            </div>

            {/* Modal footer */}
            {canManageMembers && selectedMember.role !== 'admin' && (
              <div className="px-6 py-4 border-t border-[#21262D] flex-shrink-0">
                <button
                  onClick={() => { if (confirm(`Remove ${selectedMember.name} from the chapter?`)) deleteMember(selectedMember.id) }}
                  className="btn-danger w-full"
                >
                  Remove from Chapter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </DashboardShell>
  )
}
