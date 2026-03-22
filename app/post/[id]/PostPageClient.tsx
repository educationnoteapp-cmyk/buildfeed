'use client'

import Link from 'next/link'
import { ExternalLink, Github, Twitter } from 'lucide-react'
import { PRODUCT_TYPES } from '@/lib/types'
import SlidePlayer from '@/components/player/SlidePlayer'
import PostActions from '@/components/post/PostActions'
import NotWorkingButton from '@/components/post/NotWorkingButton'
import FollowButtonWrapper from '@/components/ui/FollowButtonWrapper'

interface PostPageClientProps {
  post: any
  slides: any[]
  category: { id: string; label: string } | null
  playerMode: 'auto' | 'manual'
  muteByDefault: boolean
  userWorked: boolean
  userDisliked: boolean
  userNotWorking: boolean
  isFollowingCreator: boolean
}

export default function PostPageClient({
  post, slides, category, playerMode, muteByDefault,
  userWorked, userDisliked, userNotWorking, isFollowingCreator,
}: PostPageClientProps) {
  const hasCode = slides.some((s: any) => s.slide_type === 'code')

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      {/* Sub-header (sits below root layout header) */}
      <div className="bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="text-xs text-muted hover:text-text-main transition-colors flex items-center gap-1">
            ← פיד
          </Link>
          <div className="flex items-center gap-2">
            {hasCode && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-full">
                <span className="font-mono">&lt;/&gt;</span> יש קוד
              </span>
            )}
            {post.product?.website_url && (
              <a href={post.product.website_url} target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-sm text-muted hover:text-text-main border border-border hover:border-white/20 px-3 py-1.5 rounded-xl transition-colors">
                <ExternalLink size={13} />
                {post.product.website_url.replace('https://','').replace('http://','').split('/')[0]}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Player + info */}
          <div className="lg:col-span-2 space-y-4">
            <SlidePlayer
              slides={slides}
              title={post.title}
              autoPlay
              bgAudioUrl={post.bg_audio_url}
              bgAudioVolume={post.bg_audio_volume ?? 0.3}
              postId={post.id}
              creatorId={post.creator?.id}
              tryVideoUrl={post.try_video_url}
              websiteUrl={post.product?.website_url}
              githubUrl={post.github_url}
              playerMode={playerMode}
              defaultMuted={muteByDefault}
            />

            {/* Title + badges */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  post.format === 'snap'
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
                    : 'bg-blue-400/15 text-blue-300 border border-blue-400/25'
                }`}>
                  {post.format === 'snap' ? '⚡ Snap' : '📺 Demo'}
                </span>
                {category && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {category.label}
                  </span>
                )}
                {(post.tags ?? []).map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted border border-border">
                    #{tag}
                  </span>
                ))}
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-text-main leading-snug">{post.title}</h1>
            </div>

            {/* Version tags + GitHub */}
            {((post.version_tags ?? []).length > 0 || post.github_url) && (
              <div className="flex flex-wrap items-center gap-2">
                {(post.version_tags ?? []).map((v: string) => (
                  <span key={v} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">
                    {v}
                  </span>
                ))}
                {post.github_url && (
                  <a href={post.github_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 text-muted border border-border hover:text-text-main hover:border-white/20 transition-colors">
                    <Github size={11} /> GitHub
                  </a>
                )}
              </div>
            )}

            {/* Not working alert */}
            {(post.not_working_count ?? 0) >= 3 && (
              <div className="flex items-center gap-2 bg-orange-400/8 border border-orange-400/20 rounded-xl px-3 py-2">
                <span className="text-xs text-orange-400">
                  ⚠️ {post.not_working_count} אנשים דיווחו שהקוד כבר לא עובד — ייתכן שהמוצר עודכן
                </span>
              </div>
            )}

            {/* Actions */}
            {post.creator && (
              <PostActions
                postId={post.id}
                creatorId={post.creator.id}
                tryVideoUrl={post.try_video_url}
                websiteUrl={post.product?.website_url}
                initialWorked={userWorked}
                initialWorkedCount={post.worked_count ?? 0}
                initialDisliked={userDisliked}
                initialReported={false}
                initialIsFollowingCreator={isFollowingCreator}
              />
            )}
            <div className="flex justify-end">
              <NotWorkingButton
                postId={post.id}
                initialMarked={userNotWorking}
                initialCount={post.not_working_count ?? 0}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Creator card */}
            {post.creator && (
              <div className="bg-surface border border-border rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Link href={'/creator/' + post.creator.username}>
                    <div className="w-11 h-11 rounded-xl bg-primary/20 overflow-hidden flex-shrink-0 ring-1 ring-primary/20 hover:ring-primary/40 transition-all">
                      {post.creator.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={'/creator/' + post.creator.username} className="font-semibold text-text-main text-sm hover:text-primary transition-colors">
                      {post.creator.display_name || post.creator.username}
                    </Link>
                    <p className="text-xs text-muted">@{post.creator.username}</p>
                  </div>
                  <FollowButtonWrapper targetId={post.creator.id} type="creator" size="sm" initialIsFollowing={isFollowingCreator} />
                </div>
                {post.creator.bio && (
                  <p className="text-xs text-muted leading-relaxed mb-3">{post.creator.bio}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {post.creator.github_url && (
                    <a href={post.creator.github_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-text-main transition-colors">
                      <Github size={15} />
                    </a>
                  )}
                  {post.creator.twitter_url && (
                    <a href={post.creator.twitter_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-text-main transition-colors">
                      <Twitter size={15} />
                    </a>
                  )}
                </div>
                {(post.creator.contact_link_1_url || post.creator.contact_link_2_url) && (
                  <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-border">
                    {post.creator.contact_link_1_url && (
                      <a href={post.creator.contact_link_1_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                        <ExternalLink size={11} />
                        {post.creator.contact_link_1_label || 'צור קשר'}
                      </a>
                    )}
                    {post.creator.contact_link_2_url && (
                      <a href={post.creator.contact_link_2_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-muted hover:text-text-main border border-border hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
                        <ExternalLink size={11} />
                        {post.creator.contact_link_2_label || 'קבע פגישה'}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Product card */}
            {post.product && (
              <div className="bg-surface border border-border rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  {post.product.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.product.logo_url} alt="" className="w-9 h-9 rounded-lg" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {post.product.name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={'/product/' + post.product.id} className="font-semibold text-text-main text-sm hover:text-primary transition-colors">
                      {post.product.name}
                    </Link>
                    {post.product.tagline && (
                      <p className="text-xs text-muted truncate">{post.product.tagline}</p>
                    )}
                  </div>
                  <FollowButtonWrapper targetId={post.product.id} type="product" size="sm" />
                </div>
                {post.product.website_url && (
                  <a href={post.product.website_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-secondary transition-colors mt-2">
                    <ExternalLink size={11} />
                    {post.product.website_url.replace('https://','').replace('http://','').split('/')[0]}
                  </a>
                )}
              </div>
            )}

            {/* Product types */}
            {(post.product_types ?? []).length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-4">
                <p className="text-xs text-muted uppercase tracking-wider mb-2">סוג מוצר</p>
                <div className="flex flex-wrap gap-2">
                  {(post.product_types ?? []).map((pt: string) => {
                    const type = PRODUCT_TYPES.find(t => t.id === pt)
                    return type ? (
                      <span key={pt} className="text-xs px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/20">
                        {type.label}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'צפיות', value: post.view_count ?? 0 },
                { label: 'ניסיונות', value: post.sandbox_opens ?? 0 },
                { label: 'קליקים', value: post.link_clicks ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface border border-border rounded-xl p-3 text-center">
                  <p className="text-text-main font-bold text-base">{value >= 1000 ? (value/1000).toFixed(1)+'k' : value}</p>
                  <p className="text-muted text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
