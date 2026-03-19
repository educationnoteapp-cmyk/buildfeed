'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Zap, Save, Globe, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DragDropUpload from '@/components/studio/DragDropUpload'
import SlideEditor from '@/components/studio/SlideEditor'
import { Slide, SlideType, CATEGORIES, PRODUCT_TYPES } from '@/lib/types'

type LocalSlide = Slide & { tempImageUrl?: string }

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export default function NewPostPage() {
  const router = useRouter()
  const supabase = createClient()

  const [postId] = useState(() => generateUUID())
  const [slides, setSlides] = useState<LocalSlide[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [productTypes, setProductTypes] = useState<string[]>([])
  const [productName, setProductName] = useState('')
  const [productTagline, setProductTagline] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)
  const [postCreated, setPostCreated] = useState(false)

  const format = slides.length <= 8 ? 'snap' : 'demo'

  // Auto-create post draft when first slide is added
  const ensurePostExists = useCallback(async () => {
    if (postCreated) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Create product first if name provided
    let productId: string | null = null
    if (productName) {
      const { data: prod } = await supabase
        .from('products')
        .insert({ creator_id: session.user.id, name: productName, tagline: productTagline, website_url: productUrl })
        .select('id')
        .single()
      productId = prod?.id ?? null
    }

    await supabase.from('posts').upsert({
      id: postId,
      creator_id: session.user.id,
      product_id: productId,
      title: title || 'טיוטה ללא כותרת',
      format,
      category: category || 'devtools',
      product_types: productTypes,
      tags: selectedTags,
      status: 'draft',
      slide_count: 0,
    })

    setPostCreated(true)
  }, [postCreated, postId, supabase, title, format, category, productTypes, selectedTags, productName, productTagline, productUrl])

  // Handle new slides from DragDrop
  const handleSlidesCreated = useCallback(async (uploaded: { tempId: string; imageUrl: string; position: number }[]) => {
    await ensurePostExists()

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
      created_at: new Date().toISOString(),
    }))

    setSlides(prev => [...prev, ...newSlides])

    // Save slides to DB
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    for (const slide of newSlides) {
      await supabase.from('slides').upsert({
        id: slide.id,
        post_id: postId,
        position: slide.position,
        slide_type: slide.slide_type,
        image_url: slide.image_url,
      })
    }

    // Update slide_count
    await supabase.from('posts').update({ slide_count: slides.length + newSlides.length }).eq('id', postId)
  }, [ensurePostExists, postId, supabase, slides.length])

  // Update single slide
  const handleSlideUpdate = useCallback(async (id: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    await supabase.from('slides').update(updates).eq('id', id)
  }, [supabase])

  // Delete slide
  const handleSlideDelete = useCallback(async (id: string) => {
    setSlides(prev => {
      const updated = prev.filter(s => s.id !== id)
      // Re-index positions
      return updated.map((s, i) => ({ ...s, position: i }))
    })
    await supabase.from('slides').delete().eq('id', id)
    await supabase.from('posts').update({ slide_count: slides.length - 1 }).eq('id', postId)
  }, [supabase, slides.length, postId])

  // Auto-save title/category when they change
  useEffect(() => {
    if (!postCreated || !title) return
    const timer = setTimeout(async () => {
      await supabase.from('posts').update({
        title,
        category: category || 'devtools',
        product_types: productTypes,
        tags: selectedTags,
        format,
        slide_count: slides.length,
      }).eq('id', postId)
      setAutoSaved(true)
      setTimeout(() => setAutoSaved(false), 2000)
    }, 800)
    return () => clearTimeout(timer)
  }, [title, category, productTypes, selectedTags, postCreated, supabase, postId, format, slides.length])

  const handleSaveDraft = async () => {
    setSaving(true)
    await ensurePostExists()
    await supabase.from('posts').update({
      title: title || 'טיוטה ללא כותרת',
      category: category || 'devtools',
      product_types: productTypes,
      tags: selectedTags,
      format,
      status: 'draft',
    }).eq('id', postId)
    setSaving(false)
    router.push('/studio')
  }

  const handlePublish = async () => {
    if (!title || !category || slides.length < 3) return
    setPublishing(true)
    await ensurePostExists()
    await supabase.from('posts').update({
      title,
      category,
      product_types: productTypes,
      tags: selectedTags,
      format,
      status: 'published',
      published_at: new Date().toISOString(),
      slide_count: slides.length,
    }).eq('id', postId)
    setPublishing(false)
    router.push('/')
  }

  const canPublish = title.length > 0 && category.length > 0 && slides.length >= 3

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev
    )
  }

  const toggleProductType = (type: string) => {
    setProductTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : prev.length < 2 ? [...prev, type] : prev
    )
  }

  // Tag bank per category
  const tagBank: Record<string, string[]> = {
    'ai-agents': ['openai', 'anthropic', 'gemini', 'agents', 'rag', 'embeddings', 'mcp', 'vector-db', 'llm-observability', 'evals'],
    'auth': ['clerk', 'auth0', 'supabase-auth', 'nextauth', 'sso', 'mfa', 'jwt', 'passkeys', 'rbac', 'oauth'],
    'payments': ['stripe', 'paddle', 'lemon-squeezy', 'subscription', 'usage-billing', 'metered', 'invoicing', 'mrr'],
    'analytics': ['posthog', 'mixpanel', 'amplitude', 'sentry', 'datadog', 'opentelemetry', 'llm-cost', 'token-tracking', 'feature-flags'],
    'email': ['resend', 'sendgrid', 'postmark', 'transactional', 'push', 'sms', 'webhooks', 'email-templates'],
    'devtools': ['nextjs', 'react', 'typescript', 'python', 'golang', 'cli', 'testing', 'ci-cd', 'docker', 'api-gateway', 'documentation'],
    'data': ['postgres', 'mysql', 'sqlite', 'mongodb', 'neon', 'planetscale', 'supabase', 'turso', 'redis', 'caching', 'search'],
  }

  const availableTags = category ? (tagBank[category] ?? []) : []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-muted hover:text-text-main transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <span className="text-sm font-medium text-text-main">פוסט חדש</span>
            {autoSaved && <span className="text-xs text-success">נשמר ✓</span>}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${format === 'snap' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-blue-400/10 text-blue-400'}`}>
              {format === 'snap' ? '⚡ Snap' : '📺 Demo'} · {slides.length} שקפים
            </span>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text-main border border-border hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Save size={13} /> {saving ? 'שומר...' : 'שמור טיוטה'}
            </button>
            <button
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="flex items-center gap-1.5 text-sm font-medium bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Globe size={13} /> {publishing ? 'מפרסם...' : 'פרסם'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Slides */}
          <div className="lg:col-span-2 space-y-4">
            {/* DragDrop */}
            <DragDropUpload
              postId={postId}
              onSlidesCreated={handleSlidesCreated}
              maxSlides={20}
              currentCount={slides.length}
            />

            {/* Slides list */}
            {slides.length > 0 && (
              <div className="space-y-3">
                {slides.map((slide, i) => (
                  <SlideEditor
                    key={slide.id}
                    slide={slide}
                    index={i}
                    postId={postId}
                    onUpdate={handleSlideUpdate}
                    onDelete={handleSlideDelete}
                  />
                ))}
              </div>
            )}

            {/* Validation hint */}
            {slides.length > 0 && slides.length < 3 && (
              <p className="text-xs text-muted text-center py-2">
                עוד {3 - slides.length} שקפים לפחות לפרסום
              </p>
            )}
          </div>

          {/* Right: Metadata */}
          <div className="space-y-4">
            {/* Title */}
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">פרטי פוסט</h3>

              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="כותרת הפוסט..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50 transition-colors"
              />

              {/* Category */}
              <div className="relative">
                <select
                  value={category}
                  onChange={e => { setCategory(e.target.value); setSelectedTags([]) }}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                >
                  <option value="">בחר קטגוריה...</option>
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Product Types */}
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">סוג מוצר (עד 2)</h3>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_TYPES.map(pt => (
                  <button
                    key={pt.id}
                    onClick={() => toggleProductType(pt.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      productTypes.includes(pt.id)
                        ? 'bg-secondary/20 border-secondary/40 text-secondary'
                        : 'border-border text-muted hover:border-white/20'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            {category && availableTags.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
                  תגיות (עד 3) · {selectedTags.length}/3
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-primary/20 border-primary/40 text-primary'
                          : 'border-border text-muted hover:border-white/20'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product info */}
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">פרטי מוצר</h3>
              <input
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="שם המוצר"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50"
              />
              <input
                value={productTagline}
                onChange={e => setProductTagline(e.target.value)}
                placeholder="תיאור קצר (tagline)"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50"
              />
              <input
                type="url"
                value={productUrl}
                onChange={e => setProductUrl(e.target.value)}
                placeholder="https://your-product.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50"
                dir="ltr"
              />
            </div>

            {/* Publish validation */}
            {!canPublish && title && category && (
              <p className="text-xs text-muted text-center">
                {slides.length < 3
                  ? `עוד ${3 - slides.length} שקפים לפרסום`
                  : 'הוסף כותרת וקטגוריה'}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
