import Link from 'next/link'
import type { EventGeneratorResult } from '@/types/event-generator'
import ResultSection from './ResultSection'

interface ResultsDisplayProps {
  result: EventGeneratorResult
  savedToCalendar?: boolean
}

export default function ResultsDisplay({ result, savedToCalendar }: ResultsDisplayProps) {
  const { themeNames, flyerCopy, instagramCaptions, memberEmail, dayOfTimeline } = result

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-violet-500/30" />
        <span className="text-violet-400 text-sm font-medium uppercase tracking-widest">
          Generated Content
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-violet-500/30" />
      </div>

      {savedToCalendar && (
        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-2">
          <span className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <span>✅</span>
            Event saved to your calendar
          </span>
          <Link
            href="/calendar"
            className="text-xs text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
          >
            View Calendar →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Theme Names */}
        {themeNames && themeNames.length > 0 && (
          <ResultSection
            title="Theme Names"
            emoji="✨"
            copyText={themeNames.join('\n')}
          >
            <ul className="space-y-2">
              {themeNames.map((name, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-medium text-white">{name}</span>
                </li>
              ))}
            </ul>
          </ResultSection>
        )}

        {/* Flyer Copy */}
        {flyerCopy && (
          <ResultSection
            title="Flyer Copy"
            emoji="📄"
            copyText={`${flyerCopy.headline}\n${flyerCopy.subheadline}\n\n${flyerCopy.body}`}
          >
            <div className="space-y-2">
              <p className="text-white font-bold text-base">{flyerCopy.headline}</p>
              <p className="text-violet-300 font-medium">{flyerCopy.subheadline}</p>
              <p className="text-zinc-400 text-xs leading-relaxed">{flyerCopy.body}</p>
            </div>
          </ResultSection>
        )}

        {/* Instagram Captions */}
        {instagramCaptions && instagramCaptions.length > 0 && (
          <ResultSection
            title="Instagram Captions"
            emoji="📸"
            copyText={instagramCaptions.join('\n\n---\n\n')}
          >
            <div className="space-y-3">
              {instagramCaptions.map((caption, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-violet-400 text-xs font-semibold uppercase tracking-wide block mb-1">
                    Option {i + 1}
                  </span>
                  <p className="text-zinc-300 text-xs leading-relaxed">{caption}</p>
                </div>
              ))}
            </div>
          </ResultSection>
        )}

        {/* Member Email */}
        {memberEmail && (
          <ResultSection
            title="Member Email"
            emoji="📧"
            copyText={`Subject: ${memberEmail.subject}\n\n${memberEmail.body}`}
          >
            <div className="space-y-2">
              <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                <span className="text-zinc-500 text-xs uppercase tracking-wide">Subject</span>
                <p className="text-white font-medium text-xs mt-0.5">{memberEmail.subject}</p>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line">
                {memberEmail.body}
              </p>
            </div>
          </ResultSection>
        )}
      </div>

      {/* Day-of Timeline — full width */}
      {dayOfTimeline && dayOfTimeline.length > 0 && (
        <ResultSection
          title="Day-of Timeline"
          emoji="🗓️"
          copyText={dayOfTimeline.map((item) => `${item.time} — ${item.activity}`).join('\n')}
        >
          <div className="space-y-0">
            {dayOfTimeline.map((item, i) => (
              <div key={i} className="flex gap-4 relative">
                {i < dayOfTimeline.length - 1 && (
                  <div className="absolute left-[29px] top-8 bottom-0 w-px bg-violet-500/20" />
                )}
                <div className="flex-shrink-0 w-14 pt-1">
                  <span className="text-violet-400 text-xs font-mono font-medium">
                    {item.time}
                  </span>
                </div>
                <div className="flex items-start gap-3 pb-4">
                  <div className="w-3 h-3 rounded-full bg-violet-500/40 border border-violet-500 mt-0.5 flex-shrink-0" />
                  <span className="text-zinc-300 text-sm">{item.activity}</span>
                </div>
              </div>
            ))}
          </div>
        </ResultSection>
      )}
    </div>
  )
}
