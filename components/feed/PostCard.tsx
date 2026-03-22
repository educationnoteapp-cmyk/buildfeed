'use client'

import { Eye, Zap, ExternalLink } from 'lucide-react'
import { Post, CATEGORIES, Slide } from '@/lib/types'
import SlidePlayer from '@/components/player/SlidePlayer'

function calcDuration(slides: Slide[] | undefined): string | null {
  if (!slides || slides.length === 0) return null
  const total = slides.reduce((sum, s) => {
    if (s.audio_url && s.audio_duration_seconds) return sum + s.audio_duration_seconds
    return sum + ((s as any).slide_duration_seconds ?? 3)
  }, 0)
  const secs = Math.round(total)
  return Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0')
}

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  const category = CATEGORIES.find(c => c.id === post.category)
  const duration = calcDuration(post.slides)
  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)

  return (
    <article className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-white/15 transition-colors duration-200">

      {/* Player — inline, no link */}
      <div className="relative">
        {/* Format badge */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${
            post.format === 'snap'
              ? 'bg-amber-400/25 text-amber-300 border border-amber-400/30'
              : 'bg-blue-400/25 text-blue-300 border border-blue-400/30'
          }`}>
            {post.format === 'snap' ? 'Snap' : 'Demo'}
          </span>
        </div>

        {/* Duration + slide count */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 pointer-events-none">
          {duration && (
            <span className="text-xs text-white font-mono bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {duration}
            </span>
          )}
          <span className="text-xs text-white/70 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {post.slide_count}
          </span>
        </div>

        <SlidePlayer
          slides={post.slides ?? []}
          title={post.title}
          autoPlay={false}
          playerMode="auto"
          defaultMuted={false}
        />
      </div>

      {/* Metadata */}
      <div className="p-3">
        {/* Creator */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-primary/30 overflow-hidden flex-shrink-0 ring-1 ring-primary/20">
            {post.creator?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.creator.avatar_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <span className="text-xs text-muted truncate">
            <span className="text-text-main font-medium">
              {post.creator?.display_name || post.creator?.username}
            </span>
            {post.product && (
              <span> · <span className="text-primary">{post.product.name}</span></span>
            )}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-text-main font-semibold text-sm leading-snug mb-2 line-clamp-2">
          {post.title}
        </h3>

        {/* Category + tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary/90 border border-primary/15 font-medium">
              {category.label}
            </span>
          )}
          {(post.tags ?? []).slice(0, 2).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/4 text-muted border border-border">
              #{tag}
            </span>
          ))}
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><Eye size={11} /> {fmt(post.view_count ?? 0)}</span>
          <span className="flex items-center gap-1"><Zap size={11} /> {post.sandbox_opens ?? 0}</span>
          <span className="flex items-center gap-1"><ExternalLink size={11} /> {post.link_clicks ?? 0}</span>
        </div>
      </div>
    </article>
  )
}
