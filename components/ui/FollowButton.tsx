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
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const init = async () => {
      try {
        // getUser() עובד בצד הלקוח — getSession() תקועה
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        setUserId(user.id)

        const table = type === 'creator' ? 'follows_creators' : 'follows_products'
        const column = type === 'creator' ? 'following_id' : 'product_id'

        const { data } = await supabase
          .from(table)
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq(column, targetId)
          .maybeSingle()

        setIsFollowing(!!data)
      } catch {
        // שגיאה שקטה — הכפתור יוצג כ"עקוב"
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
    const supabase = createClient()
    setLoading(true)

    const table = type === 'creator' ? 'follows_creators' : 'follows_products'
    const column = type === 'creator' ? 'following_id' : 'product_id'

    try {
      if (isFollowing) {
        await supabase.from(table).delete()
          .eq('follower_id', userId)
          .eq(column, targetId)
        setIsFollowing(false)
      } else {
        await supabase.from(table).insert({
          follower_id: userId,
          [column]: targetId,
        })
        setIsFollowing(true)
      }
    } catch {
      // שגיאה שקטה
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
