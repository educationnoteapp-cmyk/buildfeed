import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Zap } from 'lucide-react'
import PostCard from '@/components/feed/PostCard'

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, creator:profiles(*)')
    .eq('id', params.id)
    .single()

  if (!product) notFound()

  const { data: posts } = await supabase
    .from('posts')
    .select('*, product:products(*), slides(*)')
    .eq('product_id', params.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const sortedPosts = (posts ?? []).map(p => ({
    ...p,
    slides: (p.slides ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position)
  }))

  const totalViews = sortedPosts.reduce((s, p) => s + (p.view_count ?? 0), 0)
  const totalTries = sortedPosts.reduce((s, p) => s + (p.sandbox_opens ?? 0), 0)

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
        {/* Product header */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                {product.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-xl">🛠</span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-main">{product.name}</h1>
                {product.tagline && (
                  <p className="text-muted text-sm mt-0.5">{product.tagline}</p>
                )}
                {product.creator && (
                  <Link
                    href={`/creator/${product.creator.username}`}
                    className="text-xs text-primary hover:text-secondary transition-colors mt-1 inline-block"
                  >
                    by {product.creator.display_name || product.creator.username}
                  </Link>
                )}
              </div>
            </div>

            {product.website_url && (
              <a
                href={product.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex-shrink-0"
              >
                <ExternalLink size={14} /> Visit
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-border">
            {[
              { label: 'פוסטים', value: sortedPosts.length },
              { label: 'צפיות', value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews },
              { label: 'ניסיונות', value: totalTries },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold text-text-main">{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Posts */}
        {sortedPosts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted">
            <p>עדיין אין פוסטים למוצר זה</p>
          </div>
        )}
      </main>
    </div>
  )
}
