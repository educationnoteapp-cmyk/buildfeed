export async function uploadImage(
  file: File,
  postId: string,
  slideId: string
): Promise<{ url: string; key: string }> {
  const formData = new FormData()
  formData.append('file', file)
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
 
