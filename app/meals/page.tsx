'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import DashboardShell from '@/components/layout/DashboardShell'
import { ChevronLeft, ChevronRight, X, Plus, ImageIcon } from 'lucide-react'

interface Meal {
  id: string
  chapter_id: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  title: string
  description: string | null
  image_url: string | null
  date: string
  created_by: string | null
  created_at: string
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6)
  const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${s} - ${e}`
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const
type MealType = (typeof MEAL_TYPES)[number]
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

export default function MealsPage() {
  const { chapterId, user, canEdit } = useAuth()

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMeal, setModalMeal] = useState<Meal | null>(null)
  const [modalDate, setModalDate] = useState('')
  const [modalMealType, setModalMealType] = useState<MealType>('breakfast')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImageFile, setFormImageFile] = useState<File | null>(null)
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const todayStr = toDateStr(new Date())

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekDateStrs = weekDays.map(toDateStr)

  useEffect(() => {
    loadMeals(weekStart)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, weekStart])

  async function loadMeals(ws: Date) {
    if (!supabase || !chapterId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('chapter_id', chapterId)
      .gte('date', toDateStr(ws))
      .lte('date', toDateStr(addDays(ws, 6)))
    setMeals((data as Meal[]) || [])
    setLoading(false)
  }

  function getMeal(dateStr: string, mealType: MealType): Meal | undefined {
    return meals.find(m => m.date === dateStr && m.meal_type === mealType)
  }

  function openModal(dateStr: string, mealType: MealType, existing?: Meal) {
    setModalDate(dateStr)
    setModalMealType(mealType)
    setModalMeal(existing ?? null)
    setFormTitle(existing?.title ?? '')
    setFormDescription(existing?.description ?? '')
    setFormImageFile(null)
    setFormImagePreview(existing?.image_url ?? null)
    setSaveError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setModalMeal(null)
    setFormTitle('')
    setFormDescription('')
    setFormImageFile(null)
    setFormImagePreview(null)
    setSaveError(null)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFormImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setFormImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    if (!supabase || !chapterId) return null
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${chapterId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('meal-photos')
      .upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('meal-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    if (!formTitle.trim()) return
    if (!supabase) { setSaveError('Database not configured.'); return }
    if (!chapterId) { setSaveError('No chapter found. Try signing out and back in.'); return }
    setSaving(true)
    setSaveError(null)
    let imageUrl = modalMeal?.image_url ?? null
    if (formImageFile) {
      imageUrl = await uploadPhoto(formImageFile)
    }
    if (modalMeal) {
      const { error } = await supabase.from('meals').update({
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        image_url: imageUrl,
      }).eq('id', modalMeal.id)
      if (error) { setSaving(false); setSaveError(error.message); return }
    } else {
      const { error } = await supabase.from('meals').insert({
        chapter_id: chapterId,
        meal_type: modalMealType,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        image_url: imageUrl,
        date: modalDate,
        created_by: user?.id ?? null,
      })
      if (error) { setSaving(false); setSaveError(error.message); return }
    }
    setSaving(false)
    closeModal()
    loadMeals(weekStart)
  }

  async function handleDelete() {
    if (!supabase || !modalMeal) return
    setDeleting(true)
    setSaveError(null)
    const { error } = await supabase.from('meals').delete().eq('id', modalMeal.id)
    if (error) { setDeleting(false); setSaveError(error.message); return }
    setDeleting(false)
    closeModal()
    loadMeals(weekStart)
  }

  return (
    <DashboardShell>
      <div className="flex-1 overflow-auto">
        <div className="px-4 sm:px-8 py-6 sm:py-8">

          {/* Page header */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF6B4A] mb-3 whitespace-nowrap">
                Chapter Meals
              </p>
              <h1 className="text-2xl sm:text-[28px] font-bold text-white leading-tight tracking-tight">
                Meal Plan
              </h1>
            </div>

            {/* Week navigation */}
            <div className="flex items-center gap-3 pb-0.5">
              <button
                onClick={() => setWeekStart(w => addDays(w, -7))}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#21262D] text-[#8B949E] hover:text-white hover:border-[#30363D] transition-all duration-150"
                aria-label="Previous week"
              >
                <ChevronLeft size={16} strokeWidth={1.5} />
              </button>
              <span className="text-sm font-medium text-white min-w-[190px] text-center select-none font-mono">
                {formatWeekRange(weekStart)}
              </span>
              <button
                onClick={() => setWeekStart(w => addDays(w, 7))}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#21262D] text-[#8B949E] hover:text-white hover:border-[#30363D] transition-all duration-150"
                aria-label="Next week"
              >
                <ChevronRight size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Week grid */}
          <div className="overflow-x-auto">
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden min-w-[720px]">

              {/* Day header row */}
              <div
                className="grid border-b border-[#21262D]"
                style={{ gridTemplateColumns: '88px repeat(7, 1fr)' }}
              >
                <div className="border-r border-[#21262D]" />
                {weekDays.map((day, i) => {
                  const isToday = weekDateStrs[i] === todayStr
                  return (
                    <div
                      key={i}
                      className={`px-3 py-3 text-center border-r border-[#21262D] last:border-r-0${isToday ? ' border-b-2 border-b-[#FF6B4A]' : ''}`}
                    >
                      <p className="text-[10px] font-medium text-[#8B949E] uppercase tracking-[0.08em]">
                        {DAY_NAMES[i]}
                      </p>
                      <p className={`text-sm font-semibold mt-0.5 font-mono${isToday ? ' text-[#FF6B4A]' : ' text-white'}`}>
                        {day.getDate()}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Meal type rows */}
              {MEAL_TYPES.map((mealType, rowIdx) => (
                <div
                  key={mealType}
                  className={`grid${rowIdx < MEAL_TYPES.length - 1 ? ' border-b border-[#21262D]' : ''}`}
                  style={{ gridTemplateColumns: '88px repeat(7, 1fr)' }}
                >
                  {/* Row label */}
                  <div className="border-r border-[#21262D] px-3 pt-4 flex items-start">
                    <p className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-[0.08em]">
                      {MEAL_LABELS[mealType]}
                    </p>
                  </div>

                  {/* Day cells */}
                  {weekDays.map((_, dayIdx) => {
                    const dateStr = weekDateStrs[dayIdx]
                    const meal = loading ? undefined : getMeal(dateStr, mealType)
                    const isToday = dateStr === todayStr

                    return (
                      <div
                        key={dayIdx}
                        className={`border-r border-[#21262D] last:border-r-0 min-h-[108px] relative${isToday ? ' bg-[rgba(255,107,74,0.02)]' : ''}`}
                      >
                        {loading ? (
                          <div className="m-2 h-[84px] rounded-lg bg-[#21262D] animate-pulse" />
                        ) : meal ? (
                          <button
                            onClick={() => { if (canEdit) openModal(dateStr, mealType, meal) }}
                            className={`w-full h-full min-h-[108px] p-2.5 text-left transition-all duration-150${canEdit ? ' hover:bg-[#21262D]/40 cursor-pointer' : ' cursor-default'}`}
                          >
                            {meal.image_url && (
                              <div className="w-full h-14 rounded-md overflow-hidden mb-2 bg-[#21262D]">
                                <img
                                  src={meal.image_url}
                                  alt={meal.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <p className="text-white text-xs font-medium leading-tight line-clamp-2">
                              {meal.title}
                            </p>
                            {meal.description && (
                              <p className="text-[#8B949E] text-[11px] mt-0.5 line-clamp-1">
                                {meal.description}
                              </p>
                            )}
                          </button>
                        ) : canEdit ? (
                          <button
                            onClick={() => openModal(dateStr, mealType)}
                            className="w-full h-full min-h-[108px] flex items-center justify-center transition-colors duration-150 group"
                            aria-label={`Add ${mealType}`}
                          >
                            <div className="w-7 h-7 rounded-full border border-dashed border-[#30363D] group-hover:border-[#FF6B4A]/40 flex items-center justify-center text-[#30363D] group-hover:text-[#FF6B4A]/60 transition-all duration-150">
                              <Plus size={13} strokeWidth={1.5} />
                            </div>
                          </button>
                        ) : (
                          <div className="w-full min-h-[108px]" />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ animation: 'modalIn 200ms ease-out' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D] flex-shrink-0">
              <div>
                <p className="text-[10px] font-semibold text-[#FF6B4A] uppercase tracking-[0.08em]">
                  {MEAL_LABELS[modalMealType]}
                </p>
                <h2 className="text-[15px] font-semibold text-white mt-0.5">
                  {modalMeal ? 'Edit Meal' : 'Add Meal'}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

              {/* Photo upload */}
              <div>
                <label className="label block mb-2">Photo</label>
                {formImagePreview ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden group">
                    <img
                      src={formImagePreview}
                      alt="Meal preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => { setFormImageFile(null); setFormImagePreview(null) }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-24 border border-dashed border-[#21262D] hover:border-[#30363D] rounded-lg flex flex-col items-center justify-center gap-1.5 text-[#8B949E] hover:text-white transition-all duration-150"
                  >
                    <ImageIcon size={18} strokeWidth={1.5} />
                    <span className="text-xs">Upload photo</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Meal name */}
              <div>
                <label className="label block mb-2">Meal Name</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Grilled Chicken Alfredo"
                  className="w-full h-10 px-3 rounded-lg bg-[#0D1117] border border-[#21262D] text-white text-[15px] placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B4A] focus:ring-2 focus:ring-[rgba(255,107,74,0.15)] transition-all duration-150"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="label block mb-2">
                  Description <span className="normal-case font-normal text-[#8B949E]">(optional)</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Add notes, allergens, or serving info"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0D1117] border border-[#21262D] text-white text-[15px] placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B4A] focus:ring-2 focus:ring-[rgba(255,107,74,0.15)] resize-none transition-all duration-150"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#21262D] flex-shrink-0">
              {saveError && (
                <p className="text-[#E5484D] text-xs mb-3 leading-snug">
                  {saveError}
                </p>
              )}
              <div className="flex items-center gap-3">
                {modalMeal && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting || saving}
                    className="h-10 px-4 rounded-lg border border-[#E5484D]/30 text-[#E5484D] text-sm font-medium hover:bg-[rgba(229,72,77,0.08)] transition-all duration-150 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={closeModal}
                  className="h-10 px-4 rounded-lg border border-[#21262D] text-[#8B949E] text-sm font-medium hover:text-white hover:border-[#30363D] transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || deleting || !formTitle.trim()}
                  className="h-10 px-5 rounded-lg bg-[#FF6B4A] hover:bg-[#E85A3A] text-white text-sm font-medium transition-all duration-150 disabled:opacity-50 active:scale-[0.98]"
                >
                  {saving ? 'Saving...' : modalMeal ? 'Save Changes' : 'Add Meal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
