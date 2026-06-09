import Image from 'next/image'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

interface Props {
  name: string
  photoUrl?: string | null
  size?: number
  className?: string
}

export default function MemberAvatar({ name, photoUrl, size = 40, className = '' }: Props) {
  const sizeClass = size === 64 ? 'w-16 h-16 text-xl' : size === 32 ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  const fontSize = size === 64 ? 'text-xl' : size === 32 ? 'text-xs' : 'text-sm'

  if (photoUrl) {
    return (
      <div
        className={`rounded-full overflow-hidden flex-shrink-0 ${sizeClass} ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={e => {
            // fall back to initials on broken image
            const target = e.currentTarget
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              parent.style.background = 'rgba(255,107,74,0.15)'
              parent.style.display = 'flex'
              parent.style.alignItems = 'center'
              parent.style.justifyContent = 'center'
              parent.innerHTML = `<span style="color:#FF6B4A;font-weight:600;font-size:${size >= 64 ? '1.25rem' : size >= 40 ? '0.875rem' : '0.75rem'}">${getInitials(name)}</span>`
            }
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-[#FF6B4A] flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: 'rgba(255,107,74,0.15)', fontSize: size >= 64 ? '1.25rem' : size >= 40 ? '0.875rem' : '0.75rem' }}
    >
      {getInitials(name)}
    </div>
  )
}
