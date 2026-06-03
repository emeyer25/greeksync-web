import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { EventFormData, EventGeneratorResult } from '@/types/event-generator'

export async function POST(req: NextRequest) {
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const body: { formData: EventFormData; result: EventGeneratorResult } = await req.json()
  const { formData, result } = body

  const { data, error } = await supabase.from('events').insert({
    event_type: formData.eventType,
    theme: formData.theme,
    date: formData.date,
    vibe: formData.vibe,
    headcount: formData.headcount,
    sections: formData.sections,
    generated_content: result,
  }).select('id').single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, id: data.id })
}
