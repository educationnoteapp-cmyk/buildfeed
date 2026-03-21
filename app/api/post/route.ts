'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { Slide } from '@/lib/types'
import SlideView from './SlideView'
import PlayerActionsMenu from './PlayerActionsMenu'

interface SlidePlayerProps {
  slides: Slide[]
  title: string
  autoPlay?: boolean
  onComplete?: () => void
  bgAudioUrl?: string | null
  bgAudioVolume?: number
  playerMode?: 'auto' | 'manual'
  defaultMuted?: boolean
  postId?: string
  creatorId?: string
  tryVideoUrl?: string | null
  websiteUrl?: string | null
  githubUrl?: string | null
}

const MIN_SLIDE_MS = 2000

export default function SlidePlayer({
  slides, title, autoPlay = true, onComplete,
  bgAudioUrl, bgAudioVolume = 0.3,
  postId, creatorId, tryVideoUrl, websiteUrl, githubUrl,
  playerMode = 'auto', defaultMuted = false,
}: SlidePlayerProps) {
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [isMuted, setIsMuted] = useState(defaultMuted)
  const [progress, setProgress] = useState(0)
  const [isLandscape, setIsLandscape] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const bgAudioRef = useRef<HTMLAudioElement | null>(null)
  const progTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Safe slide access — prevent crashes
  const safeSlides = slides?.length > 0 ? slides : []
  const safeIndex = Math.min(Math.max(0, current), Math.max(0, safeSlides.length - 1))
  const slide = safeSlides[safeIndex]

  // Guard — no slides
  if (safeSlides.length === 0 || !slide) return (
    <div className="relative w-full bg-background rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-muted text-sm">אין שקפים</p>
      </div>
    </div>
  )

  // Landscape detection
  useEffect(() => {
    const check = () => {
      if (typeof window !== 'undefined') {
        setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 1024)
      }
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', () => setTimeout(check, 100))
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check) }
  }, [])

  const clearTimers = useCallback(() => {
    if (progTimer.current) clearInterval(progTimer.current)
    if (slideTimer.current) clearTimeout(slideTimer.current)
  }, [])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
      audioRef.current = null
    }
  }, [])

  const goNext = useCallback(() => {
    stopAudio()
    if (current < safeSlides.length - 1) { setCurrent(c => c + 1) }
    else { setIsPlaying(false); setProgress(100); onComplete?.() }
  }, [current, safeSlides.length, onComplete, stopAudio])

  const goToSlide = useCallback((idx: number) => {
    if (idx < 0 || idx >= safeSlides.length) return
    clearTimers(); stopAudio(); setProgress(0); setCurrent(idx)
  }, [safeSlides.length, clearTimers, stopAudio])

  const playSlide = useCallback((s: Slide | undefined) => {
    if (!s) return
    stopAudio()
    clearTimers()
    const hasAudio = s.audio_url && s.audio_url.length > 0
    const duration = hasAudio
      ? (s.audio_duration_seconds ?? 3) * 1000
      : Math.max((s.slide_duration_seconds ?? 3) * 1000, MIN_SLIDE_MS)
    const start = Date.now()

    progTimer.current = setInterval(() => {
      const pct = Math.min(100, (Date.now() - start) / duration * 100)
      setProgress(pct)
      if (pct >= 100) clearInterval(progTimer.current!)
    }, 50)

    if (hasAudio) {
      const audio = new Audio(s.audio_url!)
      audio.muted = isMuted
      audio.volume = s.audio_volume ?? 1.0
      audioRef.current = audio
      audio.onended = () => {
        clearTimers(); setProgress(100)
        if (playerMode === 'manual') return
        const wait = Math.max(0, MIN_SLIDE_MS - (Date.now() - start))
        slideTimer.current = setTimeout(goNext, wait)
      }
      audio.onerror = () => { slideTimer.current = setTimeout(goNext, duration) }
      audio.play().catch(() => { slideTimer.current = setTimeout(goNext, duration) })
    } else {
      if (playerMode !== 'manual') {
        slideTimer.current = setTimeout(goNext, duration)
      }
    }
  }, [isMuted, goNext, clearTimers, stopAudio, playerMode])

  // Play current slide when current changes or playing state changes
  useEffect(() => {
    if (isPlaying && isStarted && safeSlides[current]) {
      playSlide(safeSlides[current])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isPlaying])

  // Cleanup on unmount
  useEffect(() => {
    return () => { clearTimers(); stopAudio() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Background audio
  useEffect(() => {
    if (!bgAudioUrl) return
    const bg = new Audio(bgAudioUrl)
    bg.loop = true; bg.volume = bgAudioVolume
    bgAudioRef.current = bg
    return () => { bg.pause(); bg.src = '' }
  }, [bgAudioUrl, bgAudioVolume])

  // Mute sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted
  }, [isMuted])

  const handlePause = useCallback(() => {
    clearTimers()
    stopAudio()
    bgAudioRef.current?.pause()
    setIsPlaying(false)
  }, [clearTimers, stopAudio])

  const handleResume = useCallback(() => {
    setIsPlaying(true)
    if (safeSlides[current]) playSlide(safeSlides[current])
    bgAudioRef.current?.play().catch(() => {})
  }, [playSlide, safeSlides, current])

  const togglePlay = useCallback(() => {
    if (!isStarted) {
      setIsStarted(true)
      setIsPlaying(true)
      if (safeSlides[current]) playSlide(safeSlides[current])
      bgAudioRef.current?.play().catch(() => {})
      return
    }
    if (isPlaying) handlePause()
    else handleResume()
  }, [isStarted, isPlaying, safeSlides, current, playSlide, handlePause, handleResume])

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToSlide(current + 1)
      if (e.key === 'ArrowLeft') goToSlide(current - 1)
      if (e.key === ' ') { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, togglePlay, goToSlide])

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) { if (dx < 0) goToSlide(current + 1); else goToSlide(current - 1) }
  }

  const containerClass = isLandscape
    ? 'fixed inset-0 z-50 bg-black'
    : 'relative w-full bg-background rounded-xl overflow-hidden'
  const aspectStyle = isLandscape ? {} : { aspectRatio: '16/9' }

  return (
    <div
      ref={containerRef}
      className={containerClass}
      style={aspectStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide — tap to toggle play/pause */}
      <div className="absolute inset-0 cursor-pointer" onClick={togglePlay}>
        <SlideView slide={slide} isActive />
      </div>

      {/* Start overlay — only before first play */}
      {!isStarted && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer z-10" onClick={togglePlay}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
              <Play size={28} className="text-white ml-1" fill="white" />
            </div>
            <span className="text-white/80 text-sm font-medium text-center px-4">{title}</span>
          </div>
        </div>
      )}

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-20">
        {safeSlides.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 bg-white/25 rounded-full overflow-hidden cursor-pointer" onClick={(e) => { e.stopPropagation(); goToSlide(i) }}>
            <div className="h-full bg-white rounded-full transition-none"
              style={{ width: i < current ? '100%' : i === current ? progress + '%' : '0%' }} />
          </div>
        ))}
      </div>

      {/* Nav arrows */}
      {current > 0 && (
        <button onClick={(e) => { e.stopPropagation(); goToSlide(current - 1) }} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <ChevronLeft size={18} />
        </button>
      )}
      {current < safeSlides.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); goToSlide(current + 1) }} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <ChevronRight size={18} />
        </button>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-xs font-mono">{current + 1} / {safeSlides.length}</span>
          <button onClick={() => setIsMuted(m => !m)} className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        </div>
      </div>

      {/* Actions menu */}
      {postId && creatorId && (
        <PlayerActionsMenu
          postId={postId}
          creatorId={creatorId}
          tryVideoUrl={tryVideoUrl}
          websiteUrl={websiteUrl}
          githubUrl={githubUrl}
          onPause={handlePause}
          onResume={handleResume}
        />
      )}
    </div>
  )
}
