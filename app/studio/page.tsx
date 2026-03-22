import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Eye, Zap, ExternalLink, Users, TrendingUp } from 'lucide-react'
import { CATEGORIES } from '@/lib/types'

export default async function StudioPage() {
  const supabase = createClient()

  // getUser() במקום getSession() השבורה
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const creatorId = user.id

  const [postsRes, statsRes] = await Promise.all([
    supabase
      .from('posts')
      .select('*, product:products(name)')
      .eq('creator_id', creatorId)
      .order('updated_at', { ascending: false }),
    supabase.rpc('get_creator_stats', { creator_uuid: creatorId }),
  ])

  const posts = postsRes.data ?? []

  const rawStats = statsRes.data
  const stats = Array.isArray(rawStats) ? rawStats[0] : rawStats
  const totalViews = stats?.total_views ?? posts.reduce((s: number, p: any) => s + (p.view_count ?? 0), 0)
  const totalTries = stats?.total_tries ?? posts.reduce((s: number, p: any) => s + (p.sandbox_opens ?? 0), 0)
  const totalClicks = stats?.total_clicks ?? posts.reduce((s: number, p: any) => s + (p.link_clicks ?? 0), 0)
  const totalFollowers = stats?.total_followers ?? 0

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-text-main">Studio</span>
          </div>
          <Link
            href="/studio/new"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} /> פוסט חדש
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Analytics */}
        <section>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">אנליטיקס</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <Eye size={16} className="text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-main">{fmt(totalViews)}</p>
              <p className="text-xs text-muted mt-0.5">צפיות</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <Zap size={16} className="text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-main">{fmt(totalTries)}</p>
              <p className="text-xs text-muted mt-0.5">ניסיונות</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <ExternalLink size={16} className="text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-main">{fmt(totalClicks)}</p>
              <p className="text-xs text-muted mt-0.5">קליקים</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <Users size={16} className="text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-main">{fmt(totalFollowers)}</p>
              <p className="text-xs text-muted mt-0.5">עוקבים</p>
            </div>
          </div>

          {/* Per-post breakdown */}
          {posts.filter((p: any) => p.status === 'published').length > 0 && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden mt-4">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <TrendingUp size={14} className="text-muted" />
                <span className="text-sm font-medium text-text-main">ביצועים לפי פוסט</span>
              </div>
              <div className="divide-y divide-border">
                {posts.filter((p: any) => p.status === 'published').map((post: any) => (
                  <div key={post.id} className="px-4 py-3 flex items-center gap-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      post.format === 'snap' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-blue-400/10 text-blue-400'
                    }`}>
                      {post.format === 'snap' ? '⚡' : '📺'}
                    </span>
                    <p className="text-sm text-text-main flex-1 truncate">{post.title}</p>
                    <div className="flex items-center gap-4 text-xs text-muted flex-shrink-0">
                      <span className="flex items-center gap-1"><Eye size={11} /> {fmt(post.view_count ?? 0)}</span>
                      <span className="flex items-center gap-1"><Zap size={11} /> {post.sandbox_opens ?? 0}</span>
                      <span className="flex items-center gap-1 hidden sm:flex"><ExternalLink size={11} /> {post.link_clicks ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
 
