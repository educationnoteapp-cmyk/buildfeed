'use client'

import { useEffect, useState } from 'react'
import { Eye, Zap, ExternalLink, Users, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PostStat {
  id: string
  title: string
  view_count: number
  sandbox_opens: number
  link_clicks: number
  published_at: string
  format: string
}

interface CreatorStats {
  total_views: number
  total_tries: number
  total_clicks: number
  total_followers: number
  total_posts: number
}

export default function AnalyticsDashboard({ creatorId }: { creatorId: string }) {
  const [posts, setPosts] = useState<PostStat[]>([])
  const [stats, setStats] = useState<CreatorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [postsRes, statsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('id, title, view_count, sandbox_opens, link_clicks, published_at, format')
          .eq('creator_id', creatorId)
          .eq('status', 'published')
          .order('view_count', { ascending: false }),
        supabase.rpc('get_creator_stats', { creator_uuid: creatorId })
      ])

      if (postsRes.data) setPosts(postsRes.data)
      if (statsRes.data?.[0]) setStats(statsRes.data[0])
      setLoading(false)
    }
    load()
  }, [creatorId, supabase])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface border border-border rounded-xl" />)}
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'צפיות', value: stats?.total_views ?? 0, icon: Eye, color: 'text-blue-400' },
    { label: 'ניסיונות', value: stats?.total_tries ?? 0, icon: Zap, color: 'text-yellow-400' },
    { label: 'קליקים', value: stats?.total_clicks ?? 0, icon: ExternalLink, color: 'text-green-400' },
    { label: 'עוקבים', value: stats?.total_followers ?? 0, icon: Users, color: 'text-purple-400' },
  ]

  const fmt = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : n.toString()

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <Icon size={16} className={`${color} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-text-main">{fmt(value)}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-post breakdown */}
      {posts.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <TrendingUp size={14} className="text-muted" />
            <span className="text-sm font-medium text-text-main">ביצועים לפי פוסט</span>
          </div>
          <div className="divide-y divide-border">
            {posts.map(post => (
              <div key={post.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  post.format === 'snap' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-blue-400/10 text-blue-400'
                }`}>
                  {post.format === 'snap' ? '⚡' : '📺'}
                </span>
                <p className="text-sm text-text-main flex-1 truncate">{post.title}</p>
                <div className="flex items-center gap-4 text-xs text-muted flex-shrink-0">
                  <span className="flex items-center gap-1">
                    <Eye size={11} /> {fmt(post.view_count)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap size={11} /> {post.sandbox_opens}
                  </span>
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <ExternalLink size={11} /> {post.link_clicks}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 && (
        <div className="text-center py-12 text-muted">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">אין נתונים עדיין — פרסם פוסטים כדי לראות אנליטיקס</p>
        </div>
      )}
    </div>
  )
}
