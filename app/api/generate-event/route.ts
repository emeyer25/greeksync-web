import { NextRequest } from 'next/server'
import anthropic from '@/lib/anthropic'
import { buildEventPrompt } from '@/lib/prompts'
import type { EventFormData } from '@/types/event-generator'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const body: EventFormData = await req.json()

    if (!body.eventType || !body.theme || !body.date || !body.vibe || !body.headcount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const prompt = buildEventPrompt(body)

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          stream.on('text', (text) => {
            const chunk = `data: ${JSON.stringify({ text })}\n\n`
            controller.enqueue(encoder.encode(chunk))
          })

          await stream.finalMessage()
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Stream error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
