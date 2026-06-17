import Link from 'next/link'
import Logo from '@/components/ui/Logo'

const FEATURES = [
  {
    overline: 'Rush Management',
    heading: 'Win rush. Every. Single. Semester.',
    desc: 'Track every PNM from first handshake to bid day. Log notes, photos, contact history, and status — all in one place. No more lost spreadsheets, no more dropped leads.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    stat: 'Built for bid day',
  },
  {
    overline: 'Social Calendar',
    heading: 'Plan parties. Track RSVP\'s. Own the social scene.',
    desc: 'Organize every function, mixer, philanthropy, and formal with RSVP tracking and a full event history. Know who\'s coming before you order the kegs.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
    stat: 'Full semester view',
  },
  {
    overline: 'Chapter Roster',
    heading: 'Your whole brotherhood, one click away.',
    desc: 'Role-based access for exec, actives, and pledges. Invite new brothers with a link, revoke access instantly. Built for chapters that actually grow.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z"/>
      </svg>
    ),
    stat: 'Role-based access',
  },
  {
    overline: 'Dues Tracking',
    heading: 'Stop chasing brothers for money.',
    desc: 'Create dues periods, track who\'s paid, who\'s late, and how much is owed. Send automated reminders so you can stop being the bad guy.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        <path d="M16 8H9a2 2 0 0 0 0 4h6a2 2 0 0 1 0 4H8"/>
        <path d="M12 18v-2M12 6V4"/>
      </svg>
    ),
    stat: 'Late fee support',
  },
  {
    overline: 'Meal Planning',
    heading: 'Feed the house. Zero confusion.',
    desc: 'Schedule weekly meals, track what\'s on the menu, and keep the whole chapter in the loop. No more "what\'s for dinner?" texts at 6pm.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
    stat: 'Weekly schedules',
  },
]

// All 13 images — no repeats
const ALL_IMAGES = [
  '/images/fellas.jpg',
  '/images/guys.jpg',
  '/images/roof.jpg',
  '/images/oar2.jpg',
  '/images/images.jpg',
  '/images/images-1.jpg',
  '/images/images-2.jpg',
  '/images/images-3.jpg',
  '/images/images-4.jpg',
  '/images/images-5.jpg',
  '/images/image.webp',
  '/images/e646255d9087b1510195592403f4afa4.jpg',
  '/images/girl.jpg',
]

// Hero collage: 4×3 = 12 cells, first 12 images, no repeats
const COLLAGE_CELLS = ALL_IMAGES.slice(0, 12)

