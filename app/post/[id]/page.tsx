'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Zap, ExternalLink, Github, Twitter } from 'lucide-react'
import { SEED_POSTS } from '@/lib/seed'
import { CATEGORIES, PRODUCT_TYPES } from '@/lib/types'
import SlidePlayer from '@/components/player/SlidePlayer'

export default function PostPage({ params }: { params: { id: string } }) {
  const post = SEED_POSTS.find(p => p.id === params.id)
  if (!post || !post.slides) notFound()

  const category = CATEGORIES.find(c => c.id === post.category)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-muted hover:text-text-main transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Zap size={12} className="text-primary" />
            </div>
            <span className="font-bold text-text-main">BuildFeed</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player — left/main */}
          <div className="lg:col-span-2">
            <SlidePlayer slides={post.slides} title={post.title} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Title + badges */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  post.format === 'snap'
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                    : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                }`}>
                  {post.format === 'snap' ? '⚡ Snap' : '📺 Demo'}
                </span>
                {category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {category.label}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-text-main leading-snug">{post.title}</h1>
            </div>

            {/* Product */}
            {post.product && (
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-1 uppercase tracking-wider">Product</p>
                <p className="font-semibold text-text-main">{post.product.name}</p>
                {post.product.tagline && (
                  <p className="text-sm text-muted mt-0.5">{post.product.tagline}</p>
                )}
                {post.product.website_url && (
                  <a
                    href={post.product.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-secondary transition-colors"
                  >
                    <ExternalLink size={14} /> {post.product.website_url.replace('https://', '')}
                  </a>
                )}
              </div>
            )}

            {/* Creator */}
            {post.creator && (
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-2 uppercase tracking-wider">Creator</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden flex-shrink-0">
                    {post.creator.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.creator.avatar_url} alt="" className="w-full h-full" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-text-main text-sm">{post.creator.display_name || post.creator.username}</p>
                    <p className="text-xs text-muted">@{post.creator.username}</p>
                  </div>
                </div>
                {post.creator.bio && (
                  <p className="text-sm text-muted mt-2 leading-relaxed">{post.creator.bio}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {post.creator.github_url && (
                    <a href={post.creator.github_url} target="_blank" rel="noopener noreferrer"
                      className="text-muted hover:text-text-main transition-colors">
                      <Github size={16} />
                    </a>
                  )}
                  {post.creator.twitter_url && (
                    <a href={post.creator.twitter_url} target="_blank" rel="noopener noreferrer"
                      className="text-muted hover:text-text-main transition-colors">
                      <Twitter size={16} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <p className="text-xs text-muted mb-2 uppercase tracking-wider">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {(post.product_types ?? []).map(pt => {
                  const type = PRODUCT_TYPES.find(t => t.id === pt)
                  return type ? (
                    <span key={pt} className="text-xs px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20">
                      {type.label}
                    </span>
                  ) : null
                })}
                {(post.tags ?? []).map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted border border-border">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Eye, label: 'Views', value: post.view_count.toLocaleString() },
                { icon: Zap, label: 'Tries', value: post.sandbox_opens },
                { icon: ExternalLink, label: 'Clicks', value: post.link_clicks },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-surface border border-border rounded-lg p-3 text-center">
                  <Icon size={14} className="text-muted mx-auto mb-1" />
                  <p className="text-text-main font-semibold text-sm">{value}</p>
                  <p className="text-muted text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
