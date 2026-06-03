'use client'

import { useState } from 'react'
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline'

interface ResultSectionProps {
  title: string
  emoji: string
  children: React.ReactNode
  copyText: string
}

export default function ResultSection({
  title,
  emoji,
  children,
  copyText,
}: ResultSectionProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:border-violet-500/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <h3 className="text-white font-semibold text-sm uppercase tracking-widest">
            {title}
          </h3>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            copied
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          {copied ? (
            <>
              <CheckIcon className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <ClipboardIcon className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="text-zinc-300 text-sm leading-relaxed">{children}</div>
    </div>
  )
}
