'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/ui/Logo'
import { Check, ChevronLeft } from 'lucide-react'

const STACKS = [
  { id: 'nextjs', label: 'Next.js' },
  { id: 'react', label: 'React' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'golang', label: 'Go' },
  { id: 'nodejs', label: 'Node.js' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'postgres', label: 'Postgres' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'vercel', label: 'Vercel' },
  { id: 'cloudflare', label: 'Cloudflare' },
  { id: 'docker', label: 'Docker' },
  { id: 'redis', label: 'Redis' },
]

type Role = 'discover' | 'publish' | 'both'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<Role | null>(null)
  const [stacks, setStacks] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // אם כבר עשה onboarding — הפנה לפיד
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', session.user.id)
        .single()
      if (profile?.onboarding_done) { router.push('/'); return }
      setChecking(false)
    }
    check()
  }, [supabase, router])

  const toggleStack = (id: string) => {
    setStacks(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : prev.length < 5 ? [...prev, id] : prev
    )
  }

  const handleRoleSelect = (r: Role) => {
    setRole(r)
    if (r === 'publish') {
      // בדוק מגבלה ועבור לשלב סיום
      setStep(3)
    } else {
      setStep(2)
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('profiles').update({
      stack_tags: stacks,
      onboarding_done: true,
    }).eq('id', session.user.id)

    if (role === 'publish') {
      // בדוק מגבלת יוצרים
      const { data: canCreate } = await supabase.rpc('can_become_creator')
      if (canCreate && !canCreate.allowed) {
        router.push('/studio/waitlist')
        return
      }
      router.push('/studio/new')
    } else {
      router.push('/')
    }
  }

  if (checking) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={28} />
          <span className="font-bold text-text-main text-lg">BuildFeed</span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className={'h-1.5 rounded-full transition-all ' + (
              i === step ? 'w-6 bg-primary' : i < step ? 'w-3 bg-primary/40' : 'w-3 bg-white/10'
            )} />
          ))}
        </div>

        {/* Step 1 — מה אתה כאן לעשות */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-text-main mb-1">ברוך הבא ל-BuildFeed 👋</h1>
              <p className="text-muted text-sm">מה אתה בעיקר כאן לעשות?</p>
            </div>
            {[
              { id: 'discover' as Role, icon: '👀', title: 'לגלות כלים', desc: 'אני מחפש dev tools שיעזרו לי לבנות' },
              { id: 'publish' as Role, icon: '🚀', title: 'לפרסם את הכלי שלי', desc: 'בניתי כלי ורוצה להציג אותו למפתחים' },
              { id: 'both' as Role, icon: '⚡', title: 'שניהם', desc: 'מגלה כלים ומפרסם את שלי' },
            ].map(opt => (
              <button key={opt.id} onClick={() => handleRoleSelect(opt.id)}
                className="w-full flex items-center gap-4 p-4 bg-surface border border-border hover:border-primary/50 hover:bg-primary/5 rounded-xl transition-all text-right">
                <span className="text-2xl">{opt.icon}</span>
                <div>
                  <p className="text-sm font-medium text-text-main">{opt.title}</p>
                  <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Stack */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-muted hover:text-text-main mb-6 transition-colors">
              <ChevronLeft size={14} /> חזרה
            </button>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-text-main mb-1">מה ה-Stack שלך?</h1>
              <p className="text-muted text-sm">בחר עד 5 טכנולוגיות — הפיד יותאם לך</p>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {STACKS.map(s => {
                const selected = stacks.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleStack(s.id)}
                    className={'flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-all ' + (
                      selected
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-surface border-border text-muted hover:border-white/20 hover:text-text-main'
                    )}>
                    {selected && <Check size={11} />}
                    {s.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted text-center mb-4">
              {stacks.length}/5 נבחרו {stacks.length === 0 && '· אפשר לדלג'}
            </p>
            <button onClick={() => setStep(3)}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-colors">
              {stacks.length === 0 ? 'דלג' : 'המשך'}
            </button>
          </div>
        )}

        {/* Step 3 — סיום */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-4 text-3xl">
              {role === 'publish' ? '🚀' : '⚡'}
            </div>
            <h1 className="text-xl font-bold text-text-main mb-2">
              {role === 'publish' ? 'בוא נפרסם את הכלי שלך' : 'הפיד מוכן לך'}
            </h1>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              {role === 'publish'
                ? 'תעלה תמונות, תקליט הסבר קצר לכל שקף — וזהו. פחות מ-5 דקות.'
                : 'הפיד מותאם לפי ה-Stack שבחרת. תמיד אפשר לשנות בהגדרות.'}
            </p>
            <button onClick={handleFinish} disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors">
              {loading ? 'שנייה...' : role === 'publish' ? 'צור פוסט ראשון ←' : 'בוא נתחיל ←'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
