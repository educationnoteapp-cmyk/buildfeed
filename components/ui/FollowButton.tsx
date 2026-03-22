'use client'

import { useState } from 'react'
import { UserPlus, UserCheck, Bell, BellOff } from 'lucide-react'

interface FollowButtonProps {
  targetId: string
  type: 'creator' | 'product'
  size?: 'sm' | 'md'
  initialIsFollowing?: boolean
}

export default function FollowButton({ targetId, type, size = 'md', initialIsFollowing = false }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const res = await fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: targetId, type }),
    })
    if (res.status === 401) { window.location.href = '/login'; return }
    const data = await res.json()
    if (typeof data.following === 'boolean') setIsFollowing(data.following)
    setLoading(false)
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
