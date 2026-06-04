import Link from 'next/link'
import Logo from '@/components/ui/Logo'

const FEATURES = [
  {
    overline: 'Social Calendar',
    heading: 'Every chapter event, in one place.',
    desc: 'Plan events with RSVP tracking, flyers, and a full history. Stay organized across the whole semester without the chaos.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    overline: 'Rush Management',
    heading: 'Track every PNM from first contact to bid day.',
    desc: 'Manage potential new members through every stage with notes, photos, status updates, and contact logs — no spreadsheet required.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    overline: 'Chapter Roster',
    heading: 'Your whole brotherhood, one click away.',
    desc: 'Role-based access, invite links, and full privilege control. Onboard new members in minutes, not days.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z"/>
      </svg>
    ),
  },
]

const IMAGES = [
  '/images/images.jpg',
  '/images/images-1.jpg',
  '/images/images-2.jpg',
  '/images/images-3.jpg',
  '/images/images-4.jpg',
  '/images/images-5.jpg',
  '/images/image.webp',
  '/images/e646255d9087b1510195592403f4afa4.jpg',
]

// 4 columns × 3 rows = 12 cells, cycling through the 8 images
const COLLAGE_CELLS = Array.from({ length: 12 }, (_, i) => IMAGES[i % IMAGES.length])

// Duplicate for seamless marquee loop
const STRIP_IMAGES = [...IMAGES, ...IMAGES]

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
      <section className="relative min-h-[calc(100vh-56px)] flex items-center overflow-hidden">
        {/* 4×3 photo collage background */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3">
          {COLLAGE_CELLS.map((src, i) => (
            <div key={i} className="overflow-hidden">
              <img
                src={src}
                alt=""
                className="w-full h-full"
                style={{
                  objectFit: 'cover',
                  filter: 'brightness(0.7) saturate(1.1)',
                }}
              />
            </div>
          ))}
        </div>

        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(14,14,14,0.2) 0%, rgba(14,14,14,0.75) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 w-full">
          <p className="text-[#FF6B4A] text-xs font-medium uppercase tracking-[0.05em] mb-6">
            Built for Greek life
          </p>
          <h1
            className="font-bold text-[48px] leading-[1.2] tracking-tight mb-6 max-w-[600px]"
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
            Calendar. Rush. Roster. One platform.
          </p>
          <Link
            href="/register"
            className="inline-block bg-[#FF6B4A] hover:bg-[#E85A3A] text-white font-medium text-base px-8 py-3 rounded-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

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
                <p className="text-[#8B949E] text-[15px] leading-relaxed max-w-[480px]">
                  {f.desc}
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-32 h-32 rounded-2xl bg-[#21262D] flex items-center justify-center text-[#8B949E]">
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
            animation: 'marquee 32s linear infinite',
          }}
        >
          {STRIP_IMAGES.map((src, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-48 h-32 rounded-lg overflow-hidden"
            >
              <img
                src={src}
                alt=""
                className="w-full h-full"
                style={{
                  objectFit: 'cover',
                  filter: 'brightness(0.7) saturate(1.1)',
                }}
              />
            </div>
          ))}
        </div>
      </div>

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
