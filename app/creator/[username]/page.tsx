import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Github, Twitter, Zap } from 'lucide-react'
import { CATEGORIES } from '@/lib/types'
import PostCard from '@/components/feed/PostCard'

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

  const category = CATEGORIES.find(c => c.id === creator.primary_category)
  const totalViews = sortedPosts.reduce((s, p) => s + (p.view_count ?? 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-muted hover:text-text-main transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <Zap size={12} className="text-white" fill="white" />
            </div>
            <span className="font-bold text-text-main">BuildFeed</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 overflow-hidden flex-shrink-0">
            {creator.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-main">
              {creator.display_name || creator.username}
            </h1>
            <p className="text-muted text-sm">@{creator.username}</p>
            {creator.bio && (
              <p className="text-text-main text-sm mt-2 leading-relaxed">{creator.bio}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              {category && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                  {category.label}
                </span>
              )}
              {(creator.stack_tags ?? []).map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted border border-border">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3">
              {creator.github_url && (
                <a href={creator.github_url} target="_blank" rel="noopener noreferrer"
                  className="text-muted hover:text-text-main transition-colors">
                  <Github size={16} />
                </a>
              )}
              {creator.twitter_url && (
                <a href={creator.twitter_url} target="_blank" rel="noopener noreferrer"
                  className="text-muted hover:text-text-main transition-colors">
                  <Twitter size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-center flex-shrink-0">
            <div>
              <p className="text-lg font-bold text-text-main">{sortedPosts.length}</p>
              <p className="text-xs text-muted">פוסטים</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-main">
                {totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews}
              </p>
              <p className="text-xs text-muted">צפיות</p>
            </div>
          </div>
        </div>

        {/* Posts grid */}
        {sortedPosts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted">
            <p>עדיין אין פוסטים פורסמו</p>
          </div>
        )}
      </main>
    </div>
  )
}
