'use client'
import { useState } from 'react'
import { Post, CATEGORIES, PRODUCT_TYPES } from '@/lib/types'
import SlidePlayer from '../player/SlidePlayer'
import Link from 'next/link'
import Image from 'next/image'

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const category = CATEGORIES.find(c => c.id === post.category)

  const thumbSlide = post.slides?.[0]
  const thumbUrl = thumbSlide?.image_url

  return (
    <article className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-[#3A3A3A] transition-colors group">
      {/* Thumbnail / Player */}
      <div
        className="relative cursor-pointer"
        style={{ aspectRatio: '16/9' }}
        onClick={() => !expanded && setExpanded(true)}
      >
        {expanded && post.slides ? (
          <SlidePlayer
            slides={post.slides}
            title={post.title}
            autoPlay
            onComplete={() => {}}
          />
        ) : (
          <>
            {thumbUrl ? (
              <Image
                src={thumbUrl}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-[#111] flex items-center justify-center">
                <span className="text-4xl">{category?.label.split(' ')[0]}</span>
              </div>
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl shadow-primary/30 transform group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {/* Format badge */}
            <div className="absolute top-3 left-3">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                post.format === 'snap'
                  ? 'bg-primary/90 text-white'
                  : 'bg-secondary/90 text-white'
              }`}>
                {post.format === 'snap' ? '⚡ Snap' : '📺 Demo'}
              </span>
            </div>
            {/* Slide count */}
            <div className="absolute top-3 right-3 bg-black/60 text-white/80 text-xs px-2 py-1 rounded-full font-mono">
              {post.slide_count} slides
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Creator */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-border flex-shrink-0">
            {post.creator?.avatar_url && (
              <Image
                src={post.creator.avatar_url}
                alt={post.creator.display_name || post.creator.username}
                width={28}
                height={28}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-text truncate block">
              {post.creator?.display_name || post.creator?.username}
            </span>
            <span className="text-xs text-muted">
              {post.product?.name}
            </span>
          </div>
          <span className="text-xs text-muted flex-shrink-0">
            {category?.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-text leading-snug mb-3">
          {post.title}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.product_types?.map(pt => {
            const type = PRODUCT_TYPES.find(p => p.id === pt)
            return type ? (
              <span key={pt} className="text-xs px-2 py-0.5 bg-[#1E1E2E] text-primary/80 border border-primary/20 rounded-full">
                {type.label}
              </span>
            ) : null
          })}
          {post.tags?.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-border text-muted rounded-full">
              #{tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted pt-2 border-t border-border">
          <span>👁 {post.view_count.toLocaleString()}</span>
          <span>🔗 {post.link_clicks}</span>
          {post.sandbox_opens > 0 && <span>🧪 {post.sandbox_opens}</span>}
        </div>
      </div>
    </article>
  )
}
