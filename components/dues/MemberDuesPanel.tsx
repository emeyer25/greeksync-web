'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface DuesPayment {
  id: string
  dues_period_id: string
  member_id: string
  amount_paid: number
  paid_at: string
  logged_by: string | null
  notes: string | null
}

type PaymentStatus = 'paid' | 'partial' | 'overdue' | 'unpaid'
type PanelTab = 'period' | 'history'

export interface MemberDuesRow {
  memberId: string
  memberName: string
  amountDue: number
  amountPaid: number
  status: PaymentStatus
  dueDate: string
  payments: DuesPayment[]
}

export interface HistoryEntry {
  period: { id: string; name: string; due_date: string }
  payments: DuesPayment[]
  amountPaid: number
  amountDue: number
  status: PaymentStatus
}

interface Props {
  member: MemberDuesRow
  isManager: boolean
  selectedPeriodIsActive: boolean
  memberHistory: HistoryEntry[]
  loadingHistory: boolean
  getMemberName: (userId: string | null) => string
  onClose: () => void
  onLoadHistory: () => void
  onLogPayment: (amountCents: number, notes: string) => Promise<void>
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { bg: string; color: string; label: string }> = {
    paid:    { bg: 'rgba(63,184,140,0.15)',  color: '#3FB88C', label: 'Paid'    },
    partial: { bg: 'rgba(240,180,41,0.15)',  color: '#F0B429', label: 'Partial' },
    overdue: { bg: 'rgba(229,72,77,0.15)',   color: '#E5484D', label: 'Overdue' },
    unpaid:  { bg: 'rgba(229,72,77,0.15)',   color: '#E5484D', label: 'Unpaid'  },
  }
  const s = map[status]
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

export default function MemberDuesPanel({
  member, isManager, selectedPeriodIsActive, memberHistory, loadingHistory,
  getMemberName, onClose, onLoadHistory, onLogPayment,
}: Props) {
  const [panelTab, setPanelTab] = useState<PanelTab>('period')
  const [logAmount, setLogAmount] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPanelTab('period')
    if (member.status !== 'paid') {
      const remaining = Math.max(0, member.amountDue - member.amountPaid)
      setLogAmount(remaining > 0 ? (remaining / 100).toFixed(2) : '')
    } else {
      setLogAmount('')
    }
    setLogNotes('')
  }, [member.memberId])

  async function handleLogPayment() {
    const amountCents = Math.round(parseFloat(logAmount) * 100)
    if (!amountCents || amountCents <= 0) return
    setSaving(true)
    await onLogPayment(amountCents, logNotes.trim())
    setLogAmount('')
    setLogNotes('')
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="absolute right-0 top-0 h-full w-full sm:max-w-[420px] bg-[#161B22] border-l border-[#21262D] flex flex-col"
        style={{ animation: 'slideIn 250ms cubic-bezier(0.4,0,0.2,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#21262D] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[rgba(255,107,74,0.12)] border border-[rgba(255,107,74,0.2)] flex items-center justify-center text-[#FF6B4A] text-sm font-bold flex-shrink-0">
              {getInitials(member.memberName)}
            </div>
            <div>
              <p className="text-white font-semibold text-base leading-tight">{member.memberName}</p>
              <div className="mt-0.5">
                <StatusBadge status={member.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors flex-shrink-0"
          >
            <X size={17} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#21262D] flex-shrink-0">
          {(['period', 'history'] as PanelTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setPanelTab(tab)
                if (tab === 'history' && memberHistory.length === 0) onLoadHistory()
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {panelTab === 'period' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-[#8B949E] uppercase tracking-[0.08em] mb-1">Total Due</p>
                  <p className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                    {formatDollars(member.amountDue)}
                  </p>
                </div>
                <div className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-[#8B949E] uppercase tracking-[0.08em] mb-1">Paid</p>
                  <p className="text-[#3FB88C] font-semibold text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                    {formatDollars(member.amountPaid)}
                  </p>
                </div>
                <div className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-[#8B949E] uppercase tracking-[0.08em] mb-1">Remaining</p>
                  <p className="font-semibold text-sm" style={{
                    fontFamily: 'var(--font-mono)',
                    color: member.amountPaid >= member.amountDue ? '#3FB88C' : '#F0B429',
                  }}>
                    {formatDollars(Math.max(0, member.amountDue - member.amountPaid))}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em] mb-3">
                  Payment History
                </p>
                {member.payments.filter(p => p.amount_paid > 0).length === 0 ? (
                  <p className="text-[#8B949E] text-sm">No payments logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {[...member.payments]
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
                          <p className="text-[#8B949E] text-xs">Logged by {getMemberName(p.logged_by)}</p>
                          {p.notes && <p className="text-[#8B949E] text-xs mt-1 italic">{p.notes}</p>}
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

        {/* Log Payment footer */}
        {isManager && member.status !== 'paid' && panelTab === 'period' && selectedPeriodIsActive && (
          <div className="border-t border-[#21262D] p-6 space-y-4 flex-shrink-0">
            <p className="text-[11px] font-medium text-[#8B949E] uppercase tracking-[0.08em]">Log Payment</p>
            <div>
              <label className="block text-xs text-[#8B949E] mb-1.5">Amount ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={logAmount} onChange={e => setLogAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-3 bg-[#0D1117] border border-[#21262D] rounded-lg text-sm text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B4A] transition-colors"
                onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,74,0.15)')}
                onBlur={e =>  (e.currentTarget.style.boxShadow = '')}
              />
              {member.status === 'partial' && (
                <p className="text-[11px] text-[#8B949E] mt-1">
                  Suggested: {formatDollars(Math.max(0, member.amountDue - member.amountPaid))} remaining
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-[#8B949E] mb-1.5">Notes (optional)</label>
              <input
                type="text" value={logNotes} onChange={e => setLogNotes(e.target.value)}
                placeholder="e.g. Cash payment"
                className="w-full h-10 px-3 bg-[#0D1117] border border-[#21262D] rounded-lg text-sm text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B4A] transition-colors"
                onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,74,0.15)')}
                onBlur={e =>  (e.currentTarget.style.boxShadow = '')}
              />
            </div>
            <button
              onClick={handleLogPayment}
              disabled={!logAmount || parseFloat(logAmount) <= 0 || saving}
              className="w-full h-10 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Log Payment'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
