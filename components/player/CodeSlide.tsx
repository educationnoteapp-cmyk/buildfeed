'use client'
import { useState } from 'react'

interface CodeSlideProps {
  content: string
  language: string
}

export function CodeSlide({ content, language }: CodeSlideProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative w-full h-full bg-[#0D1117] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161B22] border-b border-[#30363D]">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-xs text-muted font-mono">{language}</span>
        <button
          onClick={copy}
          className="text-xs text-muted hover:text-text transition-colors font-mono"
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre className="p-5 overflow-auto h-[calc(100%-40px)] text-sm font-mono text-[#E6EDF3] leading-relaxed">
        <code>{content}</code>
      </pre>
    </div>
  )
}
