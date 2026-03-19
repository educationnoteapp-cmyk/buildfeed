import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PostCard from '@/components/feed/PostCard'
import { BookmarkX } from 'lucide-react'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: worked } = await supabase
    .from('post_worked')
    .select('post_id')
    .eq('user_id', session.user.id)

  const postIds = (worked ?? []).map(w => w.post_id)

  let posts: any[] = []
  if (postIds.length > 0) {
    const { data } = await supabase
      .from('posts')
      .select(`
        id, title, format, category, tags, product_types,
        view_count, sandbox_opens, link_clicks, slide_count,
        published_at, worked_count, not_working_count, version_tags,
        creator:profiles!creator_id(id, username, display_name, avatar_url),
        product:products!product_id(id, name, logo_url, website_url)
      `)
      .in('id', postIds)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
    posts = data ?? []
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-lg font-bold text-text-main">שמורים</h1>
          {posts.length > 0 && (
            <span className="text-xs text-muted bg-surface border border-border px-2 py-0.5 rounded-full">
              {posts.length}
            </span>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
              <BookmarkX size={24} className="text-muted" />
            </div>
            <p className="text-text-main font-medium mb-1">אין פוסטים שמורים</p>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              לחץ &ldquo;עבד לי&rdquo; על פוסטים שעזרו לך —<br />הם יופיעו כאן לשימוש חוזר
            </p>
            <Link href="/"
              className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
              גלה כלים חדשים
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
