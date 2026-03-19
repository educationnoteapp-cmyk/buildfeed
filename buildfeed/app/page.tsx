'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, X, TrendingUp, Clock, Flame, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Post, CATEGORIES } from '@/lib/types'
import { SEED_POSTS } from '@/lib/seed'
import PostCard from '@/components/feed/PostCard'
import Logo from '@/components/ui/Logo'

type SortOption = 'new' | 'popular' | 'trending'

const SORT_OPTIONS: { id: SortOption; label: string; icon: React.ElementType }[] = [
  { id: 'new', label: '×××©', icon: Clock },
  { id: 'popular', label: '×¤××¤×××¨×', icon: TrendingUp },
  { id: 'trending', label: 'Trending', icon: Flame },
]

const PAGE_SIZE = 9

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('new')
  const [search, setSearch] = useState('')
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
      try {
    const res = await fetch('/api/feed?sort=smart&limit=24')
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) setPosts(data)
      } catch {
        // fallback to seed posts
      }
      setLoading(false)
    }
    load()
  }, [])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [selectedCategory, selectedFormat, sortBy, search])

  const filtered = useMemo(() => {
    let result = posts.filter(p =>
      (!selectedCategory || p.category === selectedCategory) &&
      (!selectedFormat || p.format === selectedFormat) &&
      (!search || [p.title, p.creator?.display_name, p.creator?.username, p.product?.name]
        .some(s => s?.toLowerCase().includes(search.toLowerCase())))
    )

    switch (sortBy) {
      case 'popular':
        result = [...result].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
        break
      case 'trending':
        result = [...result].sort((a, b) => (b.sandbox_opens ?? 0) - (a.sandbox_opens ?? 0))
        break
      default:
        result = [...result].sort((a, b) =>
          new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime()
        )
    }
    return result
  }, [posts, selectedCategory, selectedFormat, sortBy, search])

  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = paginated.length < filtered.length

  const clearAll = useCallback(() => {
    setSelectedCategory(null)
    setSelectedFormat(null)
    setSearch('')
    setSortBy('new')
  }, [])

  const activeFilters = [selectedCategory, selectedFormat, search].filter(Boolean).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <Logo size={26} />
              <span className="font-bold text-text-main text-base tracking-tight hidden sm:block">BuildFeed</span>
            </Link>

            {/* Search */}
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="××¤×© ××××, ×××¦×¨××, ×××¦×¨××..."
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-8 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-main">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter toggle (mobile) + Desktop controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowFilters(f => !f)}
                className={'sm:hidden flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl border transition-colors ' + (activeFilters > 0 ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted')}
              >
                <SlidersHorizontal size={13} />
                {activeFilters > 0 && <span className="w-4 h-4 bg-primary rounded-full text-white text-[10px] flex items-center justify-center">{activeFilters}</span>}
              </button>

              {/* Desktop format toggle */}
              <div className="hidden sm:flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
                {[{id:null,label:'All'},{id:'snap',label:'â¡ Snap'},{id:'demo',label:'ðº Demo'}].map(opt => (
                  <button key={String(opt.id)} onClick={() => setSelectedFormat(opt.id as string | null)}
                    className={'text-xs px-2.5 py-1 rounded-lg transition-colors ' + (selectedFormat === opt.id ? 'bg-primary text-white' : 'text-muted hover:text-text-main')}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {isLoggedIn
                ? <Link href="/studio" className="hidden sm:flex text-sm font-medium bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl transition-colors">Studio â</Link>
                : <Link href="/login" className="hidden sm:flex text-sm font-medium text-primary hover:text-secondary transition-colors">Sign in â</Link>
              }
            </div>
          </div>

          {/* Mobile filters panel */}
          {showFilters && (
            <div className="sm:hidden mt-3 pt-3 border-t border-border/50 space-y-3">
              <div className="flex gap-1">
                {[{id:null,label:'All'},{id:'snap',label:'â¡ Snap'},{id:'demo',label:'ðº Demo'}].map(opt => (
                  <button key={String(opt.id)} onClick={() => setSelectedFormat(opt.id as string | null)}
                    className={'text-xs px-3 py-1.5 rounded-xl border transition-colors ' + (selectedFormat === opt.id ? 'bg-primary border-primary text-white' : 'border-border text-muted')}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {isLoggedIn
                ? <Link href="/studio" className="block text-center text-sm font-medium bg-primary text-white px-3 py-2 rounded-xl">Studio â</Link>
                : <Link href="/login" className="block text-center text-sm font-medium text-primary">Sign in â</Link>
              }
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {/* Hero */}
        <div className="bg-grid py-8 sm:py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">The Discovery Layer for Builders</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-text-main mb-2 tracking-tight">
            Discover B2B tools{' '}
            <span className="text-transparent bg-clip-text" style={{backgroundImage:'linear-gradient(135deg,#4F46E5,#7C3AED)'}}>
              built by builders
            </span>
          </h1>
          <p className="text-muted text-sm max-w-sm mx-auto">
            Smart Audio-Slides â understand any dev tool in minutes.
          </p>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4">
          {/* Category scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
            <button onClick={() => setSelectedCategory(null)}
              className={'flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ' + (!selectedCategory ? 'bg-primary border-primary text-white' : 'border-border text-muted hover:border-white/20 hover:text-text-main')}>
              All
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={'flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ' + (selectedCategory === cat.id ? 'bg-primary border-primary text-white' : 'border-border text-muted hover:border-white/20 hover:text-text-main')}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {SORT_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setSortBy(id)}
                className={'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border transition-colors ' + (sortBy === id ? 'bg-surface border-white/20 text-text-main' : 'border-border text-muted hover:text-text-main')}>
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results bar */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-muted">
            {loading ? '×××¢×...' : filtered.length + ' ×¤××¡×××'}
            {selectedCategory && ' Â· ' + CATEGORIES.find(c => c.id === selectedCategory)?.label}
            {search && ' Â· "' + search + '"'}
          </span>
          {activeFilters > 0 && (
            <button onClick={clearAll} className="text-xs text-muted hover:text-text-main flex items-center gap-1">
              <X size={10} /> × ×§× ×××
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-16">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="aspect-video skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-3 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 pb-16">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-muted" />
            </div>
            <p className="text-text-main font-medium mb-1">×× × ××¦×× ×ª××¦×××ª</p>
            <p className="text-muted text-sm mb-4">
              {search ? `××× ×¤××¡××× ×¢×××¨ "${search}"` : '× ×¡× ×¤××××¨ ×××¨'}
            </p>
            <button onClick={clearAll} className="text-sm text-primary hover:text-secondary transition-colors">
              × ×§× ××ª ×× ××¤××××¨××
            </button>
          </div>
        ) : (
          <div className="pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {paginated.map(post => <PostCard key={post.id} post={post} />)}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="text-sm font-medium border border-border hover:border-white/20 text-muted hover:text-text-main px-6 py-2.5 rounded-xl transition-colors"
                >
                  ××¢× ×¢×× ({filtered.length - paginated.length} × ××¡×¤××)
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Logo size={16} />
          <span className="font-medium text-text-main">BuildFeed</span>
        </div>
        The Discovery Layer for Builders
      </footer>
    </div>
  )
} 
 
