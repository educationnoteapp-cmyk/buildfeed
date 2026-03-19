'use client'
import { Slide } from '@/lib/types'
import { CodeSlide } from './CodeSlide'
import Image from 'next/image'

interface SlideViewProps {
  slide: Slide
  isActive: boolean
}

export default function SlideView({ slide, isActive }: SlideViewProps) {
  if (slide.slide_type === 'code') {
    return (
      <div className="w-full h-full p-4">
        <CodeSlide
          content={slide.code_content || ''}
          language={slide.code_language || 'code'}
        />
      </div>
    )
  }

  if (slide.slide_type === 'hotspot') {
    return (
      <div className="relative w-full h-full group">
        {slide.image_url && (
          <Image
            src={slide.image_url}
            alt="slide"
            fill
            className="object-cover"
            priority={isActive}
          />
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <a
            href={slide.hotspot_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-primary text-white font-semibold rounded-xl text-lg hover:bg-primary/90 transition-all transform hover:scale-105 shadow-2xl shadow-primary/30"
            onClick={(e) => e.stopPropagation()}
          >
            Try it free →
          </a>
        </div>
      </div>
    )
  }

  // media slide
  return (
    <div className="relative w-full h-full">
      {slide.image_url ? (
        <Image
          src={slide.image_url}
          alt="slide"
          fill
          className="object-cover"
          priority={isActive}
        />
      ) : (
        <div className="w-full h-full bg-surface flex items-center justify-center">
          <span className="text-muted text-sm">No image</span>
        </div>
      )}
    </div>
  )
}
