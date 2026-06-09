'use client'

import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, Upload, X, CheckCircle2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type MappedField = 'full_name' | 'first_name' | 'last_name' | 'phone' | 'email' | 'year' | 'hometown' | 'notes' | 'ignore'

interface ColumnMapping {
  header: string
  field: MappedField
  autoDetected: boolean
}

interface ParsedRow {
  [key: string]: string
}

interface RusheeRow {
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  year: string | null
  hometown: string | null
  notes: string | null
}

type DuplicateAction = 'skip' | 'update'

type Step = 'upload' | 'mapping' | 'duplicates' | 'importing' | 'done'

interface ImportResult {
  added: number
  skipped: number
  updated: number
  failed: { row: number; reason: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIELD_OPTIONS: { value: MappedField; label: string }[] = [
  { value: 'full_name',  label: 'Full Name' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name',  label: 'Last Name' },
  { value: 'phone',      label: 'Phone' },
  { value: 'email',      label: 'Email' },
  { value: 'year',       label: 'Year' },
  { value: 'hometown',   label: 'Hometown' },
  { value: 'notes',      label: 'Notes' },
  { value: 'ignore',     label: '— (ignore)' },
]

function autoDetectField(header: string): MappedField | null {
  const h = header.toLowerCase().trim()
  if (['name', 'full name', 'fullname', 'full_name', 'student name', 'rushee name', 'rushee'].includes(h)) return 'full_name'
  if (['first', 'first name', 'firstname', 'fname', 'first_name'].includes(h)) return 'first_name'
  if (['last', 'last name', 'lastname', 'lname', 'last_name', 'surname'].includes(h)) return 'last_name'
  if (['cell', 'phone', 'number', 'phone number', 'mobile', 'cell phone', 'telephone'].includes(h)) return 'phone'
  if (['email', 'email address', 'e-mail'].includes(h)) return 'email'
  if (['year', 'grade', 'class year', 'class', 'graduation year', 'grad year'].includes(h)) return 'year'
  if (['hometown', 'home', 'city', 'home town', 'home city', 'city, state'].includes(h)) return 'hometown'
  if (['notes', 'comments', 'comment', 'note', 'description'].includes(h)) return 'notes'
  return null
}

function normalizePhone(raw: string): string | null {
  if (!raw?.trim()) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return raw.trim() || null
}

function parseFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        // Use header:1 to get raw arrays so numeric/blank headers aren't mangled
        const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
        if (raw.length < 2) { resolve([]); return }
        const headers = (raw[0] as string[]).map((h, i) => (String(h).trim() || `Column ${i + 1}`))
        const rows: ParsedRow[] = (raw.slice(1) as string[][]).map(row =>
          Object.fromEntries(headers.map((h, i) => [h, String(row[i] ?? '')]))
        )
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  chapterId: string | null
  existingRushees: { name: string }[]
  onClose: () => void
  onImported: (newRushees: any[]) => void
}

export default function ImportRusheesModal({ chapterId, existingRushees, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [rawRows, setRawRows] = useState<ParsedRow[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [mappingError, setMappingError] = useState<string | null>(null)

  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>('skip')
  const [duplicateNames, setDuplicateNames] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<RusheeRow[]>([])

  const [importProgress, setImportProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)

  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File handling ──────────────────────────────────────────────────────────

  async function processFile(file: File) {
    setParseError(null)
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setParseError('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.')
      return
    }
    try {
      const rows = await parseFile(file)
      if (rows.length === 0) { setParseError('The file appears to be empty.'); return }
      setFileName(file.name)
      setRawRows(rows)
      const headers = Object.keys(rows[0])
      const maps: ColumnMapping[] = headers.map(h => {
        const detected = autoDetectField(h)
        return { header: h, field: detected ?? 'ignore', autoDetected: detected !== null }
      })
      setMappings(maps)
      setStep('mapping')
    } catch {
      setParseError('Failed to parse the file. Make sure it is a valid spreadsheet.')
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [])

  // ── Mapping step ───────────────────────────────────────────────────────────

  function updateMapping(index: number, field: MappedField) {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, field } : m))
    setMappingError(null)
  }

  function proceedFromMapping() {
    const hasFullName = mappings.some(m => m.field === 'full_name')
    const hasFirst = mappings.some(m => m.field === 'first_name')
    const hasLast  = mappings.some(m => m.field === 'last_name')
    if (!hasFullName && (!hasFirst || !hasLast)) {
      setMappingError('Map either a Full Name column, or both First Name and Last Name columns.')
      return
    }

    const fieldMap: Record<MappedField, string | null> = {
      full_name: null, first_name: null, last_name: null, phone: null, email: null, year: null, hometown: null, notes: null, ignore: null,
    }
    mappings.forEach(m => { if (m.field !== 'ignore') fieldMap[m.field] = m.header })

    const parsed: RusheeRow[] = []
    rawRows.forEach(row => {
      let first = fieldMap.first_name ? String(row[fieldMap.first_name] ?? '').trim() : ''
      let last  = fieldMap.last_name  ? String(row[fieldMap.last_name]  ?? '').trim() : ''
      if (fieldMap.full_name) {
        const full = String(row[fieldMap.full_name] ?? '').trim()
        if (full && (!first || !last)) {
          const parts = full.split(/\s+/)
          first = first || parts[0] || ''
          last  = last  || parts.slice(1).join(' ') || ''
        }
      }
      if (!first && !last) return // skip blank rows
      parsed.push({
        first_name: first,
        last_name:  last,
        phone:    fieldMap.phone     ? normalizePhone(String(row[fieldMap.phone]     ?? '')) : null,
        email:    fieldMap.email     ? String(row[fieldMap.email]     ?? '').trim() || null : null,
        year:     fieldMap.year      ? String(row[fieldMap.year]      ?? '').trim() || null : null,
        hometown: fieldMap.hometown  ? String(row[fieldMap.hometown]  ?? '').trim() || null : null,
        notes:    fieldMap.notes     ? String(row[fieldMap.notes]     ?? '').trim() || null : null,
      })
    })

    const existingNames = new Set(existingRushees.map(r => r.name.toLowerCase().trim()))
    const dupes = parsed.filter(r => {
      const full = `${r.first_name} ${r.last_name}`.toLowerCase().trim()
      return existingNames.has(full)
    })

    setPreviewRows(parsed)
    setDuplicateNames(dupes.map(r => `${r.first_name} ${r.last_name}`))
    setStep('duplicates')
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  async function runImport() {
    if (!supabase) return
    setStep('importing')
    setImportProgress(0)

    const existingNames = new Set(existingRushees.map(r => r.name.toLowerCase().trim()))
    const failed: { row: number; reason: string }[] = []
    let added = 0
    let skipped = 0
    let updated = 0

    const newRusheesFromDB: any[] = []

    for (let i = 0; i < previewRows.length; i++) {
      const row = previewRows[i]
      const fullName = `${row.first_name} ${row.last_name}`.trim()
      const isDupe = existingNames.has(fullName.toLowerCase())

      try {
        if (isDupe && duplicateAction === 'skip') {
          skipped++
        } else if (isDupe && duplicateAction === 'update') {
          const { error } = await supabase
            .from('rushees')
            .update({
              phone: row.phone,
              hometown: row.hometown,
              notes: row.notes,
            })
            .eq('name', fullName)
            .eq('chapter_id', chapterId ?? '')
          if (error) failed.push({ row: i + 2, reason: error.message })
          else updated++
        } else {
          const { data, error } = await supabase
            .from('rushees')
            .insert({
              name: fullName,
              phone: row.phone,
              hometown: row.hometown,
              notes: row.notes,
              status: 'Rushing',
              ...(chapterId ? { chapter_id: chapterId } : {}),
            })
            .select()
            .single()
          if (error) failed.push({ row: i + 2, reason: error.message })
          else { added++; if (data) newRusheesFromDB.push(data) }
        }
      } catch (e: any) {
        failed.push({ row: i + 2, reason: e?.message ?? 'Unknown error' })
      }

      setImportProgress(Math.round(((i + 1) / previewRows.length) * 100))
    }

    setResult({ added, skipped, updated, failed })
    onImported(newRusheesFromDB)
    setStep('done')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const unmappedCount = mappings.filter(m => !m.autoDetected && m.field === 'ignore').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#161B22] border border-[#21262D] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D] flex-shrink-0">
          <div>
            <h2 className="text-[17px] font-semibold text-white">Import Rushees</h2>
            {fileName && <p className="text-xs text-[#8B949E] mt-0.5">{fileName}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* ── STEP: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                ref={dropRef}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl py-14 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors duration-150 ${
                  dragging
                    ? 'border-[#FF6B4A] bg-[rgba(255,107,74,0.04)]'
                    : 'border-[#30363D] hover:border-[#484F58] bg-[#0D1117]'
                }`}
              >
                <Upload size={28} className={dragging ? 'text-[#FF6B4A]' : 'text-[#8B949E]'} strokeWidth={1.5} />
                <div className="text-center">
                  <p className="text-white text-sm font-medium">Drag & drop your file here</p>
                  <p className="text-[#8B949E] text-xs mt-1">or click to browse</p>
                </div>
                <p className="text-[#8B949E]/60 text-xs">Accepted formats: .csv, .xlsx, .xls</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{parseError}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-[#30363D] text-[#8B949E] hover:text-white hover:border-[#484F58] transition-colors"
                >
                  Browse Files
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Column Mapping ── */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div>
                <p className="text-white text-sm font-medium mb-1">Map your columns</p>
                <p className="text-[#8B949E] text-xs">
                  Tell us which column in your file corresponds to each field. Columns we couldn&apos;t auto-detect are flagged.
                </p>
              </div>

              {unmappedCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(240,180,41,0.08)] border border-[rgba(240,180,41,0.2)]">
                  <AlertTriangle size={13} className="text-[#F0B429] flex-shrink-0" />
                  <p className="text-[#F0B429] text-xs">
                    {unmappedCount} column{unmappedCount > 1 ? 's' : ''} couldn&apos;t be auto-detected. Please assign them manually.
                  </p>
                </div>
              )}

              <div className="border border-[#21262D] rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 gap-4 px-4 py-2.5 border-b border-[#21262D] bg-[#0D1117]">
                  <p className="label text-xs">Your Column</p>
                  <p className="label text-xs">Maps To</p>
                </div>
                <div className="divide-y divide-[#21262D]">
                  {mappings.map((m, i) => (
                    <div key={m.header} className="grid grid-cols-2 gap-4 px-4 py-3 items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        {!m.autoDetected && m.field === 'ignore' && (
                          <AlertTriangle size={12} className="text-[#F0B429] flex-shrink-0" />
                        )}
                        {m.autoDetected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3FB88C] flex-shrink-0" />
                        )}
                        <span className="text-white text-sm truncate font-mono">{m.header}</span>
                      </div>
                      <select
                        value={m.field}
                        onChange={e => updateMapping(i, e.target.value as MappedField)}
                        className="field py-1.5 text-sm"
                      >
                        {FIELD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {mappingError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{mappingError}</p>
                </div>
              )}

              <p className="text-[#8B949E]/60 text-xs">
                {rawRows.length} row{rawRows.length !== 1 ? 's' : ''} detected · Rows with empty first and last name will be skipped automatically
              </p>
            </div>
          )}

          {/* ── STEP: Duplicates ── */}
          {step === 'duplicates' && (
            <div className="space-y-5">
              <div className="bg-[#0D1117] border border-[#21262D] rounded-xl p-4 space-y-1">
                <p className="text-white text-sm font-medium">
                  {previewRows.length - duplicateNames.length} new rushee{previewRows.length - duplicateNames.length !== 1 ? 's' : ''} will be added
                </p>
                {duplicateNames.length > 0 && (
                  <p className="text-[#8B949E] text-sm">
                    {duplicateNames.length} already exist{duplicateNames.length === 1 ? 's' : ''} — what should we do?
                  </p>
                )}
              </div>

              {duplicateNames.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[#8B949E] text-xs font-medium uppercase tracking-wider">Duplicate Handling</p>
                  <div className="space-y-2">
                    {(['skip', 'update'] as DuplicateAction[]).map(opt => (
                      <label
                        key={opt}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                          duplicateAction === opt
                            ? 'border-[#FF6B4A] bg-[rgba(255,107,74,0.06)]'
                            : 'border-[#21262D] hover:border-[#30363D]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="dupeAction"
                          value={opt}
                          checked={duplicateAction === opt}
                          onChange={() => setDuplicateAction(opt)}
                          className="mt-0.5 accent-[#FF6B4A]"
                        />
                        <div>
                          <p className="text-white text-sm font-medium">
                            {opt === 'skip' ? 'Skip Duplicates' : 'Update Existing'}
                          </p>
                          <p className="text-[#8B949E] text-xs mt-0.5">
                            {opt === 'skip'
                              ? 'Leave existing rushees unchanged and only add new ones.'
                              : 'Update phone and notes for existing rushees with data from the file.'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <details className="group">
                    <summary className="text-xs text-[#8B949E] hover:text-white cursor-pointer transition-colors list-none flex items-center gap-1">
                      <span className="group-open:hidden">▶</span>
                      <span className="hidden group-open:inline">▼</span>
                      Show {duplicateNames.length} duplicate{duplicateNames.length !== 1 ? 's' : ''}
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {duplicateNames.map(name => (
                        <span key={name} className="px-2 py-0.5 rounded text-xs bg-[#21262D] text-[#8B949E]">{name}</span>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Importing ── */}
          {step === 'importing' && (
            <div className="py-8 flex flex-col items-center gap-6">
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-xs text-[#8B949E] mb-2">
                  <span>Importing…</span>
                  <span className="font-mono">{importProgress}%</span>
                </div>
                <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF6B4A] rounded-full transition-all duration-200"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
              <p className="text-[#8B949E] text-sm">Please don&apos;t close this window</p>
            </div>
          )}

          {/* ── STEP: Done ── */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-[rgba(63,184,140,0.08)] border border-[rgba(63,184,140,0.2)]">
                <CheckCircle2 size={18} className="text-[#3FB88C] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">
                    Successfully imported {result.added} rushee{result.added !== 1 ? 's' : ''}
                  </p>
                  {(result.skipped > 0 || result.updated > 0) && (
                    <p className="text-[#8B949E] text-xs mt-1">
                      {result.skipped > 0 && `${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''} skipped`}
                      {result.skipped > 0 && result.updated > 0 && ' · '}
                      {result.updated > 0 && `${result.updated} duplicate${result.updated !== 1 ? 's' : ''} updated`}
                    </p>
                  )}
                </div>
              </div>

              {result.failed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[#F0B429] text-xs font-medium">{result.failed.length} row{result.failed.length !== 1 ? 's' : ''} failed</p>
                  <div className="bg-[#0D1117] border border-[#21262D] rounded-xl divide-y divide-[#21262D] max-h-40 overflow-y-auto">
                    {result.failed.map(f => (
                      <div key={f.row} className="px-4 py-2.5 flex items-start gap-3">
                        <span className="font-mono text-[#8B949E] text-xs flex-shrink-0">Row {f.row}</span>
                        <span className="text-red-400 text-xs">{f.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#21262D] flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[#30363D] text-[#8B949E] hover:text-white hover:border-[#484F58] transition-colors"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
          <div className="flex items-center gap-2">
            {step === 'mapping' && (
              <button
                onClick={() => { setStep('upload'); setFileName(null) }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#8B949E] hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            {step === 'duplicates' && (
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#8B949E] hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            {step === 'mapping' && (
              <button onClick={proceedFromMapping} className="btn-primary">
                Continue
              </button>
            )}
            {step === 'duplicates' && (
              <button onClick={runImport} className="btn-primary">
                Import {previewRows.length - (duplicateAction === 'skip' ? duplicateNames.length : 0)} Rushees
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
