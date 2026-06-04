'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, type Member } from '@/lib/auth-context'
import DashboardShell from '@/components/layout/DashboardShell'
import {
  Search, Plus, X, ChevronDown, Bell, DollarSign,
  Pencil, Archive, Trash2, Download, Check, ArchiveRestore,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface DuesPeriod {
  id: string
  chapter_id: string
  name: string
  amount_per_member: number // cents
  due_date: string
  created_by: string | null
  created_at: string
  is_active: boolean
  late_fee_cents: number // cents, 0 = no late fee
}

interface DuesPayment {
  id: string
  dues_period_id: string
  member_id: string
  amount_paid: number // cents
  paid_at: string
  logged_by: string | null
  notes: string | null
}

type PaymentStatus = 'paid' | 'partial' | 'overdue' | 'unpaid'
type FilterTab = 'all' | 'unpaid' | 'partial' | 'overdue' | 'paid'
type PanelTab = 'period' | 'history'

interface MemberDuesRow {
  memberId: string
  memberName: string
  amountDue: number  // effective due (includes late fee if past due)
  amountPaid: number
  status: PaymentStatus
  dueDate: string
  payments: DuesPayment[]
}

interface HistoryEntry {
  period: DuesPeriod
  payments: DuesPayment[]
  amountPaid: number
  amountDue: number
  status: PaymentStatus
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function computeStatus(amountPaid: number, amountDue: number, dueDate: string): PaymentStatus {
  if (amountPaid >= amountDue) return 'paid'
  const due = new Date(dueDate + 'T23:59:59')
  const isPastDue = new Date() > due
  if (isPastDue) return 'overdue'
  if (amountPaid > 0) return 'partial'
  return 'unpaid'
}

function effectiveDue(period: DuesPeriod): number {
  const isPastDue = new Date() > new Date(period.due_date + 'T23:59:59')
  return period.amount_per_member + (isPastDue && period.late_fee_cents > 0 ? period.late_fee_cents : 0)
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { bg: string; color: string; label: string }> = {
    paid:    { bg: 'rgba(63,184,140,0.15)',  color: '#3FB88C', label: 'Paid'    },
    partial: { bg: 'rgba(240,180,41,0.15)',  color: '#F0B429', label: 'Partial' },
    overdue: { bg: 'rgba(229,72,77,0.15)',   color: '#E5484D', label: 'Overdue' },
    unpaid:  { bg: 'rgba(229,72,77,0.15)',   color: '#E5484D', label: 'Unpaid'  },
  }
  const s = map[status]
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
      <p className="text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em] mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </p>
    </div>
  )
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium pointer-events-auto"
          style={{
            background: t.type === 'success' ? 'rgba(63,184,140,0.12)' : 'rgba(229,72,77,0.12)',
            border: `1px solid ${t.type === 'success' ? 'rgba(63,184,140,0.3)' : 'rgba(229,72,77,0.3)'}`,
            color: t.type === 'success' ? '#3FB88C' : '#E5484D',
            animation: 'toastIn 200ms ease-out',
          }}
        >
          {t.type === 'success' ? <Check size={15} /> : <X size={15} />}
          <span>{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DuesPage() {
  const { chapterId, user, canEdit } = useAuth()
  const isManager = canEdit

  // ── Data ────────────────────────────────────────────────────────────────────
  const [periods, setPeriods] = useState<DuesPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [payments, setPayments] = useState<DuesPayment[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── UI state ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [panelMemberId, setPanelMemberId] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<PanelTab>('period')
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [showReminders, setShowReminders] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  // ── New-period form ─────────────────────────────────────────────────────────
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newLateFee, setNewLateFee] = useState('')
  const [savingPeriod, setSavingPeriod] = useState(false)
  const [periodError, setPeriodError] = useState('')

  // ── Edit-period state ───────────────────────────────────────────────────────
  const [editingPeriod, setEditingPeriod] = useState<DuesPeriod | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editLateFee, setEditLateFee] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // ── Delete confirmation ─────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingPeriod, setDeletingPeriod] = useState(false)

  // ── Log-payment form ────────────────────────────────────────────────────────
  const [logAmount, setLogAmount] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)

  // ── Member history ───────────────────────────────────────────────────────────
  const [memberHistory, setMemberHistory] = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ── Reminders ───────────────────────────────────────────────────────────────
  const [sendingReminders, setSendingReminders] = useState(false)

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activePeriods = useMemo(() => periods.filter(p => p.is_active), [periods])
  const archivedPeriods = useMemo(() => periods.filter(p => !p.is_active), [periods])

  const selectedPeriod = useMemo(
    () => periods.find(p => p.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId]
  )

  const allMemberRows = useMemo((): MemberDuesRow[] => {
    if (!selectedPeriod) return []
    const due = effectiveDue(selectedPeriod)
    return members
      .filter(m => m.user_id)
      .map(m => {
        const memberId = m.user_id as string
        const memberPayments = payments.filter(p => p.member_id === memberId)
        const amountPaid = memberPayments.reduce((sum, p) => sum + (p.amount_paid ?? 0), 0)
        return {
          memberId,
          memberName: m.name,
          amountDue: due,
          amountPaid,
          status: computeStatus(amountPaid, due, selectedPeriod.due_date),
          dueDate: selectedPeriod.due_date,
          payments: memberPayments,
        }
      })
  }, [members, payments, selectedPeriod])

  const visibleRows = useMemo(
    () => isManager ? allMemberRows : allMemberRows.filter(r => r.memberId === user?.id),
    [allMemberRows, isManager, user]
  )

  const filteredRows = useMemo(() => {
    let rows = visibleRows
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r => r.memberName.toLowerCase().includes(q))
    }
    if (filterTab !== 'all') {
      rows = rows.filter(r => r.status === filterTab)
    }
    return rows
  }, [visibleRows, search, filterTab])

  const metrics = useMemo(() => {
    const totalExpected = allMemberRows.reduce((s, r) => s + r.amountDue, 0)
    const collected     = allMemberRows.reduce((s, r) => s + Math.min(r.amountPaid, r.amountDue), 0)
    const outstanding   = Math.max(0, totalExpected - collected)
    const overdue       = allMemberRows
      .filter(r => r.status === 'overdue')
      .reduce((s, r) => s + (r.amountDue - r.amountPaid), 0)
    const paidCount  = allMemberRows.filter(r => r.status === 'paid').length
    const totalCount = allMemberRows.length
    const pct = totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 0
    return { totalExpected, collected, outstanding, overdue, paidCount, totalCount, pct }
  }, [allMemberRows])

  const unpaidCount = allMemberRows.filter(r => r.status !== 'paid').length

  const panelMember = useMemo(
    () => allMemberRows.find(r => r.memberId === panelMemberId) ?? null,
    [allMemberRows, panelMemberId]
  )

  // Auto-fill remaining balance when panel opens
  useEffect(() => {
    if (!panelMemberId) { setLogAmount(''); setLogNotes(''); return }
    const row = allMemberRows.find(r => r.memberId === panelMemberId)
    if (row && row.status !== 'paid') {
      const remaining = Math.max(0, row.amountDue - row.amountPaid)
      setLogAmount(remaining > 0 ? (remaining / 100).toFixed(2) : '')
    } else {
      setLogAmount('')
    }
    setLogNotes('')
    setPanelTab('period')
    setMemberHistory([])
  }, [panelMemberId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (chapterId) loadInitial()
    else setLoading(false)
  }, [chapterId])

  useEffect(() => {
    if (selectedPeriodId) loadPayments(selectedPeriodId)
    else setPayments([])
  }, [selectedPeriodId])

  async function loadInitial() {
    if (!supabase || !chapterId) { setLoading(false); return }
    setLoading(true)

    const [{ data: periodsData }, { data: membersData }] = await Promise.all([
      supabase
        .from('dues_periods')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false }),
      supabase
        .from('members')
        .select('*')
        .eq('chapter_id', chapterId)
        .not('user_id', 'is', null),
    ])

    const periodList = (periodsData as DuesPeriod[]) ?? []
    setPeriods(periodList)
    setMembers((membersData as Member[]) ?? [])

    const defaultPeriod = periodList.find(p => p.is_active) ?? periodList[0] ?? null
    if (defaultPeriod) setSelectedPeriodId(defaultPeriod.id)

    setLoading(false)
  }

  async function loadPayments(periodId: string) {
    if (!supabase) return
    const { data } = await supabase
      .from('dues_payments')
      .select('*')
      .eq('dues_period_id', periodId)
    setPayments((data as DuesPayment[]) ?? [])
  }

  async function refreshPeriods() {
    if (!supabase || !chapterId) return
    const { data } = await supabase
      .from('dues_periods')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false })
    setPeriods((data as DuesPeriod[]) ?? [])
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function createPeriod() {
    if (!supabase || !chapterId || !user) return
    const trimmedName = newName.trim()
    if (!trimmedName || !newAmount || !newDate) return
    const amountCents = Math.round(parseFloat(newAmount) * 100)
    if (!amountCents || amountCents <= 0) return

    setSavingPeriod(true)
    setPeriodError('')

    const lateFee = newLateFee ? Math.round(parseFloat(newLateFee) * 100) : 0

    const { data: period, error } = await supabase
      .from('dues_periods')
      .insert({
        chapter_id: chapterId,
        name: trimmedName,
        amount_per_member: amountCents,
        due_date: newDate,
        late_fee_cents: lateFee,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single()

    if (error || !period) {
      setPeriodError(error?.message ?? 'Failed to create period.')
      setSavingPeriod(false)
      return
    }

    const seedRows = members
      .filter(m => m.user_id)
      .map(m => ({
        dues_period_id: (period as DuesPeriod).id,
        member_id: m.user_id as string,
        amount_paid: 0,
        logged_by: user.id,
      }))

    if (seedRows.length > 0) {
      await supabase.from('dues_payments').insert(seedRows)
    }

    await refreshPeriods()
    setSelectedPeriodId((period as DuesPeriod).id)
    setShowNewPeriod(false)
    setNewName(''); setNewAmount(''); setNewDate(''); setNewLateFee('')
    setSavingPeriod(false)
    addToast(`Period "${trimmedName}" created`)
  }

  function openEditPeriod(p: DuesPeriod) {
    setEditingPeriod(p)
    setEditName(p.name)
    setEditAmount((p.amount_per_member / 100).toFixed(2))
    setEditDate(p.due_date)
    setEditLateFee(p.late_fee_cents > 0 ? (p.late_fee_cents / 100).toFixed(2) : '')
    setEditError('')
    setShowPeriodDropdown(false)
  }

  async function savePeriodEdit() {
    if (!supabase || !editingPeriod) return
    const trimmedName = editName.trim()
    if (!trimmedName || !editAmount || !editDate) return
    const amountCents = Math.round(parseFloat(editAmount) * 100)
    if (!amountCents || amountCents <= 0) return

    setSavingEdit(true)
    setEditError('')

    const lateFee = editLateFee ? Math.round(parseFloat(editLateFee) * 100) : 0

    const { error } = await supabase
      .from('dues_periods')
      .update({
        name: trimmedName,
        amount_per_member: amountCents,
        due_date: editDate,
        late_fee_cents: lateFee,
      })
      .eq('id', editingPeriod.id)

    if (error) {
      setEditError(error.message)
      setSavingEdit(false)
      return
    }

    await refreshPeriods()
    if (selectedPeriodId === editingPeriod.id) {
      await loadPayments(editingPeriod.id)
    }
    setEditingPeriod(null)
    setSavingEdit(false)
    addToast(`"${trimmedName}" updated`)
  }

  async function archivePeriod(p: DuesPeriod) {
    if (!supabase) return
    await supabase
      .from('dues_periods')
      .update({ is_active: !p.is_active })
      .eq('id', p.id)
    await refreshPeriods()
    addToast(p.is_active ? `"${p.name}" archived` : `"${p.name}" restored`)
    setShowPeriodDropdown(false)
  }

  async function deletePeriod() {
    if (!supabase || !confirmDeleteId) return
    const p = periods.find(x => x.id === confirmDeleteId)
    setDeletingPeriod(true)
    const { error } = await supabase.from('dues_periods').delete().eq('id', confirmDeleteId)
    if (error) {
      addToast('Failed to delete period', 'error')
      setDeletingPeriod(false)
      setConfirmDeleteId(null)
      return
    }
    await refreshPeriods()
    if (selectedPeriodId === confirmDeleteId) {
      const remaining = periods.filter(x => x.id !== confirmDeleteId)
      setSelectedPeriodId(remaining.find(x => x.is_active)?.id ?? remaining[0]?.id ?? null)
    }
    setConfirmDeleteId(null)
    setDeletingPeriod(false)
    setShowPeriodDropdown(false)
    addToast(`"${p?.name ?? 'Period'}" deleted`)
  }

  async function logPayment(memberId: string) {
    if (!supabase || !selectedPeriod || !user) return
    const amountCents = Math.round(parseFloat(logAmount) * 100)
    if (!amountCents || amountCents <= 0) return

    setSavingPayment(true)
    await supabase.from('dues_payments').insert({
      dues_period_id: selectedPeriod.id,
      member_id: memberId,
      amount_paid: amountCents,
      logged_by: user.id,
      notes: logNotes.trim() || null,
    })
    await loadPayments(selectedPeriod.id)
    setLogAmount('')
    setLogNotes('')
    setSavingPayment(false)

    const row = allMemberRows.find(r => r.memberId === memberId)
    addToast(`Payment logged for ${row?.memberName ?? 'member'}`)
  }

  async function sendReminders() {
    setSendingReminders(true)
    console.log(`[dues] send reminders to ${unpaidCount} unpaid members in period "${selectedPeriod?.name}"`)
    await new Promise(r => setTimeout(r, 600))
    setSendingReminders(false)
    setShowReminders(false)
  }

  async function loadMemberHistory(memberId: string) {
    if (!supabase || !chapterId) return
    setLoadingHistory(true)

    const { data: allPayments } = await supabase
      .from('dues_payments')
      .select('*')
      .eq('member_id', memberId)

    const paymentList = (allPayments as DuesPayment[]) ?? []

    const entries: HistoryEntry[] = periods.map(p => {
      const ps = paymentList.filter(pay => pay.dues_period_id === p.id)
      const paid = ps.reduce((s, pay) => s + (pay.amount_paid ?? 0), 0)
      const due = effectiveDue(p)
      return {
        period: p,
        payments: ps,
        amountPaid: paid,
        amountDue: due,
        status: computeStatus(paid, due, p.due_date),
      }
    })

    setMemberHistory(entries)
    setLoadingHistory(false)
  }

  function exportCSV() {
    if (!selectedPeriod || allMemberRows.length === 0) return
    const headers = ['Member', 'Amount Due', 'Amount Paid', 'Remaining', 'Status', 'Due Date']
    const rows = allMemberRows.map(r => [
      r.memberName,
      (r.amountDue / 100).toFixed(2),
      (r.amountPaid / 100).toFixed(2),
      (Math.max(0, r.amountDue - r.amountPaid) / 100).toFixed(2),
      r.status,
      r.dueDate,
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dues-${selectedPeriod.name.replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast('CSV exported')
  }

  function getMemberName(userId: string | null): string {
    if (!userId) return 'Unknown'
    return members.find(m => m.user_id === userId)?.name ?? 'Unknown'
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-8 max-w-[1200px] mx-auto animate-pulse space-y-6">
          <div className="h-5 w-36 bg-[#21262D] rounded" />
          <div className="h-8 w-72 bg-[#21262D] rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-[#161B22] border border-[#21262D] rounded-xl" />
            ))}
          </div>
          <div className="h-12 bg-[#161B22] border border-[#21262D] rounded-xl" />
          <div className="h-64 bg-[#161B22] border border-[#21262D] rounded-xl" />
        </div>
      </DashboardShell>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const periodListForDropdown = showArchived ? periods : activePeriods

  return (
    <DashboardShell>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="p-8 max-w-[1200px] mx-auto">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[11px] font-medium text-[#FF6B4A] uppercase tracking-[0.08em] mb-1">
              CHAPTER FINANCES
            </p>
            <h1
              className="text-[28px] font-bold text-white leading-tight"
              style={{ fontFamily: 'var(--font-satoshi)' }}
            >
              {selectedPeriod ? `Dues — ${selectedPeriod.name}` : 'Dues'}
            </h1>
          </div>

          <div className="flex items-center gap-3 mt-1">
            {/* Period switcher */}
            {periods.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowPeriodDropdown(v => !v)}
                  className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#161B22] border border-[#21262D] text-sm text-white hover:border-[#30363D] transition-colors"
                >
                  <span className="max-w-[140px] truncate">
                    {selectedPeriod?.name ?? 'Select period'}
                  </span>
                  {selectedPeriod && !selectedPeriod.is_active && (
                    <span className="text-[10px] text-[#8B949E] font-medium">(archived)</span>
                  )}
                  <ChevronDown size={14} className="text-[#8B949E] flex-shrink-0" />
                </button>

                {showPeriodDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowPeriodDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1 w-64 bg-[#161B22] border border-[#21262D] rounded-lg shadow-xl z-20 py-1 overflow-hidden">
                      {/* Active periods */}
                      {activePeriods.length > 0 && (
                        <>
                          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[#8B949E] uppercase tracking-[0.08em]">
                            Active
                          </p>
                          {activePeriods.map(p => (
                            <PeriodDropdownRow
                              key={p.id}
                              period={p}
                              isSelected={p.id === selectedPeriodId}
                              isManager={isManager}
                              onSelect={() => { setSelectedPeriodId(p.id); setShowPeriodDropdown(false); setPanelMemberId(null) }}
                              onEdit={() => openEditPeriod(p)}
                              onArchive={() => archivePeriod(p)}
                              onDelete={() => { setConfirmDeleteId(p.id); setShowPeriodDropdown(false) }}
                            />
                          ))}
                        </>
                      )}

                      {/* Archived periods toggle */}
                      {archivedPeriods.length > 0 && (
                        <>
                          <div className="h-px bg-[#21262D] my-1" />
                          <button
                            onClick={() => setShowArchived(v => !v)}
                            className="w-full text-left px-3 py-2 text-xs text-[#8B949E] hover:text-white transition-colors flex items-center gap-2"
                          >
                            <Archive size={12} />
                            {showArchived ? 'Hide' : 'Show'} {archivedPeriods.length} archived
                          </button>
                          {showArchived && archivedPeriods.map(p => (
                            <PeriodDropdownRow
                              key={p.id}
                              period={p}
                              isSelected={p.id === selectedPeriodId}
                              isManager={isManager}
                              onSelect={() => { setSelectedPeriodId(p.id); setShowPeriodDropdown(false); setPanelMemberId(null) }}
                              onEdit={() => openEditPeriod(p)}
                              onArchive={() => archivePeriod(p)}
                              onDelete={() => { setConfirmDeleteId(p.id); setShowPeriodDropdown(false) }}
                            />
                          ))}
                        </>
                      )}

                      {activePeriods.length === 0 && archivedPeriods.length === 0 && (
                        <p className="px-3 py-3 text-xs text-[#8B949E]">No periods yet.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* New Period CTA */}
            {isManager && (
              <button
                onClick={() => setShowNewPeriod(true)}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] active:scale-[0.98] transition-all"
              >
                <Plus size={16} />
                New Period
              </button>
            )}
          </div>
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {periods.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#161B22] border border-[#21262D] flex items-center justify-center mb-4">
              <DollarSign size={28} className="text-[#8B949E]" />
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">No dues periods yet</h3>
            <p className="text-[#8B949E] text-sm mb-6 max-w-xs">
              Create a dues period to start tracking chapter payments.
            </p>
            {isManager && (
              <button
                onClick={() => setShowNewPeriod(true)}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] transition-colors"
              >
                <Plus size={16} />
                Create First Period
              </button>
            )}
          </div>
        )}

        {/* ── Period content ───────────────────────────────────────────────── */}
        {selectedPeriod && (
          <>
            {/* Archived banner */}
            {!selectedPeriod.is_active && (
              <div className="flex items-center gap-2 px-4 py-2.5 mb-5 rounded-lg border border-[#F0B429]/20 bg-[rgba(240,180,41,0.06)] text-[#F0B429] text-sm">
                <Archive size={14} />
                This period is archived. Data is read-only.
                {isManager && (
                  <button
                    onClick={() => archivePeriod(selectedPeriod)}
                    className="ml-auto text-xs underline hover:no-underline"
                  >
                    Restore
                  </button>
                )}
              </div>
            )}

            {/* Late fee banner */}
            {selectedPeriod.late_fee_cents > 0 && new Date() > new Date(selectedPeriod.due_date + 'T23:59:59') && (
              <div className="flex items-center gap-2 px-4 py-2.5 mb-5 rounded-lg border border-[#E5484D]/20 bg-[rgba(229,72,77,0.06)] text-[#E5484D] text-sm">
                <DollarSign size={14} />
                Late fee of {formatDollars(selectedPeriod.late_fee_cents)} has been applied — due date passed.
              </div>
            )}

            {/* Metrics row — managers only */}
            {isManager && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
                  <MetricCard label="Total Expected" value={formatDollars(metrics.totalExpected)} color="#FFFFFF" />
                  <MetricCard label="Collected"      value={formatDollars(metrics.collected)}     color="#3FB88C" />
                  <MetricCard label="Outstanding"    value={formatDollars(metrics.outstanding)}   color="#F0B429" />
                  <MetricCard label="Overdue"        value={formatDollars(metrics.overdue)}       color="#E5484D" />
                </div>

                {/* Progress bar */}
                <div className="bg-[#161B22] border border-[#21262D] rounded-xl px-5 py-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#8B949E]">
                      {metrics.paidCount} of {metrics.totalCount} members paid
                    </span>
                    <span
                      className="text-sm font-semibold text-white"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {metrics.pct}% collected
                    </span>
                  </div>
                  <div className="h-2 bg-[#21262D] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3FB88C] rounded-full transition-all duration-500"
                      style={{ width: `${metrics.pct}%` }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E] pointer-events-none"
                  />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search members…"
                    className="h-9 pl-9 pr-4 w-52 bg-[#0D1117] border border-[#21262D] rounded-lg text-sm text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B4A] transition-colors"
                    onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,74,0.15)')}
                    onBlur={e =>  (e.currentTarget.style.boxShadow = '')}
                  />
                </div>

                {/* Filter tabs */}
                {(['all', 'unpaid', 'partial', 'overdue', 'paid'] as FilterTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`h-9 px-3 rounded-lg text-sm font-medium capitalize transition-colors ${
                      filterTab === tab
                        ? 'bg-[rgba(255,107,74,0.08)] text-white'
                        : 'text-[#8B949E] hover:text-white hover:bg-[#21262D]'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Export CSV */}
                {isManager && allMemberRows.length > 0 && (
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#21262D] text-[#8B949E] text-sm font-medium hover:text-white hover:border-[#30363D] transition-colors"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                )}

                {/* Send Reminders */}
                {isManager && (
                  <button
                    onClick={() => setShowReminders(true)}
                    className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#21262D] text-[#8B949E] text-sm font-medium hover:text-white hover:border-[#30363D] transition-colors"
                  >
                    <Bell size={14} />
                    Send Reminders
                  </button>
                )}
              </div>
            </div>

            {/* Member table */}
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#21262D]">
                    <th className="text-left px-6 py-3 text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em]">
                      Member
                    </th>
                    <th className="text-left px-6 py-3 text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em]">
                      Amount Due
                    </th>
                    <th className="text-left px-6 py-3 text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em]">
                      Amount Paid
                    </th>
                    <th className="text-left px-6 py-3 text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em]">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em]">
                      Due Date
                    </th>
                    {isManager && <th className="w-20 px-6 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={isManager ? 6 : 5}
                        className="px-6 py-14 text-center text-[#8B949E] text-sm"
                      >
                        No members match your filters.
                      </td>
                    </tr>
                  )}
                  {filteredRows.map(row => (
                    <tr
                      key={row.memberId}
                      onClick={() => setPanelMemberId(row.memberId)}
                      className="border-b border-[#0D1117] last:border-0 hover:bg-[#1C2128] cursor-pointer transition-colors"
                      style={{ height: 48 }}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[rgba(255,107,74,0.12)] border border-[rgba(255,107,74,0.2)] flex items-center justify-center text-[#FF6B4A] text-xs font-bold flex-shrink-0">
                            {getInitials(row.memberName)}
                          </div>
                          <span className="text-sm font-medium text-white">{row.memberName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatDollars(row.amountDue)}
                        {selectedPeriod.late_fee_cents > 0 && new Date() > new Date(selectedPeriod.due_date + 'T23:59:59') && row.amountPaid < row.amountDue && (
                          <span className="ml-1 text-[10px] text-[#E5484D]">(+late fee)</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatDollars(row.amountPaid)}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-6 py-3 text-sm text-[#8B949E]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {row.dueDate}
                      </td>
                      {isManager && (
                        <td className="px-6 py-3 text-right" onClick={e => e.stopPropagation()}>
                          {row.status !== 'paid' && (
                            <button
                              className="text-xs text-[#FF6B4A] hover:text-[#E85A3A] font-medium transition-colors"
                              onClick={() => setPanelMemberId(row.memberId)}
                            >
                              Log
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Slide-over panel ─────────────────────────────────────────────────── */}
      {panelMember && (
        <div
          className="fixed inset-0 z-40"
          onClick={e => { if (e.target === e.currentTarget) setPanelMemberId(null) }}
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-[#161B22] border-l border-[#21262D] flex flex-col"
            style={{ animation: 'slideIn 250ms cubic-bezier(0.4,0,0.2,1)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#21262D] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[rgba(255,107,74,0.12)] border border-[rgba(255,107,74,0.2)] flex items-center justify-center text-[#FF6B4A] text-sm font-bold flex-shrink-0">
                  {getInitials(panelMember.memberName)}
                </div>
                <div>
                  <p className="text-white font-semibold text-base leading-tight">{panelMember.memberName}</p>
                  <div className="mt-0.5">
                    <StatusBadge status={panelMember.status} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPanelMemberId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors flex-shrink-0"
              >
                <X size={17} />
              </button>
            </div>

            {/* Panel tabs */}
            <div className="flex border-b border-[#21262D] flex-shrink-0">
              {(['period', 'history'] as PanelTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setPanelTab(tab)
                    if (tab === 'history' && memberHistory.length === 0) {
                      loadMemberHistory(panelMember.memberId)
                    }
                  }}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                    panelTab === tab
                      ? 'text-white border-b-2 border-[#FF6B4A]'
                      : 'text-[#8B949E] hover:text-white'
                  }`}
                >
                  {tab === 'period' ? 'This Period' : 'All Periods'}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {panelTab === 'period' && (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3 text-center">
                      <p className="text-[10px] text-[#8B949E] uppercase tracking-[0.08em] mb-1">Total Due</p>
                      <p className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatDollars(panelMember.amountDue)}
                      </p>
                    </div>
                    <div className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3 text-center">
                      <p className="text-[10px] text-[#8B949E] uppercase tracking-[0.08em] mb-1">Paid</p>
                      <p className="text-[#3FB88C] font-semibold text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatDollars(panelMember.amountPaid)}
                      </p>
                    </div>
                    <div className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3 text-center">
                      <p className="text-[10px] text-[#8B949E] uppercase tracking-[0.08em] mb-1">Remaining</p>
                      <p
                        className="font-semibold text-sm"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: panelMember.amountPaid >= panelMember.amountDue ? '#3FB88C' : '#F0B429',
                        }}
                      >
                        {formatDollars(Math.max(0, panelMember.amountDue - panelMember.amountPaid))}
                      </p>
                    </div>
                  </div>

                  {/* Payment history */}
                  <div>
                    <p className="text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em] mb-3">
                      Payment History
                    </p>
                    {panelMember.payments.filter(p => p.amount_paid > 0).length === 0 ? (
                      <p className="text-[#8B949E] text-sm">No payments logged yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {[...panelMember.payments]
                          .filter(p => p.amount_paid > 0)
                          .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
                          .map(p => (
                            <div key={p.id} className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                                  {formatDollars(p.amount_paid)}
                                </span>
                                <span className="text-[#8B949E] text-[12px]" style={{ fontFamily: 'var(--font-mono)' }}>
                                  {new Date(p.paid_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-[#8B949E] text-xs">
                                Logged by {getMemberName(p.logged_by)}
                              </p>
                              {p.notes && (
                                <p className="text-[#8B949E] text-xs mt-1 italic">{p.notes}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {panelTab === 'history' && (
                <>
                  {loadingHistory ? (
                    <div className="space-y-3 animate-pulse">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-[#0D1117] border border-[#21262D] rounded-lg" />
                      ))}
                    </div>
                  ) : memberHistory.length === 0 ? (
                    <p className="text-[#8B949E] text-sm">No history found.</p>
                  ) : (
                    <div className="space-y-2">
                      {memberHistory.map(entry => (
                        <div key={entry.period.id} className="bg-[#0D1117] border border-[#21262D] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white text-sm font-semibold">{entry.period.name}</p>
                            <StatusBadge status={entry.status} />
                          </div>
                          <div className="flex items-center gap-4 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                            <span className="text-[#8B949E]">Due: {formatDollars(entry.amountDue)}</span>
                            <span className="text-[#3FB88C]">Paid: {formatDollars(entry.amountPaid)}</span>
                            {entry.amountPaid < entry.amountDue && (
                              <span className="text-[#F0B429]">
                                Remaining: {formatDollars(entry.amountDue - entry.amountPaid)}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#8B949E] mt-1">Due {entry.period.due_date}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Log Payment form — managers + unpaid + this period tab */}
            {isManager && panelMember.status !== 'paid' && panelTab === 'period' && selectedPeriod?.is_active && (
              <div className="border-t border-[#21262D] p-6 space-y-4 flex-shrink-0">
                <p className="text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em]">
                  Log Payment
                </p>
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1.5">Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={logAmount}
                    onChange={e => setLogAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-3 bg-[#0D1117] border border-[#21262D] rounded-lg text-sm text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B4A] transition-colors"
                    onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,74,0.15)')}
                    onBlur={e =>  (e.currentTarget.style.boxShadow = '')}
                  />
                  {panelMember.status === 'partial' && (
                    <p className="text-[11px] text-[#8B949E] mt-1">
                      Suggested: {formatDollars(Math.max(0, panelMember.amountDue - panelMember.amountPaid))} remaining
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1.5">Notes (optional)</label>
                  <input
                    type="text"
                    value={logNotes}
                    onChange={e => setLogNotes(e.target.value)}
                    placeholder="e.g. Cash payment"
                    className="w-full h-10 px-3 bg-[#0D1117] border border-[#21262D] rounded-lg text-sm text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B4A] transition-colors"
                    onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,74,0.15)')}
                    onBlur={e =>  (e.currentTarget.style.boxShadow = '')}
                  />
                </div>
                <button
                  onClick={() => logPayment(panelMember.memberId)}
                  disabled={!logAmount || parseFloat(logAmount) <= 0 || savingPayment}
                  className="w-full h-10 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPayment ? 'Saving…' : 'Log Payment'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New Period modal ──────────────────────────────────────────────────── */}
      {showNewPeriod && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewPeriod(false) }}
        >
          <div
            className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
            style={{ animation: 'modalIn 200ms ease-out' }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#21262D]">
              <h2 className="text-white font-semibold text-lg">New Dues Period</h2>
              <button
                onClick={() => setShowNewPeriod(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
              >
                <X size={17} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <PeriodFormFields
                name={newName} setName={setNewName}
                amount={newAmount} setAmount={setNewAmount}
                date={newDate} setDate={setNewDate}
                lateFee={newLateFee} setLateFee={setNewLateFee}
              />
              {periodError && <p className="text-[#E5484D] text-sm">{periodError}</p>}
              <p className="text-[#8B949E] text-xs">
                A $0 payment record will be auto-generated for all {members.filter(m => m.user_id).length} active members.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262D]">
              <button
                onClick={() => { setShowNewPeriod(false); setPeriodError('') }}
                className="h-10 px-4 rounded-lg border border-[#21262D] text-white text-sm font-medium hover:border-[#30363D] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createPeriod}
                disabled={!newName.trim() || !newAmount || !newDate || savingPeriod}
                className="h-10 px-4 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPeriod ? 'Creating…' : 'Create Period'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Period modal ─────────────────────────────────────────────────── */}
      {editingPeriod && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditingPeriod(null) }}
        >
          <div
            className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
            style={{ animation: 'modalIn 200ms ease-out' }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#21262D]">
              <h2 className="text-white font-semibold text-lg">Edit Period</h2>
              <button
                onClick={() => setEditingPeriod(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
              >
                <X size={17} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <PeriodFormFields
                name={editName} setName={setEditName}
                amount={editAmount} setAmount={setEditAmount}
                date={editDate} setDate={setEditDate}
                lateFee={editLateFee} setLateFee={setEditLateFee}
              />
              {editError && <p className="text-[#E5484D] text-sm">{editError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262D]">
              <button
                onClick={() => setEditingPeriod(null)}
                className="h-10 px-4 rounded-lg border border-[#21262D] text-white text-sm font-medium hover:border-[#30363D] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePeriodEdit}
                disabled={!editName.trim() || !editAmount || !editDate || savingEdit}
                className="h-10 px-4 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation modal ─────────────────────────────────────────── */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDeleteId(null) }}
        >
          <div
            className="w-full max-w-sm bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
            style={{ animation: 'modalIn 200ms ease-out' }}
          >
            <div className="p-6">
              <h2 className="text-white font-semibold text-lg mb-2">Delete Period</h2>
              <p className="text-[#8B949E] text-sm leading-relaxed">
                Delete{' '}
                <span className="text-white font-medium">
                  &ldquo;{periods.find(p => p.id === confirmDeleteId)?.name}&rdquo;
                </span>
                ? This will permanently remove all payment records for this period. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262D]">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="h-10 px-4 rounded-lg border border-[#21262D] text-white text-sm font-medium hover:border-[#30363D] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deletePeriod}
                disabled={deletingPeriod}
                className="h-10 px-4 rounded-lg bg-[#E5484D] text-white text-sm font-medium hover:bg-[#CC3C40] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {deletingPeriod ? 'Deleting…' : 'Delete Period'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Reminders modal ──────────────────────────────────────────────── */}
      {showReminders && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowReminders(false) }}
        >
          <div
            className="w-full max-w-sm bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
            style={{ animation: 'modalIn 200ms ease-out' }}
          >
            <div className="p-6">
              <h2 className="text-white font-semibold text-lg mb-2">Send Reminders</h2>
              {unpaidCount > 0 ? (
                <p className="text-[#8B949E] text-sm leading-relaxed">
                  Send payment reminders to{' '}
                  <span className="text-white font-medium">{unpaidCount} unpaid member{unpaidCount !== 1 ? 's' : ''}</span>{' '}
                  in <span className="text-white font-medium">{selectedPeriod?.name}</span>?
                </p>
              ) : (
                <p className="text-[#8B949E] text-sm">
                  All members have paid — no reminders needed.
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262D]">
              <button
                onClick={() => setShowReminders(false)}
                className="h-10 px-4 rounded-lg border border-[#21262D] text-white text-sm font-medium hover:border-[#30363D] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendReminders}
                disabled={sendingReminders || unpaidCount === 0}
                className="h-10 px-4 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReminders ? 'Sending…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframe animations ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </DashboardShell>
  )
}

// ── Shared form fields component ─────────────────────────────────────────────

function PeriodFormFields({
  name, setName, amount, setAmount, date, setDate, lateFee, setLateFee,
}: {
  name: string; setName: (v: string) => void
  amount: string; setAmount: (v: string) => void
  date: string; setDate: (v: string) => void
  lateFee: string; setLateFee: (v: string) => void
}) {
  const inputClass = "w-full h-10 px-3 bg-[#0D1117] border border-[#21262D] rounded-lg text-sm text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B4A] transition-colors"
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,74,0.15)')
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.boxShadow = '')
  return (
    <>
      <div>
        <label className="block text-xs text-[#8B949E] uppercase tracking-[0.05em] mb-1.5">Period Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Spring 2026"
          className={inputClass} onFocus={onFocus} onBlur={onBlur} autoFocus />
      </div>
      <div>
        <label className="block text-xs text-[#8B949E] uppercase tracking-[0.05em] mb-1.5">Amount Per Member ($)</label>
        <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="0.00" className={inputClass} onFocus={onFocus} onBlur={onBlur} />
      </div>
      <div>
        <label className="block text-xs text-[#8B949E] uppercase tracking-[0.05em] mb-1.5">Due Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className={inputClass} onFocus={onFocus} onBlur={onBlur} />
      </div>
      <div>
        <label className="block text-xs text-[#8B949E] uppercase tracking-[0.05em] mb-1.5">
          Late Fee ($) <span className="normal-case font-normal text-[#8B949E]">— optional</span>
        </label>
        <input type="number" min="0" step="0.01" value={lateFee} onChange={e => setLateFee(e.target.value)}
          placeholder="0.00" className={inputClass} onFocus={onFocus} onBlur={onBlur} />
        <p className="text-[10px] text-[#8B949E] mt-1">Added to balance after due date passes.</p>
      </div>
    </>
  )
}

// ── Period dropdown row ───────────────────────────────────────────────────────

function PeriodDropdownRow({
  period, isSelected, isManager, onSelect, onEdit, onArchive, onDelete,
}: {
  period: DuesPeriod
  isSelected: boolean
  isManager: boolean
  onSelect: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex items-center group px-3 py-2 hover:bg-[#21262D] transition-colors ${
        isSelected ? 'bg-[rgba(255,107,74,0.06)]' : ''
      } ${!period.is_active ? 'opacity-60' : ''}`}
    >
      <button onClick={onSelect} className="flex-1 text-left">
        <span className={`text-sm ${isSelected ? 'text-[#FF6B4A]' : 'text-white'}`}>
          {period.name}
        </span>
      </button>
      {isManager && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="w-6 h-6 flex items-center justify-center rounded text-[#8B949E] hover:text-white hover:bg-[#30363D] transition-colors"
            title="Edit period"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onArchive() }}
            className="w-6 h-6 flex items-center justify-center rounded text-[#8B949E] hover:text-white hover:bg-[#30363D] transition-colors"
            title={period.is_active ? 'Archive' : 'Restore'}
          >
            {period.is_active ? <Archive size={11} /> : <ArchiveRestore size={11} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="w-6 h-6 flex items-center justify-center rounded text-[#8B949E] hover:text-[#E5484D] hover:bg-[#30363D] transition-colors"
            title="Delete period"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  )
}
