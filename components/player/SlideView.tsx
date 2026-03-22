'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Copy, Check, Code2, ExternalLink, X } from 'lucide-react'
import { Slide } from '@/lib/types'

interface SlideViewProps {
  slide: Slide
  isActive?: boolean
}

export default function SlideView({ slide, isActive }: SlideViewProps) {
  const [copied, setCopied] = useState(false)
  const [showCodeOverlay, setShowCodeOverlay] = useState(false)

  if (!slide) return <div className="w-full h-full bg-surface" />

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!slide.code_content) return
    await navigator.clipboard.writeText(slide.code_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const CodeBlock = (
    <div className="w-full h-full bg-[#0D1117] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#161B22] border-b border-[#30363D] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          {slide.code_language && (
            <span className="text-[11px] text-[#8B949E] font-mono">{slide.code_language}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Code2 size={11} className="text-[#8B949E]" />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-mono text-[#60A5FA] hover:text-blue-300 transition-colors bg-[#1F2937] px-2 py-1 rounded"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'הועתק!' : 'העתק'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <pre className="text-[12px] font-mono text-[#E6EDF3] leading-relaxed whitespace-pre-wrap break-words">
          {slide.code_content || '// אין קוד'}
        </pre>
      </div>
    </div>
  )

  if (slide.slide_type === 'code') {
    // Hybrid: image as background + code overlay button
    if (slide.image_url) {
      return (
        <div className="w-full h-full relative">
          <Image src={slide.image_url} alt="" fill className="object-cover" priority={isActive} />

          {/* Code overlay button */}
          {!showCodeOverlay && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowCodeOverlay(true) }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-white/20 text-white text-xs font-mono px-3 py-1.5 rounded-full hover:bg-black/85 transition-colors"
            >
              <Code2 size={12} />
              {'</> קוד'}
            </button>
          )}

          {/* Code full-screen overlay */}
          {showCodeOverlay && (
            <div
              className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col"
              onClick={(e) => { e.stopPropagation(); setShowCodeOverlay(false) }}
            >
              <div className="flex items-center justify-end px-3 py-2 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCodeOverlay(false) }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden mx-3 mb-3 rounded-lg" onClick={(e) => e.stopPropagation()}>
                {CodeBlock}
              </div>
            </div>
          )}
        </div>
      )
    }

    // Pure code slide (no image)
    return CodeBlock
  }

  if (slide.slide_type === 'hotspot') {
    const x = slide.hotspot_x ?? 50
    const y = slide.hotspot_y ?? 80
    const label = slide.hotspot_label || 'קרא עוד'

    return (
      <div className="w-full h-full relative">
        {slide.image_url ? (
          <Image src={slide.image_url} alt="" fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}

        {/* Hotspot button at creator-defined position */}
        <div
          className="absolute"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {slide.hotspot_url ? (
            <a
              href={slide.hotspot_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg transition-all hover:scale-105 whitespace-nowrap"
            >
              <ExternalLink size={12} />
              {label}
            </a>
          ) : (
            <div className="flex items-center gap-1.5 bg-primary/80 text-white text-xs font-semibold px-4 py-2 rounded-xl border-2 border-primary/60 whitespace-nowrap">
              <ExternalLink size={12} />
              {label}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default: media slide
  return (
    <div className="w-full h-full relative">
      {slide.image_url ? (
        <Image
          src={slide.image_url}
          alt=""
          fill
          className="object-cover"
          priority={isActive}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center">
          <div className="text-muted text-sm">שקף ריק</div>
        </div>
      )}
    </div>
  )
}
