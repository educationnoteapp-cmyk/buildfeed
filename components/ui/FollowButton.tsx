'use client'

import { useState, useEffect } from 'react'
import { UserPlus, UserCheck, Bell, BellOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FollowButtonProps {
  targetId: string
  type: 'creator' | 'product'
  size?: 'sm' | 'md'
}

export default function FollowButton({ targetId, type, size = 'md' }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (!session) { setLoading(false); return }

      const table = type === 'creator' ? 'follows_creators' : 'follows_products'
      const column = type === 'creator' ? 'following_id' : 'product_id'

      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('follower_id', session.user.id)
        .eq(column, targetId)
        .single()

      setIsFollowing(!!data)
      setLoading(false)
    }
    init()
  }, [targetId, type, supabase])

  const toggle = async () => {
    if (!session) {
      window.location.href = '/login'
      return
    }

    setLoading(true)
    const table = type === 'creator' ? 'follows_creators' : 'follows_products'
    const column = type === 'creator' ? 'following_id' : 'product_id'

    if (isFollowing) {
      await supabase
        .from(table)
        .delete()
        .eq('follower_id', session.user.id)
        .eq(column, targetId)
      setIsFollowing(false)
    } else {
      await supabase
        .from(table)
        .insert({ follower_id: session.user.id, [column]: targetId })
      setIsFollowing(true)
    }
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
