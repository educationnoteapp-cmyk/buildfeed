import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Eye, Zap, ExternalLink, User } from 'lucide-react'
import { CATEGORIES } from '@/lib/types'
import AnalyticsDashboard from '@/components/studio/AnalyticsDashboard'
import NotificationBell from '@/components/ui/NotificationBell'

export default async function StudioPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: posts } = await supabase
    .from('posts')
    .select('*, product:products(name)')
    .eq('creator_id', session.user.id)
    .order('updated_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', session.user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                <Zap size={12} className="text-white" fill="white" />
              </div>
              <span className="font-bold text-text-main">BuildFeed</span>
            </Link>
            <span className="text-border">/</span>
            <span className="text-muted text-sm">Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/studio/profile"
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text-main border border-border hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <User size={13} />
              )}
              פרופיל
            </Link>
            <Link
              href="/studio/new"
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> פוסט חדש
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Analytics */}
        <section>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">אנליטיקס</h2>
          <AnalyticsDashboard creatorId={session.user.id} />
        </section>

        {/* Posts list */}
        <section>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">הפוסטים שלך</h2>
          {(posts?.length ?? 0) === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                <Plus size={24} className="text-muted" />
              </div>
              <h2 className="text-lg font-semibold text-text-main mb-2">עדיין אין פוסטים</h2>
              <p className="text-muted text-sm mb-6">גרור תמונות ותתחיל להקליט</p>
              <Link
                href="/studio/new"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus size={16} /> צור פוסט ראשון
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {posts?.map(post => {
                const category = CATEGORIES.find(c => c.id === post.category)
                return (
                  <Link
                    key={post.id}
                    href={`/studio/post/${post.id}/edit`}
                    className="flex items-center gap-4 bg-surface border border-border hover:border-white/20 rounded-xl p-4 transition-colors group"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${post.status === 'published' ? 'bg-success' : 'bg-muted'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-text-main font-medium text-sm truncate">{post.title || 'ללא כותרת'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${post.format === 'snap' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-blue-400/10 text-blue-400'}`}>
                          {post.format === 'snap' ? '⚡ Snap' : '📺 Demo'}
                        </span>
                        {category && <span className="text-xs text-muted">{category.label}</span>}
                        <span className="text-xs text-muted">{post.slide_count} שקפים</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted flex-shrink-0">
                      <span className="flex items-center gap-1"><Eye size={11} /> {post.view_count ?? 0}</span>
                      <span className="flex items-center gap-1"><Zap size={11} /> {post.sandbox_opens ?? 0}</span>
                      <span className="flex items-center gap-1 hidden sm:flex"><ExternalLink size={11} /> {post.link_clicks ?? 0}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${post.status === 'published' ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'}`}>
                      {post.status === 'published' ? 'פורסם' : 'טיוטה'}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
