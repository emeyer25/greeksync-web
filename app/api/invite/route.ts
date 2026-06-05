import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, token, chapterName, inviterName } = await req.json()

  if (!email || !token) {
    return NextResponse.json({ error: 'Missing email or token' }, { status: 400 })
  }

  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin}/join/${token}`
  const chapterLabel = chapterName ?? 'Your Chapter'
  const inviterLabel = inviterName ? `${inviterName} has invited you` : 'You have been invited'

  const html = [
    '<div style="font-family:Inter,sans-serif;background:#0D1117;color:#E6EDF3;padding:40px;max-width:560px;margin:0 auto;border-radius:12px">',
    `<h1 style="font-size:22px;margin-bottom:8px;color:#ffffff">You&apos;re invited to ${chapterLabel}</h1>`,
    `<p style="color:#8B949E;margin-bottom:24px;font-size:15px">${inviterLabel} to join ${chapterLabel} on GreekSync.</p>`,
    `<a href="${joinUrl}" style="display:inline-block;background:#FF6B4A;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">Accept Invitation</a>`,
    '<p style="color:#8B949E;font-size:13px;margin-top:32px">Or copy this link into your browser:<br/>',
    `<span style="color:#E6EDF3;font-family:monospace">${joinUrl}</span></p>`,
    '<p style="color:#484F58;font-size:12px;margin-top:32px">This invite link expires in 7 days.</p>',
    '</div>',
  ].join('')

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: email,
    subject: `You have been invited to join ${chapterLabel} on GreekSync`,
    html,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
