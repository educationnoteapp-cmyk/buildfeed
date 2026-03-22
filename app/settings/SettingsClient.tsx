'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Volume2, Bell, Trash2, ChevronLeft, Check, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Settings {
  player_mode: 'auto' | 'manual'
  mute_by_default: boolean
  notify_followers: boolean
  notify_comments: boolean
  notify_trending: boolean
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ' + (on ? 'bg-primary' : 'bg-white/15')}
    >
      <span className={'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ' + (on ? 'left-5.5 translate-x-0.5' : 'left-0.5')} />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2 px-1">{title}</p>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {children}
      </div>
    </section>
  )
}

function Row({ icon: Icon, label, desc, children }: {
  icon: React.ElementType; label: string; desc?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-8 h-8 rounded-xl bg-white/6 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-main">{label}</p>
        {desc && <p className="text-xs text-muted mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState<Settings>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const update = async (patch: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleDelete = async () => {
    if (deleteInput !== 'מחק') return
    setDeleting(true)
    const res = await fetch('/api/settings', { method: 'DELETE' })
    if (res.ok) {
      // Sign out on client after server deleted the data
      const { createClient } = await import('@/lib/supabase/client')
      await createClient().auth.signOut()
      router.push('/')
    } else {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 z-10 flex items-center gap-3">
        <Link href="/studio" className="w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-text-main transition-colors">
          <ChevronLeft size={16} />
        </Link>
        <h1 className="text-base font-bold text-text-main flex-1">הגדרות</h1>
        {(saving || saved) && (
          <span className="flex items-center gap-1 text-xs text-muted">
            {saved ? <><Check size={12} className="text-green-400" /> נשמר</> : 'שומר...'}
          </span>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-6">

        <Section title="פלייר">
          <Row icon={Play} label="מצב ניגון" desc={settings.player_mode === 'auto' ? 'עובר לשקף הבא כשהאודיו נגמר' : 'עובר רק כשמחליק ידנית'}>
            <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1">
              {(['auto', 'manual'] as const).map(mode => (
                <button key={mode} onClick={() => update({ player_mode: mode })}
                  className={'text-xs px-3 py-1.5 rounded-lg transition-all font-medium ' + (
                    settings.player_mode === mode ? 'bg-primary text-white' : 'text-muted hover:text-text-main'
                  )}>
                  {mode === 'auto' ? '⚡ אוטומטי' : '👆 ידני'}
                </button>
              ))}
            </div>
          </Row>
          <Row icon={Volume2} label="עצום אודיו כברירת מחדל" desc="ניתן להפעיל בתוך כל פוסט">
            <Toggle on={settings.mute_by_default} onChange={v => update({ mute_by_default: v })} />
          </Row>
        </Section>

        <Section title="התראות">
          <Row icon={Bell} label="עוקבים חדשים">
            <Toggle on={settings.notify_followers} onChange={v => update({ notify_followers: v })} />
          </Row>
          <Row icon={Bell} label="תגובות על פוסטים">
            <Toggle on={settings.notify_comments} onChange={v => update({ notify_comments: v })} />
          </Row>
          <Row icon={Bell} label="פוסט הופך טרנדי">
            <Toggle on={settings.notify_trending} onChange={v => update({ notify_trending: v })} />
          </Row>
        </Section>

        <Section title="חשבון">
          <Row icon={Trash2} label="מחיקת חשבון" desc="פעולה בלתי הפיכה — כל הפוסטים יימחקו">
            <button onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-xl hover:bg-red-400/10 transition-colors">
              מחק
            </button>
          </Row>
        </Section>

        {showDeleteConfirm && (
          <div className="bg-red-400/8 border border-red-400/25 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-main">מחיקת חשבון לצמיתות</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  כל הפוסטים, ההגדרות והנתונים שלך יימחקו. לא ניתן לשחזר.
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted mb-2">כתוב <span className="text-red-400 font-mono font-bold">מחק</span> לאישור:</p>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="מחק"
                className="w-full bg-background border border-red-400/30 rounded-xl px-3 py-2 text-sm text-text-main placeholder-muted/40 focus:outline-none focus:border-red-400/60"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
                className="flex-1 text-sm text-muted border border-border py-2 rounded-xl hover:border-white/20 transition-colors">
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteInput !== 'מחק' || deleting}
                className="flex-1 text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 py-2 rounded-xl transition-colors font-medium">
                {deleting ? 'מוחק...' : 'מחק לצמיתות'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
