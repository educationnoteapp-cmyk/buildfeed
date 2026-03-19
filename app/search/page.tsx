'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, User, Package, FileText } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TRENDING = ['openai', 'stripe', 'supabase', 'nextjs', 'agents', 'auth', 'postgres', 'resend']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = { posts: any[]; creators: any[]; products: any[] }

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const supabase = createClient()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults(null); return }
    clearTimeout(debounceRef.current)
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const q = query.trim()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data: posts }, { data: creators }, { data: products }]: any = await Promise.all([
        supabase.from('posts')
          .select('id, title, category, format, creator:profiles!creator_id(username)')
          .eq('status', 'published')
          .ilike('title', `%${q}%`)
          .limit(5),
        supabase.from('profiles')
          .select('username, display_name, primary_category, avatar_url')
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(4),
        supabase.from('products')
          .select('id, name, logo_url, creator:profiles!creator_id(username)')
          .ilike('name', `%${q}%`)
          .limit(4),
      ])
      setResults({ posts: posts ?? [], creators: creators ?? [], products: products ?? [] })
      setLoading(false)
    }, 300)
  }, [query, supabase])

  const hasResults = results && (results.posts.length + results.creators.length + results.products.length) > 0
  const isEmpty = results && !hasResults

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Search bar */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 z-10">
        <div className="max-w-xl mx-auto flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2.5">
          <Search size={16} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חפש פוסטים, יוצרים, מוצרים..."
            className="flex-1 bg-transparent text-sm text-text-main placeholder-muted focus:outline-none"
            dir="rtl"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted hover:text-text-main transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4">
        {/* Empty — trending */}
        {!query && (
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-3 font-medium">Trending</p>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map(tag => (
                <button key={tag} onClick={() => setQuery(tag)}
                  className="text-sm px-3 py-1.5 rounded-full bg-surface border border-border text-muted hover:text-text-main hover:border-white/20 transition-colors">
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* No results */}
        {isEmpty && !loading && (
          <div className="text-center py-12">
            <p className="text-muted text-sm">לא נמצאו תוצאות עבור &ldquo;{query}&rdquo;</p>
            <p className="text-muted/60 text-xs mt-1">נסה מילה אחרת</p>
          </div>
        )}

        {/* Results */}
        {hasResults && !loading && (
          <div className="space-y-6">
            {/* Posts */}
            {results.posts.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} className="text-muted" />
                  <p className="text-xs text-muted uppercase tracking-wider font-medium">פוסטים</p>
                </div>
                <div className="bg-surface border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {results.posts.map(p => (
                    <Link key={p.id} href={`/post/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-main truncate">{p.title}</p>
                        <p className="text-xs text-muted mt-0.5">@{(p.creator as { username: string } | null)?.username} · {p.category}</p>
                      </div>
                      <span className={'text-[10px] px-2 py-0.5 rounded-full border ' + (p.format === 'snap' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-blue-400/10 text-blue-400 border-blue-400/20')}>
                        {p.format === 'snap' ? '⚡ Snap' : '📺 Demo'}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Creators */}
            {results.creators.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <User size={13} className="text-muted" />
                  <p className="text-xs text-muted uppercase tracking-wider font-medium">יוצרים</p>
                </div>
                <div className="bg-surface border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {results.creators.map(c => (
                    <Link key={c.username} href={`/creator/${c.username}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {c.avatar_url
                          ? <img src={c.avatar_url} alt={c.username} className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-primary">{c.username[0].toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-main">@{c.username}</p>
                        {c.primary_category && <p className="text-xs text-muted">{c.primary_category}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Products */}
            {results.products.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Package size={13} className="text-muted" />
                  <p className="text-xs text-muted uppercase tracking-wider font-medium">מוצרים</p>
                </div>
                <div className="bg-surface border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {results.products.map(p => (
                    <Link key={p.id} href={`/product/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {p.logo_url
                          ? <img src={p.logo_url} alt={p.name} className="w-full h-full object-cover" />
                          : <Package size={14} className="text-muted" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-main">{p.name}</p>
                        <p className="text-xs text-muted">@{(p.creator as { username: string } | null)?.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
