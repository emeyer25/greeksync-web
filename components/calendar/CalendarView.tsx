'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react'
import type { SavedEvent } from '@/types/event-generator'

interface CalendarViewProps {
  events: SavedEvent[]
  onAddEvent?: () => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarView({ events, onAddEvent }: CalendarViewProps) {
  const router = useRouter()
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [showPast, setShowPast] = useState(false)

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  const upcomingEvents = events
    .filter(e => new Date(e.date + 'T00:00:00') >= new Date(today.toDateString()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6)

  const pastEvents = events
    .filter(e => new Date(e.date + 'T00:00:00') < new Date(today.toDateString()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Calendar size={48} strokeWidth={1} className="text-[#8B949E] mb-5" />
        <h3 className="text-lg font-semibold text-white mb-2">No events this month</h3>
        <p className="text-[#8B949E] text-sm max-w-xs mb-7">
          Your chapter calendar is empty. Add your first event to get started.
        </p>
        {onAddEvent && (
          <button onClick={onAddEvent} className="btn-primary">
            + New Event
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Calendar grid */}
      <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">

        {/* Month nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center text-[#8B949E] hover:text-white transition-colors duration-150 rounded-lg hover:bg-[#21262D]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[15px] font-semibold text-white">
            {MONTHS[currentMonth]} {currentYear}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center text-[#8B949E] hover:text-white transition-colors duration-150 rounded-lg hover:bg-[#21262D]"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#21262D]">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8B949E]">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }).map((_, i) => {
            const day = i - firstDay + 1
            const isCurrentMonth = day >= 1 && day <= daysInMonth
            const isToday = isCurrentMonth &&
              day === today.getDate() &&
              currentMonth === today.getMonth() &&
              currentYear === today.getFullYear()
            const dayEvents = isCurrentMonth ? getEventsForDay(day) : []

            return (
              <div
                key={i}
                className={[
                  'min-h-[72px] p-1.5 border-b border-r border-[#21262D]',
                  isToday ? 'border-b-2 border-b-[#FF6B4A]' : '',
                  !isCurrentMonth ? 'opacity-20' : '',
                ].join(' ')}
              >
                {isCurrentMonth && (
                  <>
                    <span className={[
                      'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                      isToday ? 'text-[#FF6B4A] font-bold' : 'text-[#8B949E]',
                    ].join(' ')}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(event => (
                        <button
                          key={event.id}
                          onClick={() => router.push(`/events/${event.id}`)}
                          className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium text-white bg-[#21262D] border-l-2 border-[#FF6B4A] hover:bg-[#30363D] truncate transition-colors duration-150"
                        >
                          {event.theme}
                        </button>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-[#8B949E] pl-1">+{dayEvents.length - 2}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
          <p className="label mb-4">Upcoming</p>
          <div className="space-y-1">
            {upcomingEvents.map(event => (
              <button
                key={event.id}
                onClick={() => router.push(`/events/${event.id}`)}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-[#21262D] transition-colors duration-150 text-left group"
              >
                <div className="w-0.5 h-8 rounded-full bg-[#FF6B4A] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{event.theme}</p>
                  <p className="font-mono text-[#8B949E] text-xs mt-0.5">
                    {event.event_type} · {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <ChevronRight size={12} className="text-[#8B949E] group-hover:text-white flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Past events */}
      {pastEvents.length > 0 && (
        <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
          <button
            onClick={() => setShowPast(v => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <p className="label">Past Events ({pastEvents.length})</p>
            <ChevronDown
              size={14}
              className={`text-[#8B949E] transition-transform duration-200 ${showPast ? 'rotate-180' : ''}`}
            />
          </button>
          {showPast && (
            <div className="space-y-1 mt-4">
              {pastEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-[#21262D] transition-colors duration-150 text-left group opacity-50 hover:opacity-80"
                >
                  <div className="w-0.5 h-8 rounded-full bg-[#8B949E] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{event.theme}</p>
                    <p className="font-mono text-[#8B949E] text-xs mt-0.5">
                      {event.event_type} · {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <ChevronRight size={12} className="text-[#8B949E] group-hover:text-white flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
