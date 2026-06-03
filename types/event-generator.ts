export type OutputSection =
  | 'themeNames'
  | 'flyerCopy'
  | 'instagramCaptions'
  | 'memberEmail'
  | 'dayOfTimeline'

export const ALL_SECTIONS: OutputSection[] = [
  'themeNames',
  'flyerCopy',
  'instagramCaptions',
  'memberEmail',
  'dayOfTimeline',
]

export const SECTION_META: Record<OutputSection, { label: string; emoji: string }> = {
  themeNames: { label: 'Theme Names', emoji: '✨' },
  flyerCopy: { label: 'Flyer Copy', emoji: '📄' },
  instagramCaptions: { label: 'Instagram', emoji: '📸' },
  memberEmail: { label: 'Member Email', emoji: '📧' },
  dayOfTimeline: { label: 'Timeline', emoji: '🗓️' },
}

export interface EventFormData {
  eventType: string
  theme: string
  date: string
  vibe: string
  headcount: number
  sections: OutputSection[]
}

export interface FlyerCopy {
  headline: string
  subheadline: string
  body: string
}

export interface TimelineItem {
  time: string
  activity: string
}

export interface MemberEmail {
  subject: string
  body: string
}

export interface EventGeneratorResult {
  themeNames?: string[]
  flyerCopy?: FlyerCopy
  instagramCaptions?: string[]
  memberEmail?: MemberEmail
  dayOfTimeline?: TimelineItem[]
}

export interface SavedEvent {
  id: string
  created_at: string
  event_type: string
  theme: string
  date: string
  vibe: string
  headcount: number
  sections: OutputSection[]
  generated_content: EventGeneratorResult
  location?: string | null
  description?: string | null
  flyer_url?: string | null
  chapter_id?: string | null
}
