'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface NotWorkingButtonProps {
  postId: string
  initialMarked?: boolean
  initialCount?: number
}

export default function NotWorkingButton({ postId, initialMarked = false, initialCount = 0 }: NotWorkingButtonProps) {
  const [marked, setMarked] = useState(initialMarked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const res = await fetch('/api/post/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, action: 'not_working' }),
    })
    if (res.status === 401) { window.location.href = '/login'; return }
    const data = await res.json()
    if (typeof data.not_working === 'boolean') {
      setMarked(data.not_working)
      setCount(c => data.not_working ? c + 1 : Math.max(0, c - 1))
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
