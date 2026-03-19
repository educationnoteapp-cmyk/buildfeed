'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Slide } from '@/lib/types'
import SlideView from './SlideView'

interface SlidePlayerProps {
  slides: Slide[]
  title: string
  autoPlay?: boolean
  onComplete?: () => void
  onSandboxOpen?: () => void
}

const MIN_SLIDE_DURATION = 2000 // 2s minimum per slide

export default function SlidePlayer({ slides, title, autoPlay = false, onComplete, onSandboxOpen }: SlidePlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isStarted, setIsStarted] = useState(autoPlay)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const touchStartX = useRef<number>(0)

  const currentSlide = slides[currentIndex]
  const isLast = currentIndex === slides.length - 1

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressRef.current) clearInterval(progressRef.current)
  }, [])

  const goToSlide = useCallback((idx: number) => {
    if (idx < 0 || idx >= slides.length) return
    clearTimers()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    setProgress(0)
    setCurrentIndex(idx)
  }, [slides.length, clearTimers])

  const nextSlide = useCallback(() => {
    if (isLast) {
      setIsPlaying(false)
      onComplete?.()
    } else {
      goToSlide(currentIndex + 1)
    }
  }, [isLast, currentIndex, goToSlide, onComplete])

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1)
  }, [currentIndex, goToSlide])

  const startSlideTimer = useCallback((durationMs: number) => {
    clearTimers()
    setProgress(0)
    startTimeRef.current = Date.now()

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setProgress(Math.min(elapsed / durationMs, 1))
    }, 50)

    timerRef.current = setTimeout(() => {
      clearInterval(progressRef.current!)
      setProgress(1)
      nextSlide()
    }, durationMs)
  }, [clearTimers, nextSlide])

  // Play current slide when playing state changes or slide changes
  useEffect(() => {
    if (!isPlaying || !currentSlide) return

    const audioUrl = currentSlide.audio_url
    const duration = (currentSlide.audio_duration_seconds || 5) * 1000
    const effectiveDuration = Math.max(duration, MIN_SLIDE_DURATION)

    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.play().catch(() => {
        // Fallback to timer if audio fails
        startSlideTimer(effectiveDuration)
      })
      audio.addEventListener('ended', () => {
        setTimeout(() => nextSlide(), 300)
      })
      startSlideTimer(effectiveDuration)
    } else {
      // No audio — use duration as timer
      startSlideTimer(effectiveDuration)
    }

    return () => {
      clearTimers()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [isPlaying, currentIndex]) // eslint-disable-line

  const handleStart = () => {
    setIsStarted(true)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    if (!isStarted) {
      handleStart()
      return
    }
    if (isPlaying) {
      clearTimers()
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      audioRef.current?.play()
      setIsPlaying(true)
    }
  }

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide()
      else prevSlide()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nextSlide, prevSlide])

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-surface"
      style={{ aspectRatio: '16/9' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      <div className="relative w-full h-full">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-300 ${
              idx === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <SlideView slide={slide} isActive={idx === currentIndex} />
          </div>
        ))}
      </div>

      {/* Start overlay (iOS: needs user gesture) */}
      {!isStarted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <button
            onClick={handleStart}
            className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 hover:bg-primary/90 transition-all transform hover:scale-110"
          >
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <p className="text-white/70 text-sm mt-4 font-medium">
            {slides.length <= 8 ? '⚡ Snap' : '📺 Demo'} · {slides.length} slides
          </p>
        </div>
      )}

      {/* Progress bar segments */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
        {slides.map((_, idx) => (
          <div key={idx} className="flex-1 h-[3px] bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: idx < currentIndex ? '100%'
                  : idx === currentIndex ? `${progress * 100}%`
                  : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Controls overlay */}
      {isStarted && (
        <div className="absolute inset-0 z-10 flex">
          {/* Prev zone */}
          <div
            className="w-1/3 h-full cursor-pointer flex items-center pl-3 group"
            onClick={prevSlide}
          >
            {currentIndex > 0 && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </div>
            )}
          </div>

          {/* Center — play/pause tap */}
          <div className="w-1/3 h-full flex items-center justify-center cursor-pointer" onClick={togglePlay}>
            {!isPlaying && (
              <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
                <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Next zone */}
          <div
            className="w-1/3 h-full cursor-pointer flex items-center justify-end pr-3 group"
            onClick={nextSlide}
          >
            {!isLast && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide counter */}
      {isStarted && (
        <div className="absolute bottom-3 right-3 z-10 bg-black/60 text-white/80 text-xs px-2 py-1 rounded-full font-mono">
          {currentIndex + 1} / {slides.length}
        </div>
      )}
    </div>
  )
}
