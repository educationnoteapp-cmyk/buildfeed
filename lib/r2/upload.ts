// ── Image compression ──────────────────────────────────────
// - GIF: sent as-is (preserves animation)
// - Other images: resize to max 1200px, convert to WebP quality 82%
// - Never crops — only scales down proportionally
async function compressImage(file: File): Promise<{ blob: Blob; ext: string }> {
  // GIFs: don't touch — preserve animation
  if (file.type === 'image/gif') {
    return { blob: file, ext: 'gif' }
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 1200
      let w = img.width
      let h = img.height

      // Only resize if larger than MAX (never upscale)
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      // WebP at 82% — visually identical to original, much smaller file
      canvas.toBlob(
        (blob) => resolve({ blob: blob || file, ext: 'webp' }),
        'image/webp',
        0.82
      )
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => resolve({ blob: file, ext: 'webp' })
    img.src = URL.createObjectURL(file)
  })
}

// ── Upload Image ───────────────────────────────────────────
export async function uploadImage(
  file: File,
  postId: string,
  slideId: string
): Promise<{ url: string; key: string }> {
  const { blob, ext } = await compressImage(file)
  console.log(`Image: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB (${ext})`)

  const formData = new FormData()
  formData.append('file', blob, `image.${ext}`)
  formData.append('postId', postId)
  formData.append('slideId', slideId)

  const res = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || 'Upload failed')
  }

  return res.json()
}

// ── Upload Audio ───────────────────────────────────────────
// Audio from mic recording (15-30 sec per slide) is already small (~200-500KB)
// No client-side compression needed — just upload directly
export async function uploadAudio(
  blob: Blob,
  postId: string,
  slideId: string,
  durationSeconds: number
): Promise<{ url: string; key: string; duration_seconds: number }> {
  const formData = new FormData()
  formData.append('file', blob)
  formData.append('postId', postId)
  formData.append('slideId', slideId)
  formData.append('duration', String(durationSeconds))

  const res = await fetch('/api/upload/audio', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || 'Upload failed')
  }

  return res.json()
}
