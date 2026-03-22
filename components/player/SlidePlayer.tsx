'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Volume2, VolumeX, ExternalLink, RotateCcw } from 'lucide-react'
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
const AUDIO_UNLOCKED_KEY = 'bf_audio_unlocked'

function checkIsIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export default function SlidePlayer({
  slides, title, autoPlay = true, onComplete,
  bgAudioUrl, bgAudioVolume = 0.3,
  postId, creatorId, tryVideoUrl, websiteUrl, githubUrl,
  playerMode = 'auto', defaultMuted = false,
}: SlidePlayerProps) {
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [isMuted, setIsMuted] = useState(true) // תמיד מתחיל מיוטד
  const [progress, setProgress] = useState(0)
  const [isLandscape, setIsLandscape] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [showUnmuteBanner, setShowUnmuteBanner] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const bgAudioRef = useRef<HTMLAudioElement | null>(null)
  const progTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasAutoPlayed = useRef(false)

  const safeSlides = slides?.length > 0 ? slides : []
  const safeIndex = Math.min(Math.max(0, current), Math.max(0, safeSlides.length - 1))
  const slide = safeSlides[safeIndex]

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
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
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

  const handleEnd = useCallback(() => {
    setIsPlaying(false)
    setIsEnded(true)
    onComplete?.()
  }, [onComplete])

  const goNext = useCallback(() => {
    stopAudio()
    if (current < safeSlides.length - 1) {
      setCurrent(c => c + 1)
    } else {
      setProgress(100)
      handleEnd()
    }
  }, [current, safeSlides.length, stopAudio, handleEnd])

  const goToSlide = useCallback((idx: number) => {
    if (idx < 0 || idx >= safeSlides.length) return
    clearTimers(); stopAudio(); setProgress(0); setIsEnded(false); setCurrent(idx)
  }, [safeSlides.length, clearTimers, stopAudio])

  const playSlide = useCallback((s: Slide | undefined, muted: boolean) => {
    if (!s) return
    stopAudio()
    clearTimers()
    const hasAudio = s.audio_url && s.audio_url.length > 0
    const duration = hasAudio
      ? (s.audio_duration_seconds ?? 3) * 1000
      : Math.max((s as any).slide_duration_seconds ? (s as any).slide_duration_seconds * 1000 : 3000, MIN_SLIDE_MS)
    const start = Date.now()

    progTimer.current = setInterval(() => {
      const pct = Math.min(100, (Date.now() - start) / duration * 100)
      setProgress(pct)
      if (pct >= 100) clearInterval(progTimer.current!)
    }, 50)

    if (hasAudio) {
      const audio = new Audio(s.audio_url!)
      audio.muted = muted
      audio.volume = (s as any).audio_volume ?? 1.0
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
  }, [goNext, clearTimers, stopAudio, playerMode])

  // Autoplay on mount — תמיד מיוטד
  useEffect(() => {
    if (!autoPlay || hasAutoPlayed.current) return
    hasAutoPlayed.current = true

    // בדוק אם המשתמש כבר ביטל mute בעבר
    const wasUnlocked = typeof window !== 'undefined' && localStorage.getItem(AUDIO_UNLOCKED_KEY) === '1'
    const startMuted = wasUnlocked ? defaultMuted : true
    setIsMuted(startMuted)
    setShowUnmuteBanner(!startMuted ? false : !wasUnlocked)

    setIsStarted(true)
    setIsPlaying(true)
    if (safeSlides[0]) playSlide(safeSlides[0], startMuted)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Play when slide changes
  useEffect(() => {
    if (isPlaying && isStarted && safeSlides[current]) {
      playSlide(safeSlides[current], isMuted)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isPlaying])

  // Cleanup
  useEffect(() => {
    return () => { clearTimers(); stopAudio() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Background audio
  useEffect(() => {
    if (!bgAudioUrl) return
    const bg = new Audio(bgAudioUrl)
    bg.loop = true; bg.volume = bgAudioVolume; bg.muted = isMuted
    bgAudioRef.current = bg
    if (isPlaying) bg.play().catch(() => {})
    return () => { bg.pause(); bg.src = '' }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgAudioUrl, bgAudioVolume])

  // Mute sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted
    if (bgAudioRef.current) bgAudioRef.current.muted = isMuted
  }, [isMuted])

  const handleUnmute = useCallback(() => {
    setIsMuted(false)
    setShowUnmuteBanner(false)
    // שמור שהמשתמש ביטל mute — בפעם הבאה יתחיל עם קול
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUDIO_UNLOCKED_KEY, '1')
    }
    // הפעל מחדש את השקף הנוכחי עם קול
    stopAudio()
    clearTimers()
    if (safeSlides[current]) playSlide(safeSlides[current], false)
    bgAudioRef.current?.play().catch(() => {})
  }, [safeSlides, current, playSlide, stopAudio, clearTimers])

  const handlePause = useCallback(() => {
    clearTimers(); stopAudio()
    bgAudioRef.current?.pause()
    setIsPlaying(false)
  }, [clearTimers, stopAudio])

  const handleResume = useCallback(() => {
    setIsPlaying(true)
    if (safeSlides[current]) playSlide(safeSlides[current], isMuted)
    if (!isMuted) bgAudioRef.current?.play().catch(() => {})
  }, [playSlide, safeSlides, current, isMuted])

  const handleSlideTap = useCallback(() => {
    if (isEnded) return
    if (isPlaying) handlePause()
    else handleResume()
  }, [isEnded, isPlaying, handlePause, handleResume])

  const handleReplay = useCallback(() => {
    setIsEnded(false)
    setProgress(0)
    setCurrent(0)
    setIsPlaying(true)
    setIsStarted(true)
    if (safeSlides[0]) playSlide(safeSlides[0], isMuted)
  }, [safeSlides, playSlide, isMuted])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToSlide(current + 1)
      if (e.key === 'ArrowLeft') goToSlide(current - 1)
      if (e.key === ' ') { e.preventDefault(); handleSlideTap() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, handleSlideTap, goToSlide])

  // Guard — אחרי כל ה-hooks
  if (safeSlides.length === 0 || !slide) return (
    <div className="relative w-full bg-background rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-muted text-sm">אין שקפים</p>
      </div>
    </div>
  )

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
      {/* Slide */}
      <div className="absolute inset-0 cursor-pointer" onClick={handleSlideTap}>
        <SlideView slide={slide} isActive />
      </div>

      {/* Unmute banner — מופיע רק פעם אחת */}
      {showUnmuteBanner && !isEnded && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={(e) => { e.stopPropagation(); handleUnmute() }}
            className="flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-black/90 transition-colors shadow-lg"
          >
            <VolumeX size={15} className="text-white/70" />
            <span>לחץ להפעלת קול</span>
            <Volume2 size={15} />
          </button>
        </div>
      )}

      {/* End CTA */}
      {isEnded && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 gap-4 px-6">
          <p className="text-white font-semibold text-lg text-center">{title}</p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2.5 font-medium transition-colors text-sm"
                onClick={(e) => e.stopPropagation()}>
                <ExternalLink size={15} />
                בקר באתר המוצר
              </a>
            )}
            {tryVideoUrl && (
              <a href={tryVideoUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2.5 font-medium transition-colors text-sm"
                onClick={(e) => e.stopPropagation()}>
                נסה את המוצר
              </a>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleReplay() }}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2.5 font-medium transition-colors text-sm">
              <RotateCcw size={14} />
              צפה שוב
            </button>
          </div>
        </div>
      )}

      {/* Progress bars */}
      {!isEnded && (
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-20">
          {safeSlides.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 bg-white/25 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => { e.stopPropagation(); goToSlide(i) }}>
              <div className="h-full bg-white rounded-full transition-none"
                style={{ width: i < current ? '100%' : i === current ? progress + '%' : '0%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Nav arrows */}
      {!isEnded && current > 0 && (
        <button onClick={(e) => { e.stopPropagation(); goToSlide(current - 1) }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <ChevronLeft size={18} />
        </button>
      )}
      {!isEnded && current < safeSlides.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); goToSlide(current + 1) }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <ChevronRight size={18} />
        </button>
      )}

      {/* Bottom bar — mute toggle */}
      {!isEnded && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 flex items-center justify-end"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-xs font-mono">{current + 1} / {safeSlides.length}</span>
            <button
              onClick={() => {
                if (isMuted) handleUnmute()
                else setIsMuted(true)
              }}
              className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* Actions menu */}
      {postId && creatorId && !isEnded && (
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
