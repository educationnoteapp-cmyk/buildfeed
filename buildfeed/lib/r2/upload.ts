import { createClient } from '@/lib/supabase/client'

export async function uploadImage(
  file: File,
  postId: string,
  slideId: string
): Promise<{ url: string; key: string }> {
  const supabase = createClient()
  const ext = file.type === 'image/gif' ? 'gif' : 'webp'
  const key = postId + '/' + slideId + '/image.' + ext

  const { error } = await supabase.storage
    .from('slides-images')
    .upload(key, file, { contentType: file.type, upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('slides-images').getPublicUrl(key)
  return { url: data.publicUrl, key }
}

export async function uploadAudio(
  blob: Blob,
  postId: string,
  slideId: string,
  durationSeconds: number
): Promise<{ url: string; key: string; duration_seconds: number }> {
  const supabase = createClient()
  const ext = blob.type.includes('webm') ? 'webm'
    : blob.type.includes('wav') ? 'wav'
    : blob.type.includes('ogg') ? 'ogg'
    : blob.type.includes('mp4') ? 'mp4'
    : 'webm'
  const key = postId + '/' + slideId + '/audio.' + ext

  const { error } = await supabase.storage
    .from('slides-audio')
    .upload(key, blob, { contentType: blob.type || 'audio/webm', upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('slides-audio').getPublicUrl(key)
  return { url: data.publicUrl, key, duration_seconds: durationSeconds }
}
