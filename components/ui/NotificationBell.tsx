'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, AlertTriangle, UserX, EyeOff, Eye, UserPlus, MessageCircle, TrendingUp, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  post_id: string | null
  is_read: boolean
  created_at: string
}

const ICONS: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  suspension: UserX,
  post_hidden: EyeOff,
  post_restored: Eye,
  new_follower: UserPlus,
  new_comment: MessageCircle,
  post_trending: TrendingUp,
  system: Info,
}

const COLORS: Record<string, string> = {
  warning: 'text-amber-400',
  suspension: 'text-red-400',
  post_hidden: 'text-red-400',
  post_restored: 'text-green-400',
  new_follower: 'text-primary',
  new_comment: 'text-blue-400',
  post_trending: 'text-green-400',
  system: 'text-muted',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}ד׳`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}ש׳`
  return `${Math.floor(hours / 24)}י׳`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (!session) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setNotifications(data)
        setUnread(data.filter(n => !n.is_read).length)
      }

      // Realtime subscription
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, payload => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          setUnread(prev => prev + 1)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [supabase])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markAllRead = async () => {
    if (!session) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  if (!session) return null

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:text-text-main hover:bg-surface transition-colors"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-surface border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-text-main">התראות</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:text-secondary transition-colors">
                  סמן הכל כנקרא
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted hover:text-text-main">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-muted">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">אין התראות עדיין</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = ICONS[n.type] ?? Info
                const color = COLORS[n.type] ?? 'text-muted'
                return (
                  <div
                    key={n.id}
                    onClick={() => { markRead(n.id); if (n.post_id) window.location.href = `/post/${n.post_id}` }}
                    className={'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-border/50 ' + (!n.is_read ? 'bg-primary/5' : '')}
                  >
                    <div className={'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ' + (!n.is_read ? 'bg-primary/10' : 'bg-white/5')}>
                      <Icon size={14} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-main leading-snug">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-muted">{timeAgo(n.created_at)}</span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
