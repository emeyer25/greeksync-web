'use client'

import { useState } from 'react'
import type { EventFormData, OutputSection } from '@/types/event-generator'
import { ALL_SECTIONS, SECTION_META } from '@/types/event-generator'

const EVENT_TYPES = [
  'Mixer',
  'Date Party',
  'Formal',
  'Darty / Day Party',
  'Philanthropy Event',
  'Brotherhood / Sisterhood Event',
  'Rush Event',
  'House Party',
  'Other',
]

const VIBE_SUGGESTIONS = [
  'Tropical', 'Retro 80s', 'Black & Gold', 'Neon', 'Western',
  'Old Money', 'Y2K', 'Hollywood Glam', 'Glow in the Dark', 'Garden Party',
]

interface EventFormProps {
  onSubmit: (data: EventFormData) => void
  isLoading: boolean
}

export default function EventForm({ onSubmit, isLoading }: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    eventType: '',
    theme: '',
    date: '',
    vibe: '',
    headcount: 100,
    sections: [...ALL_SECTIONS],
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'headcount' ? Number(value) : value,
    }))
  }

  const handleVibeChip = (vibe: string) => {
    setFormData((prev) => ({ ...prev, vibe }))
  }

  const toggleSection = (section: OutputSection) => {
    setFormData((prev) => {
      const has = prev.sections.includes(section)
      // Keep at least one section selected
      if (has && prev.sections.length === 1) return prev
      return {
        ...prev,
        sections: has
          ? prev.sections.filter((s) => s !== section)
          : [...prev.sections, section],
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const isValid =
    formData.eventType &&
    formData.theme &&
    formData.date &&
    formData.vibe &&
    formData.headcount > 0 &&
    formData.sections.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Event Type */}
        <div className="space-y-2">
          <label htmlFor="eventType" className="block text-sm font-medium text-zinc-300">
            Event Type
          </label>
          <select
            id="eventType"
            name="eventType"
            value={formData.eventType}
            onChange={handleChange}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all appearance-none cursor-pointer"
          >
            <option value="" disabled className="bg-zinc-900">
              Select event type...
            </option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type} className="bg-zinc-900">
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label htmlFor="date" className="block text-sm font-medium text-zinc-300">
            Event Date
          </label>
          <input
            id="date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all [color-scheme:dark]"
          />
        </div>

        {/* Theme */}
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="theme" className="block text-sm font-medium text-zinc-300">
            Theme / Concept
          </label>
          <input
            id="theme"
            type="text"
            name="theme"
            value={formData.theme}
            onChange={handleChange}
            required
            placeholder="e.g. Neon Jungle, White Out, Casino Night..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          />
        </div>

        {/* Vibe */}
        <div className="space-y-3 md:col-span-2">
          <label htmlFor="vibe" className="block text-sm font-medium text-zinc-300">
            Vibe / Aesthetic
          </label>
          <input
            id="vibe"
            type="text"
            name="vibe"
            value={formData.vibe}
            onChange={handleChange}
            required
            placeholder="Describe the energy, aesthetic, dress code..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          />
          <div className="flex flex-wrap gap-2">
            {VIBE_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleVibeChip(suggestion)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  formData.vibe === suggestion
                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                    : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Headcount */}
        <div className="space-y-2">
          <label htmlFor="headcount" className="block text-sm font-medium text-zinc-300">
            Expected Headcount
          </label>
          <div className="relative">
            <input
              id="headcount"
              type="number"
              name="headcount"
              value={formData.headcount}
              onChange={handleChange}
              required
              min={1}
              max={5000}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
              people
            </span>
          </div>
        </div>
      </div>

      {/* Section toggles */}
      <div className="space-y-3 pt-2 border-t border-white/5">
        <label className="block text-sm font-medium text-zinc-300">
          What to generate
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_SECTIONS.map((section) => {
            const { label, emoji } = SECTION_META[section]
            const active = formData.sections.includes(section)
            return (
              <button
                key={section}
                type="button"
                onClick={() => toggleSection(section)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                    : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                }`}
              >
                <span>{emoji}</span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full py-4 px-6 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating your event...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>✨</span>
            Generate Event Content
          </span>
        )}
      </button>
    </form>
  )
}
