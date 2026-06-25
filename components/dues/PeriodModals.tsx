'use client'

import { X, Archive, ArchiveRestore } from 'lucide-react'

export interface DuesPeriod {
  id: string
  name: string
  amount_per_member: number
  due_date: string
  late_fee_cents: number
  is_active: boolean
}

const inputClass = "w-full h-10 px-3 bg-[#0D1117] border border-[#21262D] rounded-lg text-sm text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B4A] transition-colors"
const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,74,0.15)')
const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.boxShadow = '')

function PeriodFormFields({
  name, setName, amount, setAmount, date, setDate, lateFee, setLateFee,
}: {
  name: string; setName: (v: string) => void
  amount: string; setAmount: (v: string) => void
  date: string; setDate: (v: string) => void
  lateFee: string; setLateFee: (v: string) => void
}) {
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

const Backdrop = ({ children, onBackdropClick }: { children: React.ReactNode; onBackdropClick: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
    onClick={e => { if (e.target === e.currentTarget) onBackdropClick() }}
  >
    {children}
  </div>
)

// ── New Period Modal ──────────────────────────────────────────────────────────

interface NewPeriodModalProps {
  memberCount: number
  name: string; setName: (v: string) => void
  amount: string; setAmount: (v: string) => void
  date: string; setDate: (v: string) => void
  lateFee: string; setLateFee: (v: string) => void
  saving: boolean
  error: string
  onClose: () => void
  onCreate: () => void
}

export function NewPeriodModal({
  memberCount, name, setName, amount, setAmount, date, setDate,
  lateFee, setLateFee, saving, error, onClose, onCreate,
}: NewPeriodModalProps) {
  return (
    <Backdrop onBackdropClick={onClose}>
      <div className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
        style={{ animation: 'modalIn 200ms ease-out' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#21262D]">
          <h2 className="text-white font-semibold text-lg">New Dues Period</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors">
            <X size={17} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <PeriodFormFields name={name} setName={setName} amount={amount} setAmount={setAmount}
            date={date} setDate={setDate} lateFee={lateFee} setLateFee={setLateFee} />
          {error && <p className="text-[#E5484D] text-sm">{error}</p>}
          <p className="text-[#8B949E] text-xs">
            A $0 payment record will be auto-generated for all {memberCount} active members.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262D]">
          <button onClick={() => { onClose() }}
            className="h-10 px-4 rounded-lg border border-[#21262D] text-white text-sm font-medium hover:border-[#30363D] transition-colors">
            Cancel
          </button>
          <button onClick={onCreate} disabled={!name.trim() || !amount || !date || saving}
            className="h-10 px-4 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Creating…' : 'Create Period'}
          </button>
        </div>
      </div>
    </Backdrop>
  )
}

// ── Edit Period Modal ─────────────────────────────────────────────────────────

interface EditPeriodModalProps {
  name: string; setName: (v: string) => void
  amount: string; setAmount: (v: string) => void
  date: string; setDate: (v: string) => void
  lateFee: string; setLateFee: (v: string) => void
  saving: boolean
  error: string
  onClose: () => void
  onSave: () => void
}

export function EditPeriodModal({
  name, setName, amount, setAmount, date, setDate,
  lateFee, setLateFee, saving, error, onClose, onSave,
}: EditPeriodModalProps) {
  return (
    <Backdrop onBackdropClick={onClose}>
      <div className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
        style={{ animation: 'modalIn 200ms ease-out' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#21262D]">
          <h2 className="text-white font-semibold text-lg">Edit Period</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors">
            <X size={17} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <PeriodFormFields name={name} setName={setName} amount={amount} setAmount={setAmount}
            date={date} setDate={setDate} lateFee={lateFee} setLateFee={setLateFee} />
          {error && <p className="text-[#E5484D] text-sm">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262D]">
          <button onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[#21262D] text-white text-sm font-medium hover:border-[#30363D] transition-colors">
            Cancel
          </button>
          <button onClick={onSave} disabled={!name.trim() || !amount || !date || saving}
            className="h-10 px-4 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Backdrop>
  )
}

// ── Delete Period Modal ───────────────────────────────────────────────────────

interface DeletePeriodModalProps {
  periodName: string | undefined
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeletePeriodModal({ periodName, deleting, onClose, onConfirm }: DeletePeriodModalProps) {
  return (
    <Backdrop onBackdropClick={onClose}>
      <div className="w-full max-w-sm bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
        style={{ animation: 'modalIn 200ms ease-out' }}>
        <div className="p-6">
          <h2 className="text-white font-semibold text-lg mb-2">Delete Period</h2>
          <p className="text-[#8B949E] text-sm leading-relaxed">
            Delete{' '}
            <span className="text-white font-medium">&ldquo;{periodName}&rdquo;</span>
            ? This will permanently remove all payment records for this period. This cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262D]">
          <button onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[#21262D] text-white text-sm font-medium hover:border-[#30363D] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="h-10 px-4 rounded-lg bg-[#E5484D] text-white text-sm font-medium hover:bg-[#CC3C40] active:scale-[0.98] transition-all disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete Period'}
          </button>
        </div>
      </div>
    </Backdrop>
  )
}

// ── Send Reminders Modal ──────────────────────────────────────────────────────

interface SendRemindersModalProps {
  unpaidCount: number
  periodName: string | undefined
  sending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function SendRemindersModal({ unpaidCount, periodName, sending, onClose, onConfirm }: SendRemindersModalProps) {
  return (
    <Backdrop onBackdropClick={onClose}>
      <div className="w-full max-w-sm bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden"
        style={{ animation: 'modalIn 200ms ease-out' }}>
        <div className="p-6">
          <h2 className="text-white font-semibold text-lg mb-2">Send Reminders</h2>
          {unpaidCount > 0 ? (
            <p className="text-[#8B949E] text-sm leading-relaxed">
              Send payment reminders to{' '}
              <span className="text-white font-medium">{unpaidCount} unpaid member{unpaidCount !== 1 ? 's' : ''}</span>{' '}
              in <span className="text-white font-medium">{periodName}</span>?
            </p>
          ) : (
            <p className="text-[#8B949E] text-sm">All members have paid — no reminders needed.</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262D]">
          <button onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[#21262D] text-white text-sm font-medium hover:border-[#30363D] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={sending || unpaidCount === 0}
            className="h-10 px-4 rounded-lg bg-[#FF6B4A] text-white text-sm font-medium hover:bg-[#E85A3A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {sending ? 'Sending…' : 'Confirm'}
          </button>
        </div>
      </div>
    </Backdrop>
  )
}
