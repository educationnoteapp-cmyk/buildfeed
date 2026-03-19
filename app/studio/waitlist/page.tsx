'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/ui/Logo'

export default function WaitlistPage() {
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [position, setPosition] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data } = await supabase
        .from('creator_waitlist')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (data) {
        setJoined(true)
        const { count } = await supabase
          .from('creator_waitlist')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', new Date().toISOString())
        setPosition(count ?? 0)
      }
      setLoading(false)
    }
    check()
  }, [supabase])

  const handleJoin = async () => {
    setJoining(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single()

    if (!profile) return

    const { data: user } = await supabase.auth.getUser()
    await supabase.from('creator_waitlist').upsert({
      email: user.user?.email ?? '',
      user_id: session.user.id,
    })

    const { count } = await supabase
      .from('creator_waitlist')
      .select('*', { count: 'exact', head: true })
    setPosition(count ?? 0)
    setJoined(true)
    setJoining(false)
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Logo size={32} />
          <span className="font-bold text-text-main text-xl">BuildFeed</span>
        </Link>

        {!joined ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center mx-auto">
              <Clock size={28} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-main mb-2">
                BuildFeed הוא ב-Early Access
              </h1>
              <p className="text-muted text-sm leading-relaxed">
                הגענו למגבלת היוצרים שלנו לשלב זה. הצטרף לרשימת המתנה ונעדכן אותך כשמקום יתפנה.
              </p>
            </div>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
            >
              {joining ? 'מצטרף...' : 'הצטרף לרשימת המתנה'}
            </button>
            <Link href="/" className="block text-sm text-muted hover:text-text-main transition-colors">
              חזור לפיד →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-green-400/15 border border-green-400/25 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-main mb-2">
                אתה ברשימה! 🎉
              </h1>
              <p className="text-muted text-sm leading-relaxed">
                אתה מקום <span className="text-text-main font-bold">#{position}</span> ברשימת המתנה.
                נשלח לך התראה כשמקום יתפנה.
              </p>
            </div>
            <Link href="/"
              className="block w-full bg-surface border border-border hover:border-white/20 text-text-main font-medium py-3 rounded-xl transition-colors">
              המשך לגלות כלים →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
