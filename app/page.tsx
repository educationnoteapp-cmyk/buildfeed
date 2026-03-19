'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Post, CATEGORIES } from '@/lib/types'
import { SEED_POSTS } from '@/lib/seed'
import PostCard from '@/components/feed/PostCard'
import CategoryFilter from '@/components/feed/CategoryFilter'

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const [{ data }, { data: { session } }] = await Promise.all([
        supabase.from('posts').select('*, product:products(*), slides(*)')
          .eq('status', 'published').order('published_at', { ascending: false }),
        supabase.auth.getSession()
      ])
      if (data && data.length > 0) {
        setPosts(data.map(p => ({
          ...p,
          slides: (p.slides ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position)
        })))
      }
      setIsLoggedIn(!!session)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() =>
    posts.filter(p =>
      (!selectedCategory || p.category === selectedCategory) &&
      (!selectedFormat || p.format === selectedFormat)
    ), [posts, selectedCategory, selectedFormat])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap size={14} className="text-white" fill="white" />
            </div>
            <span className="font-bold text-text-main text-lg tracking-tight">BuildFeed</span>
          </div>
          <div className="flex items-center gap-1 bg-surface border border-border rounded-full p-1">
            {[{id:null,label:'All'},{id:'snap',label:'⚡ Snap'},{id:'demo',label:'📺 Demo'}].map(opt => (
              <button key={String(opt.id)} onClick={() => setSelectedFormat(opt.id as string | null)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${selectedFormat === opt.id ? 'bg-primary text-white' : 'text-muted hover:text-text-main'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {isLoggedIn
            ? <Link href="/studio" className="text-sm font-medium bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg transition-colors">Studio →</Link>
            : <Link href="/login" className="text-sm font-medium text-primary hover:text-secondary transition-colors hidden sm:block">Sign in →</Link>
          }
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6 text-center py-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-main mb-2 tracking-tight">
            Discover B2B tools <span className="text-primary">built by builders</span>
          </h1>
          <p className="text-muted text-base max-w-md mx-auto">
            Smart Audio-Slides — understand any dev tool in under 5 minutes.
          </p>
        </div>

        <div className="mb-6">
          <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted">
            {loading ? 'טוען...' : `${filtered.length} פוסטים`}
            {selectedCategory && ` · ${CATEGORIES.find(c => c.id === selectedCategory)?.label}`}
          </span>
          {(selectedCategory || selectedFormat) && (
            <button onClick={() => { setSelectedCategory(null); setSelectedFormat(null) }}
              className="text-xs text-muted hover:text-text-main underline">נקה פילטרים</button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-border" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-border rounded w-3/4" />
                  <div className="h-3 bg-border rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-muted">
            <p className="text-lg mb-2">אין פוסטים</p>
            <p className="text-sm">נסה פילטר אחר</p>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-16 py-6 text-center text-sm text-muted">
        BuildFeed — The Discovery Layer for Builders
      </footer>
    </div>
  )
}
