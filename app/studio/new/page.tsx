'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Globe, ChevronDown, Zap } from 'lucide-react'
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

const TAG_BANK: Record<string, string[]> = {
  'ai-agents': ['openai','anthropic','gemini','agents','rag','embeddings','mcp','vector-db','evals','llm-observability'],
  'auth': ['clerk','auth0','supabase-auth','nextauth','sso','mfa','jwt','passkeys','rbac','oauth'],
  'payments': ['stripe','paddle','lemon-squeezy','subscription','usage-billing','metered','invoicing','mrr'],
  'analytics': ['posthog','mixpanel','amplitude','sentry','datadog','opentelemetry','llm-cost','token-tracking','feature-flags'],
  'email': ['resend','sendgrid','postmark','transactional','push','sms','webhooks','email-templates'],
  'devtools': ['nextjs','react','typescript','python','golang','cli','testing','ci-cd','docker','api-gateway','documentation'],
  'data': ['postgres','mysql','sqlite','mongodb','neon','planetscale','supabase','turso','redis','caching','search'],
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
  const [versionTags, setVersionTags] = useState<string[]>([])
  const [githubUrl, setGithubUrl] = useState('')
  const [versionInput, setVersionInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const postCreatedRef = useRef(false)
  const productIdRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)

  // Load user ID once on mount — avoids getSession lock issues
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userIdRef.current = user.id
        console.log('User loaded:', user.id)
      } else {
        router.push('/login')
      }
    })
  }, [supabase, router])

  const format = slides.length <= 8 ? 'snap' : 'demo'

  const ensurePostExists = useCallback(async () => {
    const userId = userIdRef.current
    if (!userId) { router.push('/login'); return false }

    // בדוק מגבלת יוצרים (רק בפרסום ראשון)
    if (!postCreatedRef.current) {
      try {
        const { data: canCreate } = await supabase.rpc('can_become_creator')
        if (canCreate && !canCreate.allowed) {
          router.push('/studio/waitlist')
          return false
        }
      } catch (e) {
        console.warn('can_become_creator check failed, continuing:', e)
      }
    }

    // Create product if needed and not yet created
    if (productName && !productIdRef.current) {
      const { data: prod, error: prodErr } = await supabase
        .from('products')
        .insert({
          creator_id: userId,
          name: productName,
          tagline: productTagline || null,
          website_url: productUrl || null,
        })
        .select('id')
        .single()
      if (prodErr) { console.error('Product error:', prodErr); }
      else { productIdRef.current = prod?.id ?? null }
    }

    if (!postCreatedRef.current) {
      const { error } = await supabase.from('posts').upsert({
        id: postId,
        creator_id: userId,
        product_id: productIdRef.current,
        title: title || 'טיוטה ללא כותרת',
        format,
        category: category || 'devtools',
        product_types: productTypes,
        tags: selectedTags,
        status: 'draft',
        slide_count: slides.length,
      })
      if (error) { console.error('Post error:', error); return false }
      postCreatedRef.current = true
    }
    return true
  }, [postId, supabase, router, title, format, category, productTypes, selectedTags, slides.length, productName, productTagline, productUrl])

  const handleSlidesCreated = useCallback(async (uploaded: { tempId: string; imageUrl: string; position: number }[]) => {
    const ok = await ensurePostExists()
    if (!ok) return

    const newSlides: LocalSlide[] = uploaded.map(u => ({
      id: u.tempId,
      post_id: postId,
      position: u.position,
      slide_type: 'media' as SlideType,
      image_url: u.imageUrl,
      tempImageUrl: u.imageUrl,
      audio_url: null,
      audio_duration_seconds: null,
      audio_volume: 1.0,
      slide_duration_seconds: 3,
      code_content: null,
      code_language: null,
      hotspot_url: null,
      created_at: new Date().toISOString(),
    }))

    setSlides(prev => [...prev, ...newSlides])

    for (const slide of newSlides) {
      const { error: slideErr } = await supabase.from('slides').upsert({
        id: slide.id,
        post_id: postId,
        position: slide.position,
        slide_type: 'media',
        image_url: slide.image_url,
        slide_duration_seconds: 3,
      })
      if (slideErr) console.error('Slide error:', slideErr)
    }

    await supabase.from('posts').update({ slide_count: slides.length + newSlides.length }).eq('id', postId)
    setAutoSaved(true)
    setTimeout(() => setAutoSaved(false), 2000)
  }, [ensurePostExists, postId, supabase, slides.length])

  const handleSlideUpdate = useCallback(async (id: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    const { error } = await supabase.from('slides').update(updates).eq('id', id)
    if (!error) {
      setAutoSaved(true)
      setTimeout(() => setAutoSaved(false), 2000)
    }
  }, [supabase])

  const handleSlideDelete = useCallback(async (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, position: i })))
    await supabase.from('slides').delete().eq('id', id)
    await supabase.from('posts').update({ slide_count: Math.max(0, slides.length - 1) }).eq('id', postId)
  }, [supabase, slides.length, postId])

  // Auto-save when metadata changes
  useEffect(() => {
    if (!postCreatedRef.current) return
    const timer = setTimeout(async () => {
      const { error } = await supabase.from('posts').update({
        title: title || 'טיוטה ללא כותרת',
        category: category || 'devtools',
        product_types: productTypes,
        tags: selectedTags,
        format,
        slide_count: slides.length,
      }).eq('id', postId)
      if (!error) {
        setAutoSaved(true)
        setTimeout(() => setAutoSaved(false), 2000)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [title, category, productTypes, selectedTags, supabase, postId, format, slides.length])

  const handleSaveDraft = async () => {
    setSaving(true)
    setSaveError(null)
    const ok = await ensurePostExists()
    if (!ok) { setSaving(false); return }

    const { error } = await supabase.from('posts').update({
      title: title || 'טיוטה ללא כותרת',
      category: category || 'devtools',
      product_types: productTypes,
      tags: selectedTags,
      format,
      version_tags: versionTags,
      github_url: githubUrl || null,
      status: 'draft',
      slide_count: slides.length,
    }).eq('id', postId)

    setSaving(false)
    if (error) { setSaveError('שגיאה בשמירה: ' + error.message); return }
    router.push('/studio')
  }

  const handlePublish = async () => {
    if (!title || !category || slides.length < 3) return
    setPublishing(true)
    setSaveError(null)
    const ok = await ensurePostExists()
    if (!ok) { setPublishing(false); return }

    const { error } = await supabase.from('posts').update({
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
    if (error) { setSaveError('שגיאה בפרסום: ' + error.message); return }
    router.push('/')
  }

  const canPublish = title.length > 0 && category.length > 0 && slides.length >= 3

  const toggleTag = (tag: string) => setSelectedTags(prev =>
    prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
  )
  const toggleProductType = (type: string) => setProductTypes(prev =>
    prev.includes(type) ? prev.filter(t => t !== type) : prev.length < 2 ? [...prev, type] : prev
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-muted hover:text-text-main transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                <Zap size={12} className="text-white" fill="white" />
              </div>
            </Link>
            <span className="text-sm font-medium text-text-main">פוסט חדש</span>
            {autoSaved && <span className="text-xs text-success">✓ נשמר</span>}
            {saveError && <span className="text-xs text-red-400">{saveError}</span>}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${format === 'snap' ? 'bg-amber-400/10 text-amber-400' : 'bg-blue-400/10 text-blue-400'}`}>
              {format === 'snap' ? '⚡ Snap' : '📺 Demo'} · {slides.length}
            </span>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text-main border border-border hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={13} /> {saving ? 'שומר...' : 'שמור טיוטה'}
            </button>
            <button
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="flex items-center gap-1.5 text-sm font-medium bg-primary hover:bg-primary/90 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Globe size={13} /> {publishing ? 'מפרסם...' : 'פרסם'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!canPublish && slides.length > 0 && (
          <div className="mb-4 p-3 bg-amber-400/5 border border-amber-400/20 rounded-xl text-xs text-amber-400">
            {slides.length < 3 && `עוד ${3 - slides.length} שקפים לפרסום · `}
            {!title && 'חסרה כותרת · '}
            {!category && 'חסרה קטגוריה'}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <DragDropUpload postId={postId} onSlidesCreated={handleSlidesCreated} maxSlides={20} currentCount={slides.length} />
            {slides.map((slide, i) => (
              <SlideEditor key={slide.id} slide={slide} index={i} postId={postId} onUpdate={handleSlideUpdate} onDelete={handleSlideDelete} />
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">פרטי פוסט</h3>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="כותרת הפוסט..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50"
              />
              <div className="relative">
                <select value={category} onChange={e => { setCategory(e.target.value); setSelectedTags([]) }}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary/50 appearance-none cursor-pointer">
                  <option value="">בחר קטגוריה...</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">סוג מוצר (עד 2)</h3>
              <div className="flex flex-wrap gap-1.5">
                {PRODUCT_TYPES.map(pt => (
                  <button key={pt.id} onClick={() => toggleProductType(pt.id)}
                    className={'text-xs px-2.5 py-1 rounded-full border transition-colors ' + (productTypes.includes(pt.id) ? 'bg-secondary/20 border-secondary/40 text-secondary' : 'border-border text-muted hover:border-white/20')}>
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {category && (TAG_BANK[category] ?? []).length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-medium text-muted uppercase tracking-wider">תגיות · {selectedTags.length}/3</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(TAG_BANK[category] ?? []).map(tag => (
                    <button key={tag} onClick={() => toggleTag(tag)}
                      className={'text-xs px-2 py-0.5 rounded-full border transition-colors ' + (selectedTags.includes(tag) ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted hover:border-white/20')}>
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}


            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">גרסאות</h3>
              <p className="text-xs text-muted">ציין על אילו גרסאות הקוד עובד</p>
              <div className="flex gap-2">
                <input
                  value={versionInput}
                  onChange={e => setVersionInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && versionInput.trim() && versionTags.length < 5) {
                      setVersionTags(prev => [...prev, versionInput.trim()])
                      setVersionInput('')
                    }
                  }}
                  placeholder="React 18, Node 20..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {versionTags.map(tag => (
                  <span key={tag} onClick={() => setVersionTags(prev => prev.filter(t => t !== tag))}
                    className="text-xs px-2.5 py-1 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20 cursor-pointer hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/20 transition-colors">
                    {tag} ×
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                <span className="text-xs text-muted flex-shrink-0">GitHub:</span>
                <input type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="flex-1 bg-transparent text-sm text-text-main placeholder-muted focus:outline-none" dir="ltr" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">פרטי מוצר</h3>
              <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="שם המוצר"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50" />
              <input value={productTagline} onChange={e => setProductTagline(e.target.value)} placeholder="תיאור קצר"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50" />
              <input type="url" value={productUrl} onChange={e => setProductUrl(e.target.value)} placeholder="https://your-product.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50" dir="ltr" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
