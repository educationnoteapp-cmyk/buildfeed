import { createClient } from './supabase/server'
 
export async function getFeedPostsServer() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url),
      product:products!product_id(id, name, logo_url, website_url),
      slides(*)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(24)
 
  if (error) {
    console.error('getFeedPostsServer error:', error)
    return []
  }
 
  return (data ?? []).map((p: any) => ({
    ...p,
    slides: (p.slides ?? []).sort((a: any, b: any) => a.position - b.position),
  }))
}
 
