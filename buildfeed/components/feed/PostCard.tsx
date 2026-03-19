'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, Zap, Play, ExternalLink } from 'lucide-react'
import { Post, CATEGORIES } from '@/lib/types'
import SlidePlayer from '@/components/player/SlidePlayer'

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const category = CATEGORIES.find(c => c.id === post.category)
  const firstSlide = post.slides?.[0]
  const thumbUrl = firstSlide?.slide_type !== 'code' ? firstSlide?.image_url : null

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)

  return (
    <article className="group bg-surface border border-border rounded-2xl overflow-hidden hover:border-white/10 transition-all duration-200 hover:-translate-y-0.5">
      <div className="relative">
        {isExpanded && post.slides ? (
          <SlidePlayer slides={post.slides} title={post.title} />
        ) : (
          <div
            className="relative aspect-video bg-[#0A0A0F] cursor-pointer overflow-hidden"
            onClick={() => setIsExpanded(true)}
          >
            {thumbUrl ? (
              <Image
                src={thumbUrl}
                alt={post.title}
                fill
                className="object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute top-3 left-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                post.format === 'snap'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
              }`}>
                {post.format === 'snap' ? 'Snap' : 'Demo'}
              </span>
            </div>
            <div className="absolute top-3 right-3">
              <span className="text-xs text-white/60 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                {post.slide_count} slides
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/25 group-hover:scale-110 transition-all duration-200">
                <Play size={18} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-5 h-5 rounded-full bg-primary/30 overflow-hidden flex-shrink-0 ring-1 ring-primary/20">
            {post.creator?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.creator.avatar_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <span className="text-xs text-muted">
            <Link href={'/creator/' + post.creator?.username} className="text-text-main font-medium hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>
              {post.creator?.display_name || post.creator?.username}
            </Link>
            {post.product && (
              <span> · <Link href={'/product/' + post.product.id} className="text-primary hover:text-secondary transition-colors" onClick={e => e.stopPropagation()}>{post.product.name}</Link></span>
            )}
          </span>
        </div>

        <Link href={'/post/' + post.id}>
          <h3 className="text-text-main font-semibold text-sm leading-snug mb-3 line-clamp-2 hover:text-primary transition-colors">
            {post.title}
          </h3>
        </Link>

        <div className="flex flex-wrap gap-1.5 mb-3">
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

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><Eye size={11} /> {fmt(post.view_count ?? 0)}</span>
          <span className="flex items-center gap-1"><Zap size={11} /> {post.sandbox_opens ?? 0}</span>
          <span className="flex items-center gap-1"><ExternalLink size={11} /> {post.link_clicks ?? 0}</span>

        </div>
      </div>
    </article>
  )
}
