'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface WorkedButtonProps {
  postId: string
  initialWorked?: boolean
  initialCount?: number
}

export default function WorkedButton({ postId, initialWorked = false, initialCount = 0 }: WorkedButtonProps) {
  const [worked, setWorked] = useState(initialWorked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const res = await fetch('/api/post/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, action: 'worked' }),
    })
    if (res.status === 401) { window.location.href = '/login'; return }
    const data = await res.json()
    if (typeof data.worked === 'boolean') {
      setWorked(data.worked)
      setCount(c => data.worked ? c + 1 : Math.max(0, c - 1))
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
