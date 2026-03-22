'use client'
import { useState, useEffect } from 'react'
import { UserPlus, UserCheck, Bell, BellOff } from 'lucide-react'

interface FollowButtonProps {
  targetId: string
  type: 'creator' | 'product'
  size?: 'sm' | 'md'
}

export default function FollowButton({ targetId, type, size = 'md' }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        // Use API route instead of broken Supabase client
        const res = await fetch('/api/auth/me', { signal: AbortSignal.timeout(5000) })
        if (!res.ok) { setLoading(false); return }
        const { userId: uid } = await res.json()
        if (!uid) { setLoading(false); return }
        setUserId(uid)

        // Check follow status
        const followRes = await fetch(
          `/api/follow/check?targetId=${targetId}&type=${type}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (followRes.ok) {
          const { isFollowing } = await followRes.json()
          setIsFollowing(isFollowing)
        }
      } catch {
        // timeout or error — show button as not following, let user try
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [targetId, type])

  const toggle = async () => {
    if (!userId) {
      window.location.href = '/login'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/follow', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, type }),
      })
      if (res.ok) setIsFollowing(f => !f)
    } finally {
      setLoading(false)
    }
  }

  const Icon = type === 'creator'
    ? (isFollowing ? UserCheck : UserPlus)
    : (isFollowing ? BellOff : Bell)

  const label = isFollowing
    ? (type === 'creator' ? 'עוקב' : 'בהתראות')
    : (type === 'creator' ? 'עקוב' : 'עדכן אותי')

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2.5 py-1 gap-1'
    : 'text-sm px-4 py-2 gap-2'

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center rounded-xl font-medium transition-all disabled:opacity-50 ${sizeClasses} ${
        isFollowing
          ? 'bg-surface border border-border text-muted hover:border-red-500/30 hover:text-red-400'
          : 'bg-primary hover:bg-primary/90 text-white'
      }`}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      {label}
    </button>
  )
}
