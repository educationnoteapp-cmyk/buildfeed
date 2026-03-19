'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function WorkedButton({ postId }: { postId: string }) {
  const [worked, setWorked] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      const { data: post } = await supabase
        .from('posts')
        .select('worked_count')
        .eq('id', postId)
        .single()
      if (post) setCount(post.worked_count ?? 0)

      if (session) {
        const { data } = await supabase
          .from('post_worked')
          .select('user_id')
          .eq('user_id', session.user.id)
          .eq('post_id', postId)
          .single()
        setWorked(!!data)
      }
    }
    init()
  }, [postId, supabase])

  const toggle = async () => {
    if (!session) { window.location.href = '/login'; return }
    setLoading(true)

    if (worked) {
      await supabase.from('post_worked').delete()
        .eq('user_id', session.user.id).eq('post_id', postId)
      await supabase.rpc('decrement_counter', {
        table_name: 'posts', column_name: 'worked_count', row_id: postId
      })
      setCount(c => Math.max(0, c - 1))
      setWorked(false)
    } else {
      await supabase.from('post_worked').insert({ user_id: session.user.id, post_id: postId })
      await supabase.rpc('increment_counter', {
        table_name: 'posts', column_name: 'worked_count', row_id: postId
      })
      setCount(c => c + 1)
      setWorked(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={worked ? 'ביטול — עבד לי' : 'עבד לי!'}
      className={'flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl border transition-all disabled:opacity-50 ' + (
        worked
          ? 'bg-green-500/15 border-green-500/30 text-green-400'
          : 'border-border text-muted hover:border-green-500/30 hover:text-green-400'
      )}
    >
      <CheckCircle2 size={14} className={worked ? 'fill-green-400/20' : ''} />
      עבד לי
      {count > 0 && (
        <span className={'text-xs px-1.5 py-0.5 rounded-full ' + (worked ? 'bg-green-500/20 text-green-400' : 'bg-white/8 text-muted')}>
          {count}
        </span>
      )}
    </button>
  )
}
