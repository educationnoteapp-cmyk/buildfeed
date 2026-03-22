import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CreatorPageClient from './CreatorPageClient'

export default async function CreatorPage({ params }: { params: { username: string } }) {
  const supabase = createClient()

  const { data: creator } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .single()

  if (!creator) notFound()

  const { data: posts } = await supabase
    .from('posts')
    .select('*, product:products(*), slides(*)')
    .eq('creator_id', creator.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const sortedPosts = (posts ?? []).map(p => ({
    ...p,
    slides: (p.slides ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position)
  }))

  // Fetch follow state server-side — no broken client calls
  let isFollowing = false
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data } = await supabase
      .from('follows_creators')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', creator.id)
      .maybeSingle()
    isFollowing = !!data
  }

  return (
    <CreatorPageClient
      creator={creator}
      posts={sortedPosts}
      isFollowing={isFollowing}
    />
  )
}
