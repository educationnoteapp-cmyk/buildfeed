import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BuildFeed — Discovery for Builders',
  description: 'The Discovery Layer for B2B DevTools. Smart Audio-Slides demos by developers, for developers.',
}

import BottomNav from '@/components/ui/BottomNav'
import HeaderNav from '@/components/ui/HeaderNav'
import Logo from '@/components/ui/Logo'
import LandingHide from '@/components/ui/LandingHide'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <LandingHide>
          <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <Logo size={28} />
                <span className="text-lg font-bold text-text-main tracking-tight">
                  Build<span className="text-primary">Feed</span>
                </span>
                <span className="text-xs text-muted bg-surface border border-border px-1.5 py-0.5 rounded-md">beta</span>
              </a>
              <HeaderNav />
            </div>
          </header>
        </LandingHide>
        <main>{children}</main>
        <LandingHide>
          <BottomNav />
        </LandingHide>
      </body>
    </html>
  )
}
