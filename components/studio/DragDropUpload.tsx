'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, ImageIcon, X } from 'lucide-react'
import { uploadImage } from '@/lib/r2/upload'

interface UploadedSlide {
  tempId: string
  imageUrl: string
  file: File
  position: number
}

interface DragDropUploadProps {
  postId: string
  onSlidesCreated: (slides: UploadedSlide[]) => void
  maxSlides?: number
  currentCount?: number
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export default function DragDropUpload({
  postId,
  onSlidesCreated,
  maxSlides = 20,
  currentCount = 0,
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError(null)
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      setError('רק קבצי תמונה נתמכים (JPG, PNG, WebP, GIF)')
      return
    }

    const remaining = maxSlides - currentCount
    const toUpload = imageFiles.slice(0, remaining)

    if (imageFiles.length > remaining) {
      setError(`מקסימום ${maxSlides} שקפים — ${imageFiles.length - remaining} קבצים לא יועלו`)
    }

    setUploading(true)
    setProgress({ done: 0, total: toUpload.length })

    const results: UploadedSlide[] = []

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]
      const tempId = generateId()
      try {
        const { url } = await uploadImage(file, postId, tempId)
        results.push({
          tempId,
          imageUrl: url,
          file,
          position: currentCount + i,
        })
        setProgress({ done: i + 1, total: toUpload.length })
      } catch {
        // Skip failed files but continue
        console.error(`Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    setProgress(null)

    if (results.length > 0) {
      onSlidesCreated(results)
    }
  }, [postId, maxSlides, currentCount, onSlidesCreated])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files)
    e.target.value = '' // reset so same files can be re-selected
  }

  const canUploadMore = currentCount < maxSlides

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && canUploadMore && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all
          ${isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border hover:border-primary/40 hover:bg-primary/5'}
          ${canUploadMore && !uploading ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
        `}
      >
        {uploading ? (
          <div className="space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <p className="text-sm text-muted">
              מעלה {progress?.done}/{progress?.total} תמונות...
            </p>
            {/* Progress bar */}
            <div className="w-full max-w-xs mx-auto h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((progress?.done ?? 0) / (progress?.total ?? 1)) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-primary/30' : 'bg-surface'}`}>
              {isDragging ? (
                <ImageIcon size={22} className="text-primary" />
              ) : (
                <Upload size={22} className="text-muted" />
              )}
            </div>
            <div>
              <p className="text-text-main font-medium text-sm">
                {isDragging ? 'שחרר להעלאה' : 'גרור תמונות לכאן'}
              </p>
              <p className="text-muted text-xs mt-1">
                JPG, PNG, WebP, GIF · עד {maxSlides - currentCount} שקפים נוספים
              </p>
            </div>
            {!isDragging && (
              <span className="inline-block text-xs text-primary border border-primary/30 rounded-full px-3 py-1">
                או לחץ לבחור קבצים
              </span>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {error && (
        <div className="flex items-center justify-between mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => setError(null)}>
            <X size={12} className="text-red-400" />
          </button>
        </div>
      )}
    </div>
  )
}
