'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Play, Pause, RotateCcw, Check, Upload } from 'lucide-react'
import { uploadAudio } from '@/lib/r2/upload'

type RecorderState = 'idle' | 'recording' | 'preview' | 'uploading' | 'done' | 'error'

interface AudioRecorderProps {
  postId: string
  slideId: string
  existingAudioUrl?: string | null
  existingDuration?: number | null
  onSaved: (url: string, duration: number) => void
}

// Detect best supported MIME type (iOS uses mp4, Chrome uses webm)
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return 'audio/webm'
}

export default function AudioRecorder({
  postId,
  slideId,
  existingAudioUrl,
  existingDuration,
  onSaved,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>(
    existingAudioUrl ? 'done' : 'idle'
  )
  const [duration, setDuration] = useState(existingDuration ?? 0)
  const [playProgress, setPlayProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl ?? null)
  const [savedUrl, setSavedUrl] = useState<string | null>(existingAudioUrl ?? null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const blobRef = useRef<Blob | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        setDuration(Math.round(elapsed * 10) / 10)
        setState('preview')
        stopStream()
      }

      recorder.start(100) // collect data every 100ms
      startTimeRef.current = Date.now()
      setState('recording')

      // Update duration counter while recording
      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 100) / 10)
      }, 100)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('מיקרופון נדרש. אשר גישה בדפדפן.')
      } else {
        setError('לא ניתן להתחיל הקלטה')
      }
      setState('error')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mediaRecorderRef.current?.stop()
  }, [])

  const discardRecording = useCallback(() => {
    if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
    setAudioUrl(savedUrl) // revert to previously saved
    blobRef.current = null
    setDuration(existingDuration ?? 0)
    setState(savedUrl ? 'done' : 'idle')
  }, [audioUrl, savedUrl, existingDuration])

  const saveRecording = useCallback(async () => {
    if (!blobRef.current) return
    setState('uploading')
    try {
      const result = await uploadAudio(blobRef.current, postId, slideId, duration)
      setSavedUrl(result.url)
      setAudioUrl(result.url)
      setState('done')
      onSaved(result.url, result.duration_seconds)
    } catch {
      setError('שגיאה בשמירה. נסה שוב.')
      setState('preview')
    }
  }, [postId, slideId, duration, onSaved])

  const togglePlay = useCallback(() => {
    if (!audioElRef.current || !audioUrl) return
    const el = audioElRef.current
    if (isPlaying) {
      el.pause()
      setIsPlaying(false)
    } else {
      el.play()
      setIsPlaying(true)
    }
  }, [isPlaying, audioUrl])

  // Attach audio element event listeners when URL changes
  useEffect(() => {
    if (!audioUrl) return
    const el = new Audio(audioUrl)
    audioElRef.current = el

    el.ontimeupdate = () => {
      if (el.duration) setPlayProgress((el.currentTime / el.duration) * 100)
    }
    el.onended = () => {
      setIsPlaying(false)
      setPlayProgress(0)
    }

    return () => {
      el.pause()
      el.src = ''
    }
  }, [audioUrl])

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── IDLE ──────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <button
        onClick={startRecording}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted hover:text-primary group"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
          <Mic size={14} className="text-primary" />
        </div>
        <span className="text-sm font-medium">הקלט אודיו לשקף</span>
      </button>
    )
  }

  // ── RECORDING ─────────────────────────────────────────────
  if (state === 'recording') {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <span className="text-red-400 font-mono text-sm flex-1">{formatDuration(duration)}</span>
        <button
          onClick={stopRecording}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Square size={12} fill="white" /> עצור
        </button>
      </div>
    )
  }

  // ── PREVIEW ───────────────────────────────────────────────
  if (state === 'preview') {
    return (
      <div className="p-3 bg-surface border border-border rounded-xl space-y-2">
        {/* Waveform progress bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="w-8 h-8 flex-shrink-0 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-colors"
          >
            {isPlaying
              ? <Pause size={12} className="text-primary" fill="currentColor" />
              : <Play size={12} className="text-primary ml-0.5" fill="currentColor" />
            }
          </button>
          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-none"
              style={{ width: `${playProgress}%` }}
            />
          </div>
          <span className="text-xs text-muted font-mono flex-shrink-0">{formatDuration(duration)}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={discardRecording}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-muted hover:text-text-main border border-border hover:border-white/20 rounded-lg transition-colors"
          >
            <RotateCcw size={12} /> הקלט שוב
          </button>
          <button
            onClick={saveRecording}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            <Check size={12} /> שמור
          </button>
        </div>
      </div>
    )
  }

  // ── UPLOADING ─────────────────────────────────────────────
  if (state === 'uploading') {
    return (
      <div className="flex items-center gap-2 p-3 bg-surface border border-border rounded-xl">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
        <span className="text-sm text-muted">שומר אודיו...</span>
      </div>
    )
  }

  // ── DONE ──────────────────────────────────────────────────
  if (state === 'done') {
    return (
      <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-xl">
        <button
          onClick={togglePlay}
          className="w-7 h-7 flex-shrink-0 rounded-full bg-success/20 hover:bg-success/30 flex items-center justify-center transition-colors"
        >
          {isPlaying
            ? <Pause size={11} className="text-success" fill="currentColor" />
            : <Play size={11} className="text-success ml-0.5" fill="currentColor" />
          }
        </button>
        <div className="flex-1 h-1 bg-success/20 rounded-full overflow-hidden">
          <div className="h-full bg-success rounded-full transition-none" style={{ width: `${playProgress}%` }} />
        </div>
        <span className="text-xs text-success font-mono">{formatDuration(savedUrl ? (existingDuration ?? duration) : duration)}</span>
        <button
          onClick={() => setState('idle')}
          className="text-muted hover:text-text-main transition-colors ml-1"
          title="הקלט מחדש"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
      <span className="text-sm text-red-400">{error}</span>
      <button onClick={() => setState('idle')} className="text-xs text-muted hover:text-text-main underline">
        נסה שוב
      </button>
    </div>
  )
}
