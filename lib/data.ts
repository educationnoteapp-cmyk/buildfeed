import { createClient } from './supabase/client'
import { Post } from './types'

export async function getPublishedPosts(category?: string): Promise<Post[]> {
  const supabase = createClient()

  let query = supabase
    .from('posts')
    .select(`
      *,
      product:products(*),
      slides(*)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }

  // Sort slides by position
  return (data || []).map(post => ({
    ...post,
    slides: post.slides?.sort((a: { position: number }, b: { position: number }) => a.position - b.position) ?? []
  }))
}

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      product:products(*),
      slides(*)
    `)
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data) return null

  return {
    ...data,
    slides: data.slides?.sort((a: { position: number }, b: { position: number }) => a.position - b.position) ?? []
  }
}

export async function trackEvent(
  postId: string,
  eventType: 'view' | 'sandbox_open' | 'link_click' | 'follow',
  viewerId?: string
) {
  const supabase = createClient()
  await supabase.from('analytics_events').insert({
    post_id: postId,
    event_type: eventType,
    viewer_id: viewerId ?? null
  })
}
