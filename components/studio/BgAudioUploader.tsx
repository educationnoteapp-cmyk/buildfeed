'use client'

import { useState, useRef } from 'react'
import { Music, X, Volume2, Upload } from 'lucide-react'
import { uploadAudio } from '@/lib/r2/upload'

interface BgAudioUploaderProps {
  postId: string
  existingUrl?: string | null
  existingVolume?: number
  onSaved: (url: string | null, volume: number) => void
}

export default function BgAudioUploader({
  postId,
  existingUrl,
  existingVolume = 0.3,
  onSaved,
}: BgAudioUploaderProps) {
  const [url, setUrl] = useState<string | null>(existingUrl ?? null)
  const [volume, setVolume] = useState(existingVolume)
  const [uploading, setUploading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type })
      const result = await uploadAudio(blob, postId, 'bg-audio', 0)
      setUrl(result.url)
      onSaved(result.url, volume)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleVolumeChange = (v: number) => {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
    onSaved(url, v)
  }

  const handleRemove = () => {
    setUrl(null)
    setPlaying(false)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    onSaved(null, volume)
  }

  const togglePlay = () => {
    if (!url) return
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
      audioRef.current.loop = true
      audioRef.current.volume = volume
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Music size={13} className="text-muted" />
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider flex-1">מוזיקת רקע</h3>
        {url && (
          <button onClick={handleRemove} className="text-muted hover:text-red-400 transition-colors">
            <X size={12} />
          </button>
        )}
      </div>

      {!url ? (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border hover:border-primary/40 rounded-lg text-muted hover:text-primary text-xs transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <Upload size={12} />
          )}
          {uploading ? 'מעלה...' : 'העלה קובץ אודיו'}
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={togglePlay}
            className={'text-xs px-3 py-1.5 rounded-lg border transition-colors ' + (playing ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted hover:border-white/20')}
          >
            {playing ? '⏸ מתנגן' : '▶ נגן תצוגה מקדימה'}
          </button>
        </div>
      )}

      {url && (
        <div className="flex items-center gap-2">
          <Volume2 size={12} className="text-muted flex-shrink-0" />
          <span className="text-xs text-muted flex-shrink-0">עוצמה:</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={e => handleVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-1.5 accent-primary cursor-pointer"
          />
          <span className="text-xs text-muted font-mono w-8 text-right">{Math.round(volume * 100)}%</span>
        </div>
      )}

      <p className="text-xs text-muted leading-relaxed">
        מתנגן ברקע על כל השקפים. עוצמת ההקלטות של כל שקף נשלטת בנפרד.
      </p>

      <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
    </div>
  )
}