// Marquee strip: all 13 images, duplicated for seamless loop
const STRIP_IMAGES = [...ALL_IMAGES, ...ALL_IMAGES]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#21262D] backdrop-blur-md bg-[#0D1117]/80">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo size="default" />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#8B949E] hover:text-white transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-[#FF6B4A] hover:bg-[#E85A3A] text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-screen flex items-center overflow-hidden">
        {/* 4×3 photo collage background */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-4 sm:grid-cols-4 sm:grid-rows-3 h-full">
          {COLLAGE_CELLS.map((src, i) => (
            <div key={i} className={`overflow-hidden w-full h-full${i >= 8 ? ' hidden sm:block' : ''}`}>
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: 'brightness(0.65) saturate(1.1)' }}
              />
            </div>
          ))}
        </div>

        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(13,17,23,0.15) 0%, rgba(13,17,23,0.80) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 w-full">
          <p className="text-[#FF6B4A] text-xs font-medium uppercase tracking-[0.12em] mb-6">
            Built for Greek life
          </p>
          <h1
            className="font-bold text-[52px] leading-[1.15] tracking-tight mb-6 max-w-[640px]"
            style={{ fontFamily: 'var(--font-satoshi, sans-serif)' }}
          >
            Run your chapter like a{' '}
            <span
              style={{
                textDecoration: 'underline',
                textDecorationColor: '#FF6B4A',
                textDecorationThickness: '3px',
                textUnderlineOffset: '6px',
              }}
            >
              pro.
            </span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-[480px]">
            Rush. Calendar. Roster. Dues. Meals. Everything your chapter needs — one platform, no chaos.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/register"
              className="inline-block bg-[#FF6B4A] hover:bg-[#E85A3A] text-white font-medium text-base px-8 py-3 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="text-[#8B949E] hover:text-white text-sm font-medium transition-colors"
            >
              Already have an account →
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <div className="border-t border-b border-[#21262D] bg-[#161B22] py-4">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-10">
          {[
            { label: 'Rush Tracking', desc: 'PNM to bid' },
            { label: 'Event Planning', desc: 'RSVPs included' },
            { label: 'Dues Collection', desc: 'Late fees & reminders' },
            { label: 'Brother Roster', desc: 'Role-based access' },
            { label: 'Meal Scheduling', desc: 'Weekly menus' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B4A]" />
              <span className="text-white text-sm font-medium">{item.label}</span>
              <span className="text-[#8B949E] text-xs">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features: full-width alternating rows */}
      <section className="border-t border-[#21262D]">
        {FEATURES.map((f, i) => (
          <div
            key={f.overline}
            className={`border-b border-[#21262D] ${i % 2 === 1 ? 'bg-[#161B22]' : 'bg-[#0D1117]'}`}
          >
            <div
              className={`max-w-6xl mx-auto px-6 py-20 flex flex-col ${
                i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'
              } items-center gap-16`}
            >
              <div className="flex-1">
                <p className="text-[#FF6B4A] text-xs font-medium uppercase tracking-[0.05em] mb-4">
                  {f.overline}
                </p>
                <h2
                  className="text-[36px] font-bold leading-[1.2] tracking-tight text-white mb-4"
                  style={{ fontFamily: 'var(--font-satoshi, sans-serif)' }}
                >
                  {f.heading}
                </h2>
                <p className="text-[#8B949E] text-[15px] leading-relaxed max-w-[480px] mb-6">
                  {f.desc}
                </p>
                <span className="inline-block text-xs font-medium text-[#FF6B4A] bg-[rgba(255,107,74,0.12)] px-3 py-1 rounded-full">
                  {f.stat}
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-36 h-36 rounded-2xl bg-[#21262D] border border-[#30363D] flex items-center justify-center text-[#8B949E]">
                  {f.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Auto-scrolling photo strip */}
      <div className="border-t border-b border-[#21262D] overflow-hidden py-4 bg-[#0D1117]">
        <div
          className="flex gap-3"
          style={{
            width: 'max-content',
            animation: 'marquee 40s linear infinite',
          }}
        >
          {STRIP_IMAGES.map((src, i) => (
            <div key={i} className="flex-shrink-0 w-48 h-32 rounded-lg overflow-hidden">
              <img
                src={src}
                alt=""
                className="w-full h-full"
                style={{ objectFit: 'cover', filter: 'brightness(0.7) saturate(1.1)' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* CTA section */}
      <section className="bg-[#0D1117] border-t border-[#21262D] py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-[#FF6B4A] text-xs font-medium uppercase tracking-[0.12em] mb-4">
            Ready to run a tighter chapter?
          </p>
          <h2
            className="text-[42px] font-bold leading-[1.2] tracking-tight text-white mb-4"
            style={{ fontFamily: 'var(--font-satoshi, sans-serif)' }}
          >
            The operating system for your fraternity.
          </h2>
          <p className="text-[#8B949E] text-[15px] leading-relaxed mb-10 max-w-[440px] mx-auto">
            Stop running your chapter through group chats and spreadsheets. GreekSync keeps everything and everyone in sync.
          </p>
          <Link
            href="/register"
            className="inline-block bg-[#FF6B4A] hover:bg-[#E85A3A] text-white font-medium text-base px-10 py-3.5 rounded-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#21262D] py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-[#8B949E] text-sm">GreekSync</span>
          <div className="flex gap-6">
            <Link href="/login" className="text-xs text-[#8B949E] hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="text-xs text-[#8B949E] hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
