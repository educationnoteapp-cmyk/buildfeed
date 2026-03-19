'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NotWorkingButton({ postId }: { postId: string }) {
  const [marked, setMarked] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      const { data: post } = await supabase
        .from('posts').select('not_working_count').eq('id', postId).single()
      if (post) setCount(post.not_working_count ?? 0)

      if (session) {
        const { data } = await supabase
          .from('post_not_working').select('user_id')
          .eq('user_id', session.user.id).eq('post_id', postId).single()
        setMarked(!!data)
      }
    }
    init()
  }, [postId, supabase])

  const toggle = async () => {
    if (!session) { window.location.href = '/login'; return }
    setLoading(true)

    if (marked) {
      await supabase.from('post_not_working').delete()
        .eq('user_id', session.user.id).eq('post_id', postId)
      await supabase.rpc('decrement_counter', {
        table_name: 'posts', column_name: 'not_working_count', row_id: postId
      })
      setCount(c => Math.max(0, c - 1))
      setMarked(false)
    } else {
      await supabase.from('post_not_working').insert({ user_id: session.user.id, post_id: postId })
      await supabase.rpc('increment_counter', {
        table_name: 'posts', column_name: 'not_working_count', row_id: postId
      })
      setCount(c => c + 1)
      setMarked(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={marked ? 'בטל דיווח' : 'הקוד כבר לא עובד?'}
      className={'flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl border transition-all disabled:opacity-50 ' + (
        marked
          ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
          : 'border-border text-muted hover:border-orange-500/30 hover:text-orange-400'
      )}
    >
      <AlertTriangle size={12} />
      לא עובד עוד
      {count > 0 && (
        <span className={'text-[10px] px-1.5 py-0.5 rounded-full ' + (marked ? 'bg-orange-500/20 text-orange-400' : 'bg-white/8 text-muted')}>
          {count}
        </span>
      )}
    </button>
  )
}
