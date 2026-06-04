import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.replace('@', '').trim()
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })

  const rapidApiKey = process.env.RAPIDAPI_KEY

  if (rapidApiKey) {
    return fetchViaRapidApi(username, rapidApiKey)
  }
  return fetchViaOgScrape(username)
}

async function fetchViaRapidApi(username: string, apiKey: string) {
  const body = new URLSearchParams({ username_or_url: username })

  const res = await fetch(
    'https://instagram-scraper-stable-api.p.rapidapi.com/ig_get_fb_profile_v3.php',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
      body: body.toString(),
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    console.error('[instagram/rapidapi]', res.status, await res.text())
    return NextResponse.json({ error: 'Profile not found or API error' }, { status: 404 })
  }

  const data = await res.json()

  // Prefer the HD photo; fall back to the standard one
  const photoUrl =
    data.hd_profile_pic_url_info?.url ?? data.profile_pic_url ?? null

  return NextResponse.json({
    username: data.username ?? username,
    name: data.full_name ?? null,
    photoUrl,
    bio: data.biography ?? null,
    followerCount: data.follower_count ?? null,
    isVerified: data.is_verified ?? false,
  })
}

async function fetchViaOgScrape(username: string) {
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html',
      },
      cache: 'no-store',
    })

    if (!res.ok) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const html = await res.text()
    const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)
    const photoUrl = ogImageMatch?.[1] ?? null
    const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)
    const title = ogTitleMatch?.[1] ?? null
    const nameMatch = title?.match(/^(.+?)\s*\(@/)
    const name = nameMatch?.[1]?.trim() ?? null

    return NextResponse.json({ username, name, photoUrl })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
