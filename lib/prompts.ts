import type { EventFormData, OutputSection } from '@/types/event-generator'

const SECTION_SCHEMA: Record<OutputSection, string> = {
  themeNames: `  "themeNames": ["Name 1", "Name 2", "Name 3", "Name 4"]`,
  flyerCopy: `  "flyerCopy": {
    "headline": "Bold, punchy headline that captures the theme",
    "subheadline": "Date, location placeholder, and key vibe in one line",
    "body": "2-3 sentences of flyer body copy that hypes the event"
  }`,
  instagramCaptions: `  "instagramCaptions": [
    "Caption option 1 with relevant emojis and 5-7 hashtags",
    "Caption option 2 with different angle and emojis and hashtags",
    "Caption option 3 as a shorter punchy option with emojis and hashtags"
  ]`,
  memberEmail: `  "memberEmail": {
    "subject": "Email subject line that drives opens",
    "body": "Full email body for chapter members. Cover: what the event is, date/time, what to wear/bring, logistics, and hype close. 3-4 paragraphs."
  }`,
  dayOfTimeline: `  "dayOfTimeline": [
    { "time": "HH:MM AM/PM", "activity": "Activity description" }
  ]`,
}

const SECTION_NOTES: Record<OutputSection, string> = {
  themeNames: '- themeNames: 4 creative, catchy name options for this specific theme',
  flyerCopy: '- flyerCopy: print-ready copy with a bold headline, supporting subheadline, and 2-3 sentence body',
  instagramCaptions: '- instagramCaptions: 3 caption options — one hype, one storytelling, one short & punchy. Include relevant emojis and hashtags',
  memberEmail: '- memberEmail: a full chapter email with subject line. Cover what the event is, date/time, attire, logistics, and an energetic close',
  dayOfTimeline: '- dayOfTimeline: 6-8 realistic schedule items from setup (~2hrs before) through end of night including setup, doors, key moments, cleanup',
}

export function buildEventPrompt(data: EventFormData): string {
  const { eventType, theme, date, vibe, headcount, sections } = data

  const schemaLines = sections.map((s) => SECTION_SCHEMA[s]).join(',\n')
  const instructions = sections.map((s) => SECTION_NOTES[s]).join('\n')

  return `You are an expert Greek life social chair consultant helping plan a college fraternity/sorority event. Generate creative, high-energy content that will get members excited.

Event Details:
- Event Type: ${eventType}
- Theme: ${theme}
- Date: ${date}
- Vibe / Aesthetic: ${vibe}
- Expected Headcount: ${headcount} people

Generate the following sections:
${instructions}

Return ONLY a valid JSON object — no markdown fences, no extra commentary, no trailing text. Use exactly this structure:

{
${schemaLines}
}`
}
