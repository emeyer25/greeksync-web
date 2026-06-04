export interface SavedEvent {
  id: string
  created_at: string
  event_type: string
  theme: string
  date: string
  vibe: string
  headcount: number
  location?: string | null
  description?: string | null
  flyer_url?: string | null
  chapter_id?: string | null
}
