'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/types'

const STACK_TAGS = [
  'nextjs', 'react', 'typescript', 'python', 'golang', 'nodejs',
  'supabase', 'postgres', 'redis', 'stripe', 'openai', 'anthropic',
  'vercel', 'cloudflare', 'docker', 'aws', 'tailwind', 'prisma'
]

export default function ProfileEditPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [primaryCategory, setPrimaryCategory] = useState('')
  const [stackTags, setStackTags] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [preferredStacks, setPreferredStacks] = useState<string[]>([])
  const [contact1Url, setContact1Url] = useState('')
  const [contact1Label, setContact1Label] = useState('צור קשר')
  const [contact2Url, setContact2Url] = useState('')
  const [contact2Label, setContact2Label] = useState('קבע פגישה')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setDisplayName(data.display_name ?? '')
        setBio(data.bio ?? '')
        setGithubUrl(data.github_url ?? '')
        setTwitterUrl(data.twitter_url ?? '')
        setPrimaryCategory(data.primary_category ?? '')
        setStackTags(data.stack_tags ?? [])
        setAvatarUrl(data.avatar_url ?? '')
        setPreferredStacks(data.preferred_stacks ?? [])
        setContact1Url(data.contact_link_1_url ?? '')
        setContact1Label(data.contact_link_1_label ?? 'צור קשר')
        setContact2Url(data.contact_link_2_url ?? '')
        setContact2Label(data.contact_link_2_label ?? 'קבע פגישה')
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const toggleStackTag = (tag: string) => {
    setStackTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio,
        github_url: githubUrl || null,
        twitter_url: twitterUrl || null,
        primary_category: primaryCategory || null,
        stack_tags: stackTags,
        preferred_stacks: preferredStacks,
        contact_link_1_url: contact1Url || null,
        contact_link_1_label: contact1Label || 'צור קשר',
        contact_link_2_url: contact2Url || null,
        contact_link_2_label: contact2Label || 'קבע פגישה',
      })
      .eq('id', session.user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-muted hover:text-text-main transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <span className="text-sm font-medium text-text-main">עריכת פרופיל</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {saved ? <><Check size={13} /> נשמר!</> : <><Save size={13} /> {saving ? 'שומר...' : 'שמור'}</>}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Avatar */}
        {avatarUrl && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt="" className="w-16 h-16 rounded-2xl" />
            <div>
              <p className="text-sm font-medium text-text-main">תמונת פרופיל</p>
              <p className="text-xs text-muted">מסונכרן מ-GitHub/Google אוטומטית</p>
            </div>
          </div>
        )}

        {/* Basic info */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider">פרטים בסיסיים</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted mb-1 block">שם תצוגה</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="השם שלך"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="text-xs text-muted mb-1 block">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="ספר על מה שאתה בונה..."
                rows={3}
                maxLength={160}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50 resize-none"
              />
              <p className="text-xs text-muted mt-1 text-right">{bio.length}/160</p>
            </div>
          </div>
        </div>

        {/* Social links */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider">קישורים</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted mb-1 block">GitHub URL</label>
              <input
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Twitter / X URL</label>
              <input
                value={twitterUrl}
                onChange={e => setTwitterUrl(e.target.value)}
                placeholder="https://twitter.com/username"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider">קטגוריה ראשית</h2>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setPrimaryCategory(cat.id)}
                className={`text-sm px-3 py-2 rounded-lg border text-left transition-colors ${
                  primaryCategory === cat.id
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'border-border text-muted hover:border-white/20 hover:text-text-main'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>



        {/* Preferred stack */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider">הסטאק שלי</h2>
            <span className="text-xs text-muted">{preferredStacks.length}/5 — הפיד יותאם אליך</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['nextjs','react','typescript','python','golang','nodejs','supabase','postgres',
              'redis','stripe','openai','anthropic','vercel','cloudflare','docker','aws'].map(tag => (
              <button key={tag}
                onClick={() => setPreferredStacks(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
                )}
                className={'text-xs px-2.5 py-1 rounded-full border transition-colors ' + (
                  preferredStacks.includes(tag)
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'border-border text-muted hover:border-white/20'
                )}>
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Contact links */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider">קישורי יצירת קשר</h2>
          <p className="text-xs text-muted">יוצגו בעמוד הפוסט שלך — Calendly, Twitter, Discord, אימייל וכו׳</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input value={contact1Label} onChange={e => setContact1Label(e.target.value)}
                placeholder="טקסט הכפתור" className="w-28 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50" />
              <input type="url" value={contact1Url} onChange={e => setContact1Url(e.target.value)}
                placeholder="https://calendly.com/..." className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50" dir="ltr" />
            </div>
            <div className="flex gap-2">
              <input value={contact2Label} onChange={e => setContact2Label(e.target.value)}
                placeholder="טקסט הכפתור" className="w-28 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50" />
              <input type="url" value={contact2Url} onChange={e => setContact2Url(e.target.value)}
                placeholder="https://twitter.com/..." className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder-muted focus:outline-none focus:border-primary/50" dir="ltr" />
            </div>
          </div>
        </div>

        {/* Stack tags */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider">Stack Tags</h2>
            <span className="text-xs text-muted">{stackTags.length}/3</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {STACK_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleStackTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  stackTags.includes(tag)
                    ? 'bg-secondary/15 border-secondary/40 text-secondary'
                    : 'border-border text-muted hover:border-white/20'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
