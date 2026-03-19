'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User, Settings, LogOut, LayoutDashboard } from 'lucide-react'

export default function HeaderNav() {
  const [user, setUser] = useState<{ username: string; avatar_url: string | null } | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single()
      if (data) setUser(data)
    }
    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single()
        if (data) setUser(data)
      } else { setUser(null) }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setOpen(false)
    window.location.href = '/'
  }

  if (!user) {
    return (
      <nav className="flex items-center gap-3">
        <Link href="/login" className="text-sm text-muted hover:text-text-main transition-colors">Sign in</Link>
        <Link href="/login" className="text-sm px-4 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">Studio &rarr;</Link>
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-3" ref={menuRef}>
      <Link href="/studio" className="text-sm px-4 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">Studio &rarr;</Link>
      <button onClick={() => setOpen(o => !o)} className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-border hover:border-primary/50 transition-colors flex-shrink-0 bg-primary/20 flex items-center justify-center">
        {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-primary">{user.username[0]?.toUpperCase()}</span>}
      </button>
      {open && (
        <div className="absolute top-14 left-4 right-4 sm:left-auto sm:right-4 sm:w-48 bg-surface border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-text-main truncate">@{user.username}</p>
          </div>
          <div className="py-1">
            <Link href={'/creator/' + user.username} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-main hover:bg-white/5 transition-colors">
              <User size={14} className="text-muted" /> My Profile
            </Link>
            <Link href="/studio" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-main hover:bg-white/5 transition-colors">
              <LayoutDashboard size={14} className="text-muted" /> Studio
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-main hover:bg-white/5 transition-colors">
              <Settings size={14} className="text-muted" /> Settings
            </Link>
            <div className="h-px bg-border mx-3 my-1" />
            <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/5 transition-colors">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
