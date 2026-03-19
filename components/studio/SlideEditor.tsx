'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Trash2, Code2, Link, ImageIcon, GripVertical } from 'lucide-react'
import AudioRecorder from './AudioRecorder'
import { uploadImage } from '@/lib/r2/upload'
import { Slide, SlideType } from '@/lib/types'

interface SlideEditorProps {
  slide: Slide & { tempImageUrl?: string }
  index: number
  postId: string
  onUpdate: (id: string, updates: Partial<Slide>) => void
  onDelete: (id: string) => void
  isDragging?: boolean
}

export default function SlideEditor({
  slide,
  index,
  postId,
  onUpdate,
  onDelete,
  isDragging,
}: SlideEditorProps) {
  const [replacingImage, setReplacingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const displayImage = slide.tempImageUrl ?? slide.image_url

  const handleImageReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReplacingImage(true)
    try {
      const { url } = await uploadImage(file, postId, slide.id)
      onUpdate(slide.id, { image_url: url })
    } catch {
      // silent fail — existing image stays
    } finally {
      setReplacingImage(false)
      e.target.value = ''
    }
  }

  const handleTypeChange = (type: SlideType) => {
    onUpdate(slide.id, { slide_type: type })
  }

  return (
    <div className={`bg-surface border rounded-xl overflow-hidden transition-all ${isDragging ? 'border-primary shadow-lg shadow-primary/10 scale-[1.01]' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/50">
        <div className="text-muted cursor-grab active:cursor-grabbing">
          <GripVertical size={14} />
        </div>
        <span className="text-xs font-mono text-muted flex-1">שקף {index + 1}</span>

        {/* Type selector */}
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
          {[
            { type: 'media' as SlideType, icon: ImageIcon, label: 'תמונה' },
            { type: 'code' as SlideType, icon: Code2, label: 'קוד' },
            { type: 'hotspot' as SlideType, icon: Link, label: 'CTA' },
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              title={label}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${slide.slide_type === type ? 'bg-primary text-white' : 'text-muted hover:text-text-main'}`}
            >
              <Icon size={11} />
            </button>
          ))}
        </div>

        <button
          onClick={() => onDelete(slide.id)}
          className="w-6 h-6 flex items-center justify-center text-muted hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Image preview */}
        {(slide.slide_type === 'media' || slide.slide_type === 'hotspot') && (
          <div
            className="relative aspect-video bg-background rounded-lg overflow-hidden group cursor-pointer"
            onClick={() => imageInputRef.current?.click()}
          >
            {displayImage ? (
              <>
                <Image src={displayImage} alt="" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-3 py-1.5 rounded-full">
                    החלף תמונה
                  </span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
                <ImageIcon size={24} />
                <span className="text-xs">לחץ להוסיף תמונה</span>
              </div>
            )}
            {replacingImage && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageReplace}
            />
          </div>
        )}

        {/* Code editor */}
        {slide.slide_type === 'code' && (
          <div className="bg-[#0D1117] rounded-lg overflow-hidden border border-[#30363D]">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#161B22] border-b border-[#30363D]">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <input
                value={slide.code_language ?? ''}
                onChange={e => onUpdate(slide.id, { code_language: e.target.value })}
                placeholder="שפה (typescript, python...)"
                className="flex-1 bg-transparent text-xs text-muted focus:outline-none font-mono"
              />
            </div>
            <textarea
              value={slide.code_content ?? ''}
              onChange={e => onUpdate(slide.id, { code_content: e.target.value })}
              placeholder="// הכנס קוד כאן..."
              rows={6}
              className="w-full bg-transparent text-[#E6EDF3] text-xs font-mono p-3 focus:outline-none resize-none leading-relaxed"
              dir="ltr"
            />
          </div>
        )}

        {/* Hotspot URL */}
        {slide.slide_type === 'hotspot' && (
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
            <Link size={12} className="text-muted flex-shrink-0" />
            <input
              type="url"
              value={slide.hotspot_url ?? ''}
              onChange={e => onUpdate(slide.id, { hotspot_url: e.target.value })}
              placeholder="https://your-product.com"
              className="flex-1 bg-transparent text-sm text-text-main focus:outline-none"
              dir="ltr"
            />
          </div>
        )}

        {/* Audio recorder — on all slide types */}
        <AudioRecorder
          postId={postId}
          slideId={slide.id}
          existingAudioUrl={slide.audio_url}
          existingDuration={slide.audio_duration_seconds}
          onSaved={(url, duration) => onUpdate(slide.id, {
            audio_url: url,
            audio_duration_seconds: duration,
          })}
        />
      </div>
    </div>
  )
}
