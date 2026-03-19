'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Plus, Bookmark, User } from 'lucide-react'

export default function BottomNav({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const pathname = usePathname()

  const items = [
    { href: '/', icon: Home, label: 'פיד' },
    { href: '/search', icon: Search, label: 'חיפוש' },
    { href: isLoggedIn ? '/studio/new' : '/login', icon: Plus, label: 'צור', isCreate: true },
    { href: '/saved', icon: Bookmark, label: 'שמור' },
    { href: isLoggedIn ? '/studio' : '/login', icon: User, label: 'פרופיל' },
  ]

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 flex items-center pb-safe">
      {items.map(({ href, icon: Icon, label, isCreate }) => {
        const isActive = pathname === href
        return (
          <Link key={href} href={href} className="flex-1 flex flex-col items-center py-2 gap-0.5">
            {isCreate ? (
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center mb-0.5">
                <Icon size={18} className="text-white" />
              </div>
            ) : (
              <Icon size={20} className={isActive ? 'text-primary' : 'text-muted'} />
            )}
            <span className={`text-[10px] ${isCreate ? 'text-primary' : isActive ? 'text-primary' : 'text-muted'}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
