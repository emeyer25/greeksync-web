'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, type Member } from '@/lib/auth-context'
import DashboardShell from '@/components/layout/DashboardShell'
import { Settings, X } from 'lucide-react'
import Link from 'next/link'

type Tab = 'profile' | 'members' | 'billing' | 'danger'

const TABS: { key: Tab; label: string }[] = [
  { key: 'profile',  label: 'Chapter Profile' },
  { key: 'members',  label: 'Members & Roles' },
  { key: 'billing',  label: 'Billing' },
  { key: 'danger',   label: 'Danger Zone' },
]

const ROLE_DEFS = [
  { role: 'admin',  label: 'Admin',   desc: 'Full access — manage members, settings, all content' },
  { role: 'editor', label: 'Officer', desc: 'Can manage calendar and rush, cannot manage members' },
  { role: 'member', label: 'Member',  desc: 'Read-only access to shared content' },
]

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  admin:  { bg: 'rgba(255,107,74,0.12)',  color: '#FF6B4A' },
  editor: { bg: 'rgba(240,180,41,0.15)',  color: '#F0B429' },
  member: { bg: 'rgba(139,148,158,0.15)', color: '#8B949E' },
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function SettingsPage() {
  const { chapter, chapterId, isAdmin, can, refreshMember, loading: authLoading, user } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')

  // ── Chapter Profile ───────────────────────────────────────────────────────
  const [chapterName, setChapterName]     = useState('')
  const [greekLetters, setGreekLetters]   = useState('')
  const [school, setSchool]               = useState('')
  const [description, setDescription]     = useState('')
  const [dirty, setDirty]                 = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)

  useEffect(() => {
    if (chapter) {
      setChapterName(chapter.name ?? '')
      setDirty(false)
    }
  }, [chapter])

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v); setDirty(true)
  }

  const saveProfile = async () => {
    if (!supabase || !chapterId || !chapterName.trim()) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('chapters').update({ name: chapterName.trim() }).eq('id', chapterId)
    if (error) {
      console.error('Chapter update failed:', error)
      setSaveError(error.message)
      setSaving(false)
      return
    }
    await refreshMember()
    setSaving(false)
    setSaved(true)
    setDirty(false)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Members & Roles ───────────────────────────────────────────────────────
  const [members, setMembers]             = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  useEffect(() => {
    if (tab === 'members') loadMembers()
  }, [tab, chapterId])

  const loadMembers = async () => {
    if (!supabase || !chapterId) return
    setMembersLoading(true)
    const { data } = await supabase.from('members').select('*').eq('chapter_id', chapterId).order('created_at')
    setMembers((data ?? []) as Member[])
    setMembersLoading(false)
  }

  const updateMemberRole = async (memberId: string, role: string) => {
    if (!supabase) return
    await supabase.from('members').update({ role }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: role as Member['role'] } : m))
  }

  // ── Danger Zone ───────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm]     = useState('')

  const confirmName = chapter?.name ?? ''
  const canDelete   = deleteConfirm === confirmName

  const handleDeleteChapter = async () => {
    if (!supabase || !chapterId || !canDelete) return
    await supabase.from('chapters').delete().eq('id', chapterId)
    setShowDeleteModal(false)
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (supabase && authLoading) {
    return (
      <DashboardShell>
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
          <div className="h-8 w-48 rounded bg-[#21262D] animate-pulse" />
          <div className="h-4 w-32 rounded bg-[#21262D] animate-pulse" />
        </div>
      </DashboardShell>
    )
  }

  if (supabase && !isAdmin) {
    return (
      <DashboardShell>
        <div className="flex flex-1 items-center justify-center min-h-screen px-4">
          <div className="text-center">
            <Settings size={48} strokeWidth={1} className="text-[#8B949E] mx-auto mb-5" />
            <h1 className="text-2xl font-bold text-white mb-2">Admins Only</h1>
            <p className="text-[#8B949E] text-sm mb-7 max-w-xs mx-auto">
              {user ? "You need admin access to manage chapter settings." : 'Sign in as an admin to access settings.'}
            </p>
            <Link href={user ? '/' : '/login'} className="btn-primary">
              {user ? 'Go Back' : 'Sign In →'}
            </Link>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF6B4A] mb-3">
            Chapter Admin
          </p>
          <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight">
            Chapter Settings
          </h1>
        </div>

        {/* Tabs + content */}
        <div className="flex gap-8">

          {/* Vertical tab list */}
          <nav className="flex-shrink-0 w-44">
            <ul className="space-y-0.5">
              {TABS.map(t => (
                <li key={t.key}>
                  <button
                    onClick={() => setTab(t.key)}
                    className={[
                      'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                      tab === t.key
                        ? 'bg-[rgba(255,107,74,0.08)] text-white'
                        : 'text-[#8B949E] hover:text-white hover:bg-[#161B22]',
                      t.key === 'danger' && tab !== 'danger' ? 'text-[#E5484D]/70 hover:text-[#E5484D]' : '',
                    ].join(' ')}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Tab content */}
          <div className="flex-1 min-w-0">

            {/* ── Chapter Profile ─────────────────────────────────────────── */}
            {tab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <label className="label block mb-2">Chapter Name</label>
                  <input
                    value={chapterName}
                    onChange={e => markDirty(setChapterName)(e.target.value)}
                    placeholder="e.g. Alpha Beta Gamma"
                    className="field"
                  />
                </div>
                <div>
                  <label className="label block mb-2">Greek Letters</label>
                  <input
                    value={greekLetters}
                    onChange={e => markDirty(setGreekLetters)(e.target.value)}
                    placeholder="e.g. ΑΒΓ"
                    className="field"
                  />
                </div>
                <div>
                  <label className="label block mb-2">School / University</label>
                  <input
                    value={school}
                    onChange={e => markDirty(setSchool)(e.target.value)}
                    placeholder="e.g. University of Michigan"
                    className="field"
                  />
                </div>
                <div>
                  <label className="label block mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={e => markDirty(setDescription)(e.target.value)}
                    placeholder="A short bio about your chapter…"
                    rows={4}
                    className="field resize-none pt-2.5"
                    style={{ height: 'auto' }}
                  />
                </div>
              </div>
            )}

            {/* ── Members & Roles ──────────────────────────────────────────── */}
            {tab === 'members' && (
              <div className="space-y-6">
                {/* Role definitions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ROLE_DEFS.map(r => (
                    <div key={r.role} className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
                      <span
                        className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium mb-2"
                        style={{ background: ROLE_BADGE[r.role].bg, color: ROLE_BADGE[r.role].color }}
                      >
                        {r.label}
                      </span>
                      <p className="text-[#8B949E] text-xs leading-relaxed">{r.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Members table */}
                {membersLoading ? (
                  <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#21262D]">
                        <div className="w-8 h-8 rounded-full bg-[#21262D] animate-pulse flex-shrink-0" />
                        <div className="flex-1 h-3 rounded bg-[#21262D] animate-pulse" />
                        <div className="w-24 h-8 rounded-lg bg-[#21262D] animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 border-b border-[#21262D]">
                      <p className="label">Member</p>
                      <p className="label">Role</p>
                    </div>
                    {members.map(m => (
                      <div key={m.id} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 border-b border-[#21262D] items-center last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#FF6B4A] text-xs font-semibold flex-shrink-0"
                            style={{ background: 'rgba(255,107,74,0.15)' }}
                          >
                            {getInitials(m.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{m.name}</p>
                            {m.position && <p className="text-[#8B949E] text-xs truncate">{m.position}</p>}
                          </div>
                        </div>
                        <select
                          value={m.role}
                          onChange={e => updateMemberRole(m.id, e.target.value)}
                          className="field w-32 h-8 text-xs px-2"
                          style={{ color: ROLE_BADGE[m.role]?.color ?? '#8B949E' }}
                        >
                          <option value="admin"  className="text-white bg-[#161B22]">Admin</option>
                          <option value="editor" className="text-white bg-[#161B22]">Officer</option>
                          <option value="member" className="text-white bg-[#161B22]">Member</option>
                        </select>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <p className="text-[#8B949E] text-sm text-center py-8">No members found.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Billing ──────────────────────────────────────────────────── */}
            {tab === 'billing' && (
              <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-8 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8B949E] mb-3">Coming Soon</p>
                <p className="text-white font-semibold text-lg mb-2">Billing & Subscription</p>
                <p className="text-[#8B949E] text-sm max-w-xs mx-auto">
                  Manage your plan, payment method, and billing history here.
                </p>
              </div>
            )}

            {/* ── Danger Zone ──────────────────────────────────────────────── */}
            {tab === 'danger' && (
              <div className="border border-[#E5484D]/30 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E5484D]/20 bg-[#E5484D]/5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#E5484D]">
                    Danger Zone
                  </p>
                </div>
                <div className="px-6 py-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-semibold">Delete This Chapter</p>
                    <p className="text-[#8B949E] text-xs mt-0.5">
                      Permanently delete the chapter and all associated data. This cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn-danger flex-shrink-0"
                  >
                    Delete Chapter
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Sticky save footer (Chapter Profile only) ────────────────────── */}
      {tab === 'profile' && dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#21262D] bg-[#0D1117]/95"
          style={{ backdropFilter: 'blur(8px)' }}>
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            {saveError
              ? <p className="text-[#E5484D] text-sm">{saveError}</p>
              : <p className="text-[#8B949E] text-sm">You have unsaved changes.</p>
            }
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setChapterName(chapter?.name ?? ''); setDirty(false) }}
                className="btn-ghost"
              >
                Discard
              </button>
              <button
                onClick={saveProfile}
                disabled={saving || !chapterName.trim()}
                className="btn-primary"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Chapter modal ─────────────────────────────────────────── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <div className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
            style={{ animation: 'modalIn 200ms ease-out' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
              <p className="text-white font-semibold">Delete Chapter</p>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <p className="text-[#8B949E] text-sm leading-relaxed">
                This will permanently delete <span className="text-white font-medium">{confirmName}</span> and all associated members, events, and data. This action <span className="text-[#E5484D]">cannot be undone</span>.
              </p>
              <div>
                <label className="label block mb-2">
                  Type <span className="text-white font-medium normal-case">{confirmName}</span> to confirm
                </label>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={confirmName}
                  className="field"
                  autoFocus
                />
              </div>
              <button
                onClick={handleDeleteChapter}
                disabled={!canDelete}
                className="btn-danger w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete Chapter Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardShell>
  )
}
