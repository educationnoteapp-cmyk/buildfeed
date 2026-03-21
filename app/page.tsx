import { getFeedPostsServer } from '@/lib/data-server'
import HomeFeed from '@/components/feed/HomeFeed'
import { SEED_POSTS } from '@/lib/seed'
 
export const dynamic = 'force-dynamic'
 
export default async function HomePage() {
  let posts = []
  try {
    posts = await getFeedPostsServer()
  } catch (e) {
    console.error('Server feed fetch failed:', e)
  }
 
  // Fallback to seed if DB returns nothing
  const feedPosts = posts.length > 0 ? posts : SEED_POSTS
 
  return <HomeFeed initialPosts={feedPosts as any} />
}
 
