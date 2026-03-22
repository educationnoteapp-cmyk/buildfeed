import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CATEGORIES } from '@/lib/types'
import PostPageClient from './PostPageClient'

export default async function PostPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('*, product:products(*), creator:profiles(*), slides(*)')
    .eq('id', params.id)
    .eq('status', 'published')
    .single()

  if (!post || !post.slides) notFound()

  const slides = (post.slides ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position)
  const category = CATEGORIES.find(c => c.id === post.category)

  // Player prefs + user interaction state — server-side with getUser() (not broken getSession)
  let playerMode: 'auto' | 'manual' = 'auto'
  let muteByDefault = false
  let userWorked = false
  let userDisliked = false
  let userNotWorking = false
  let isFollowingCreator = false

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const [{ data: prefs }, { data: worked }, { data: disliked }, { data: notWorking }, { data: following }] = await Promise.all([
      supabase.from('profiles').select('player_mode, mute_by_default').eq('id', user.id).single(),
      supabase.from('post_worked').select('user_id').eq('user_id', user.id).eq('post_id', post.id).maybeSingle(),
      supabase.from('post_dislikes').select('user_id').eq('user_id', user.id).eq('post_id', post.id).maybeSingle(),
      supabase.from('post_not_working').select('user_id').eq('user_id', user.id).eq('post_id', post.id).maybeSingle(),
      supabase.from('follows_creators').select('follower_id').eq('follower_id', user.id).eq('following_id', post.creator_id).maybeSingle(),
    ])
    if (prefs) {
      playerMode = (prefs.player_mode ?? 'auto') as 'auto' | 'manual'
      muteByDefault = prefs.mute_by_default ?? false
    }
    userWorked = !!worked
    userDisliked = !!disliked
    userNotWorking = !!notWorking
    isFollowingCreator = !!following
  }

  return (
    <PostPageClient
      post={post}
      slides={slides}
      category={category ?? null}
      playerMode={playerMode}
      muteByDefault={muteByDefault}
      userWorked={userWorked}
      userDisliked={userDisliked}
      userNotWorking={userNotWorking}
      isFollowingCreator={isFollowingCreator}
    />
  )
}
