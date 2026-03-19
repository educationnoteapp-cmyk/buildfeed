'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Globe, Trash2, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SlideEditor from '@/components/studio/SlideEditor'
import DragDropUpload from '@/components/studio/DragDropUpload'
import { Slide, SlideType, CATEGORIES, PRODUCT_TYPES } from '@/lib/types'

type LocalSlide = Slide & { tempImageUrl?: string }

export default function EditPostPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const postId = params.id

  const [slides, setSlides] = useState<LocalSlide[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [productTypes, setProductTypes] = useState<string[]>([])
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)

  // Load post data
  useEffect(() => {
    const load = async () => {
      const { data: post } = await supabase
        .from('posts')
        .select('*, slides(*)')
        .eq('id', postId)
        .single()

      if (!post) { router.push('/studio'); return }

      setTitle(post.title ?? '')
      setCategory(post.category ?? '')
      setSelectedTags(post.tags ?? [])
      setProductTypes(post.product_types ?? [])
      setStatus(post.status)

      const sortedSlides = (post.slides ?? []).sort((a: Slide, b: Slide) => a.position - b.position)
      setSlides(sortedSlides)
      setLoading(false)
    }
    load()
  }, [postId, supabase, router])

  const handleSlideUpdate = useCallback(async (id: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    await supabase.from('slides').update(updates).eq('id', id)
    setAutoSaved(true)
    setTimeout(() => setAutoSaved(false), 2000)
  }, [supabase])

  const handleSlideDelete = useCallback(async (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, position: i })))
    await supabase.from('slides').delete().eq('id', id)
  }, [supabase])

  const handleSlidesCreated = useCallback(async (uploaded: { tempId: string; imageUrl: string; position: number }[]) => {
    const newSlides: LocalSlide[] = uploaded.map(u => ({
      id: u.tempId,
      post_id: postId,
      position: u.position,
      slide_type: 'media' as SlideType,
      image_url: u.imageUrl,
      tempImageUrl: u.imageUrl,
      audio_url: null,
      audio_duration_seconds: null,
      code_content: null,
      code_language: null,
      hotspot_url: null,
      slide_duration_seconds: 3,
      created_at: new Date().toISOString(),
    }))

    setSlides(prev => [...prev, ...newSlides])

    for (const slide of newSlides) {
      await supabase.from('slides').upsert({
        id: slide.id,
        post_id: postId,
        position: slide.position,
        slide_type: 'media',
        image_url: slide.image_url,
      })
    }
  }, [postId, supabase])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('posts').update({
      title,
      category,
      product_types: productTypes,
      tags: selectedTags,
      slide_count: slides.length,
    }).eq('id', postId)
    setSaving(false)
    setAutoSaved(true)
    setTimeout(() => setAutoSaved(false), 2000)
  }

  const handlePublishToggle = async () => {
    const newStatus = status === 'published' ? 'draft' : 'published'
    await supabase.from('posts').update({
      status: newStatus,
      published_at: newStatus === 'published' ? new Date().toISOString() : null,
    }).eq('id', postId)
    setStatus(newStatus)
  }

  const handleDelete = async () => {
    if (!confirm('למחוק את הפוסט הזה?')) return
    await supabase.from('posts').delete().eq('id', postId)
    router.push('/studio')
  }

  const tagBank: Record<string, string[]> = {
    'ai-agents': ['openai', 'anthropic', 'agents', 'rag', 'embeddings', 'mcp', 'vector-db', 'evals'],
    'auth': ['clerk', 'auth0', 'supabase-auth', 'sso', 'mfa', 'jwt', 'passkeys', 'rbac'],
    'payments': ['stripe', 'paddle', 'lemon-squeezy', 'subscription', 'usage-billing', 'metered'],
    'analytics': ['posthog', 'mixpanel', 'amplitude', 'sentry', 'datadog', 'llm-cost', 'feature-flags'],
    'email': ['resend', 'sendgrid', 'transactional', 'push', 'sms', 'webhooks'],
    'devtools': ['nextjs', 'react', 'typescript', 'python', 'golang', 'cli', 'testing', 'docker'],
    'data': ['postgres', 'mysql', 'mongodb', 'neon', 'supabase', 'redis', 'search'],
  }

  const toggleTag = (tag: string) => setSelectedTags(prev =>
    prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
  )
  const toggleType = (type: string) => setProductTypes(prev =>
    prev.includes(type) ? prev.filter(t => t !== type) : prev.length < 2 ? [...prev, type] : prev
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-muted hover:text-text-main transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <span className="text-sm font-medium text-text-main truncate max-w-xs">{title || 'ללא כותרת'}</span>
            {autoSaved && <span className="text-xs text-success">נשמר ✓</span>}
          </div>

          <div className="flex items-center gap-2">
            {status === 'published' && (
              <Link href={`/post/${postId}`} target="_blank"
                className="flex items-center gap-1 text-xs text-muted hover:text-text-main border border-border rounded-lg px-2 py-1.5 transition-colors">
                <Eye size={12} /> צפה
              </Link>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text-main border border-border px-3 py-1.5 rounded-lg transition-colors">
              <Save size={13} /> {saving ? 'שומר...' : 'שמור'}
            </button>
            <button onClick={handlePublishToggle}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                status === 'published'
                  ? 'bg-surface border border-border text-muted hover:border-white/20'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}>
              <Globe size={13} />
              {status === 'published' ? 'הסר מהפיד' : 'פרסם'}
            </button>
            <button onClick={handleDelete} className="w-8 h-8 flex items-center justify-center text-muted hover:text-red-400 transition-colors border border-border rounded-lg">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <DragDropUpload postId={postId} onSlidesCreated={handleSlidesCreated} currentCount={slides.length} />
            {slides.map((slide, i) => (
              <SlideEditor key={slide.id} slide={slide} index={i} postId={postId}
                onUpdate={handleSlideUpdate} onDelete={handleSlideDelete} />
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">פרטי פוסט</h3>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50" />
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none appearance-none cursor-pointer">
                <option value="">בחר קטגוריה...</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">סוג מוצר</h3>
              <div className="flex flex-wrap gap-1.5">
                {PRODUCT_TYPES.map(pt => (
                  <button key={pt.id} onClick={() => toggleType(pt.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${productTypes.includes(pt.id) ? 'bg-secondary/20 border-secondary/40 text-secondary' : 'border-border text-muted hover:border-white/20'}`}>
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {category && (tagBank[category] ?? []).length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-medium text-muted uppercase tracking-wider">תגיות · {selectedTags.length}/3</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(tagBank[category] ?? []).map(tag => (
                    <button key={tag} onClick={() => toggleTag(tag)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${selectedTags.includes(tag) ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted hover:border-white/20'}`}>
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
